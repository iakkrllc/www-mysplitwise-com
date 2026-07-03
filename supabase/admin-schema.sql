-- mysplitwise internal admin backend schema
-- Run this once in Supabase SQL Editor.

create type department as enum ('owner', 'it', 'support', 'legal', 'finance', 'audit');

create table staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  department department not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);
alter table staff_members enable row level security;
-- No public policies: all reads/writes go through server-side API routes using the service role key.

create table staff_permission_overrides (
  staff_user_id uuid not null references staff_members(user_id) on delete cascade,
  permission_key text not null,
  granted boolean not null,
  primary key (staff_user_id, permission_key)
);
alter table staff_permission_overrides enable row level security;

create table activity_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table activity_log enable row level security;
create index activity_log_created_at_idx on activity_log (created_at desc);

-- Auto-log every signup
create or replace function log_user_signup()
returns trigger as $$
begin
  insert into activity_log (user_id, event_type, description)
  values (new.id, 'signup', 'Account created');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function log_user_signup();

-- Auto-log every new login session
create or replace function log_user_login()
returns trigger as $$
begin
  insert into activity_log (user_id, event_type, description)
  values (new.user_id, 'login', 'Signed in');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute function log_user_login();

-- Note: explicit "logout" events are logged by the app itself when a user clicks
-- Sign Out (not via a DB trigger) — Supabase doesn't cleanly distinguish an
-- explicit sign-out from routine expired-session cleanup at the database level.

-- Make yourself the owner (replace the email with whatever address you used
-- to sign up on mysplitwise — check Supabase Dashboard > Authentication > Users
-- if you're not sure which one it is):
insert into staff_members (user_id, name, email, department, status)
select id, coalesce(raw_user_meta_data->>'name', email, phone), coalesce(email, phone, ''), 'owner', 'active'
from auth.users
where email = 'YOUR_LOGIN_EMAIL_HERE'
on conflict (user_id) do update set department = 'owner', status = 'active';
