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

-- Note: login/signup/logout events are logged by the app itself (via
-- /api/log-activity) right after a successful auth call — NOT via database
-- triggers on auth.users/auth.sessions. Triggers on Supabase's internal auth
-- tables run inside the same transaction as the login/signup itself, so if
-- the trigger fails for any reason, it fails the login/signup too. Logging
-- from the application after auth succeeds avoids that risk entirely.

-- Make yourself the owner (replace the email with whatever address you used
-- to sign up on mysplitwise — check Supabase Dashboard > Authentication > Users
-- if you're not sure which one it is):
insert into staff_members (user_id, name, email, department, status)
select id, coalesce(raw_user_meta_data->>'name', email, phone), coalesce(email, phone, ''), 'owner', 'active'
from auth.users
where email = 'YOUR_LOGIN_EMAIL_HERE'
on conflict (user_id) do update set department = 'owner', status = 'active';
