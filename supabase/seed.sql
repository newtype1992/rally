insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'authenticated',
    'authenticated',
    'avery.local@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Avery"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'authenticated',
    'authenticated',
    'blair.local@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Blair"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, email, display_name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'avery.local@example.test', 'Avery'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'blair.local@example.test', 'Blair')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name;

-- Clear the fixed habit fixtures before rebuilding the streak showcase. This
-- keeps repeated seed runs deterministic without touching user-created rows.
delete from public.habit_completions
where habit_id in (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000004'
);

delete from public.habits
where id in (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000004'
);

insert into public.habits (id, user_id, name, weekly_target, status, created_at, archived_at)
values
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Starting streaks', 3, 'active', current_date - interval '120 days', null),
  ('20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Three days and weeks', 7, 'active', current_date - interval '120 days', null),
  ('30000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Thirty day streak', 7, 'active', current_date - interval '120 days', null),
  ('40000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Ninety day streak', 7, 'active', current_date - interval '120 days', null);

-- Default tier: one isolated completion and one separate two-day run.
insert into public.habit_completions (habit_id, user_id, completion_date)
values
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', current_date - 18),
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', current_date - 10),
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', current_date - 9);

-- The same habit contains two separate 3-day runs and two separate 7-day runs.
insert into public.habit_completions (habit_id, user_id, completion_date)
select
  '20000000-0000-4000-8000-000000000002',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  run_date::date
from (
  select generate_series(current_date - 80, current_date - 78, interval '1 day') as run_date
  union all
  select generate_series(current_date - 68, current_date - 66, interval '1 day')
  union all
  select generate_series(current_date - 54, current_date - 48, interval '1 day')
  union all
  select generate_series(current_date - 36, current_date - 30, interval '1 day')
) streak_runs;

-- Exact 30-day and 90-day runs exercise the two highest tier boundaries.
insert into public.habit_completions (habit_id, user_id, completion_date)
select
  '30000000-0000-4000-8000-000000000003',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  run_date::date
from generate_series(current_date - 45, current_date - 16, interval '1 day') run_date;

insert into public.habit_completions (habit_id, user_id, completion_date)
select
  '40000000-0000-4000-8000-000000000004',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  run_date::date
from generate_series(current_date - 89, current_date, interval '1 day') run_date;
