-- mysplitwise shared-data backend: expenses, friends, groups, recurring bills.
-- Run this once in Supabase SQL Editor, after admin-schema.sql.
--
-- Same conventions as admin-schema.sql: RLS enabled on every table, NO
-- client-facing policies — all reads/writes go through server-side API
-- routes using the service role key.

-- One row per person: real accounts (id = their real auth.users.id) AND
-- not-yet-registered "placeholder" contacts (is_placeholder = true, a
-- synthetic id) added by someone else before that email ever signs up.
-- This exists because client/server code can't query Supabase's internal
-- auth.users table directly for arbitrary email lookups.
create table profiles (
  id uuid primary key,
  email text not null,
  name text not null,
  avatar_color text,
  avatar_url text,
  venmo text,
  paypal text,
  cashapp text,
  is_placeholder boolean not null default false,
  base_currency text not null default 'USD',
  notifications_read_at timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create unique index profiles_email_lower_idx on profiles (lower(email));
create index profiles_placeholder_idx on profiles (is_placeholder) where is_placeholder;

-- One row per connected pair. Instant-connect model — no pending/accept
-- state for two real accounts. user_a is always the smaller uuid so
-- (user_a, user_b) can be uniquely constrained regardless of who added whom.
create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  constraint friendships_ordered check (user_a < user_b),
  unique (user_a, user_b)
);
alter table friendships enable row level security;
create index friendships_user_b_idx on friendships (user_b);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('trip','home','couple','other')),
  simplify_debts boolean not null default true,
  monthly_budget numeric(12,2),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
alter table groups enable row level security;

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;
create index group_members_user_idx on group_members (user_id);

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  category text not null,
  group_id uuid references groups(id) on delete set null,
  payer_id uuid not null references profiles(id),
  created_by uuid not null references profiles(id),
  frequency text not null check (frequency in ('weekly','monthly','yearly')),
  start_date date not null,
  next_due date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table recurring_expenses enable row level security;
create index recurring_expenses_next_due_idx on recurring_expenses (next_due) where active;

create table recurring_expense_shares (
  recurring_id uuid not null references recurring_expenses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  paid numeric(12,2) not null default 0,
  owed numeric(12,2) not null default 0,
  primary key (recurring_id, user_id)
);
alter table recurring_expense_shares enable row level security;

create table expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  category text not null,
  date date not null,
  group_id uuid references groups(id) on delete set null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  is_settlement boolean not null default false,
  notes text,
  receipt_url text,
  recurring_id uuid references recurring_expenses(id) on delete set null,
  tax numeric(12,2),
  tip numeric(12,2),
  payment_method text
);
alter table expenses enable row level security;
create index expenses_group_idx on expenses (group_id);
create index expenses_date_idx on expenses (date desc);
create index expenses_created_by_idx on expenses (created_by);

create table expense_shares (
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  paid numeric(12,2) not null default 0,
  owed numeric(12,2) not null default 0,
  primary key (expense_id, user_id)
);
alter table expense_shares enable row level security;
create index expense_shares_user_idx on expense_shares (user_id);

create table line_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  sort_order int not null default 0
);
alter table line_items enable row level security;
create index line_items_expense_idx on line_items (expense_id);

create table line_item_participants (
  line_item_id uuid not null references line_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (line_item_id, user_id)
);
alter table line_item_participants enable row level security;

create table expense_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references profiles(id),
  text text not null,
  created_at timestamptz not null default now()
);
alter table expense_comments enable row level security;
create index expense_comments_expense_idx on expense_comments (expense_id);

-- One-time backfill: create a profile row for every existing auth.users
-- account so email lookups work immediately for pre-existing users. Safe to
-- re-run.
insert into profiles (id, email, name, base_currency, onboarded)
select id,
       coalesce(email, phone, ''),
       coalesce(raw_user_meta_data->>'name', email, phone, 'User'),
       'USD',
       true
from auth.users
on conflict (id) do nothing;

-- Called explicitly by the app right after a successful sign-up/sign-in
-- (never as a trigger on auth.users/auth.sessions — a trigger there runs
-- inside the login/signup transaction itself, so a failing trigger would
-- fail the login/signup too; see the same note in admin-schema.sql). This
-- transactionally rewrites every reference from a placeholder profile
-- (someone added you as a friend by email before you signed up) onto your
-- real account the moment you actually sign up with that email.
create or replace function claim_placeholder_profile(p_real_id uuid, p_email text)
returns void as $$
declare
  v_placeholder_id uuid;
begin
  select id into v_placeholder_id
  from profiles
  where is_placeholder and lower(email) = lower(p_email)
  limit 1;

  if v_placeholder_id is null or v_placeholder_id = p_real_id then
    return;
  end if;

  update expense_shares set user_id = p_real_id where user_id = v_placeholder_id;
  update line_item_participants set user_id = p_real_id where user_id = v_placeholder_id;
  update expense_comments set user_id = p_real_id where user_id = v_placeholder_id;
  update expenses set created_by = p_real_id where created_by = v_placeholder_id;
  update recurring_expense_shares set user_id = p_real_id where user_id = v_placeholder_id;
  update recurring_expenses set payer_id = p_real_id where payer_id = v_placeholder_id;
  update recurring_expenses set created_by = p_real_id where created_by = v_placeholder_id;
  update groups set created_by = p_real_id where created_by = v_placeholder_id;

  update group_members set user_id = p_real_id
    where user_id = v_placeholder_id
      and not exists (
        select 1 from group_members gm2
        where gm2.group_id = group_members.group_id and gm2.user_id = p_real_id
      );
  delete from group_members where user_id = v_placeholder_id;

  insert into friendships (user_a, user_b, created_by)
  select least(p_real_id, case when user_a = v_placeholder_id then user_b else user_a end),
         greatest(p_real_id, case when user_a = v_placeholder_id then user_b else user_a end),
         created_by
  from friendships
  where user_a = v_placeholder_id or user_b = v_placeholder_id
  on conflict (user_a, user_b) do nothing;
  delete from friendships where user_a = v_placeholder_id or user_b = v_placeholder_id;

  delete from profiles where id = v_placeholder_id;
end;
$$ language plpgsql security definer;

-- Feature: settlement dispute audit trail. mysplitwise can't verify real
-- money moved during a Settle Up (it only deep-links to Venmo/PayPal/Cash
-- App, never processes payment itself) — this lets the other party flag a
-- settlement they say never happened, for visibility only. Run once.
alter table expenses
  add column disputed boolean not null default false,
  add column dispute_reason text,
  add column disputed_by uuid references profiles(id),
  add column disputed_at timestamptz;

-- Feature: a short, stable, random-looking reference ID per account (e.g.
-- MSW-A3F91C2D) for customer support to look someone up by instead of
-- relying on name/email/phone over a call. Derived from the profile's own
-- id (already globally unique), so every existing and future row gets one
-- automatically with no application code changes needed. Run once.
alter table profiles
  add column support_id text generated always as (
    'MSW-' || upper(substr(replace(id::text, '-', ''), 1, 8))
  ) stored;
create unique index profiles_support_id_idx on profiles (support_id);
