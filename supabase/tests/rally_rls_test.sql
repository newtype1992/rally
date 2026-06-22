BEGIN;
SELECT plan(19);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
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
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'rls-a@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"RLS Avery"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'rls-b@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"RLS Blair"}'::jsonb,
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
  ('11111111-1111-4111-8111-111111111111', 'rls-a@example.test', 'RLS Avery'),
  ('22222222-2222-4222-8222-222222222222', 'rls-b@example.test', 'RLS Blair')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name;

insert into public.habits (id, user_id, name, weekly_target, status, created_at)
values
  ('01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'RLS Reading', 4, 'active', current_date - interval '20 days'),
  ('02000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'RLS Blair habit', 3, 'active', current_date - interval '10 days')
on conflict (id) do nothing;

insert into public.habit_completions (id, habit_id, user_id, completion_date)
values
  ('04000000-0000-4000-8000-000000000001', '01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 3),
  ('04000000-0000-4000-8000-000000000002', '01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 2),
  ('04000000-0000-4000-8000-000000000003', '02000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', current_date - 1)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

SELECT is(
  (select count(*)::int from public.habits where id = '01000000-0000-4000-8000-000000000001'),
  1,
  'owner can read own habit'
);

SELECT is(
  (select count(*)::int from public.habits where id = '02000000-0000-4000-8000-000000000002'),
  0,
  'user cannot read another users habit'
);

SELECT is(
  (select count(*)::int from public.habit_completions where id = '04000000-0000-4000-8000-000000000003'),
  0,
  'user cannot read another users completions'
);

SELECT throws_ok(
  $$ insert into public.habit_completions (habit_id, user_id, completion_date)
     values ('01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date) $$,
  '42501',
  null,
  'direct completion insert is blocked'
);

SELECT is(
  public.create_habit(jsonb_build_object('name', 'Writing', 'weekly_target', 2)) #>> '{data,habit,name}',
  'Writing',
  'create_habit creates an active personal habit'
);

SELECT is(
  jsonb_array_length(public.list_active_habits(jsonb_build_object(
    'today', current_date::text,
    'week_start', (current_date - extract(dow from current_date)::int)::text
  )) #> '{data,habits}'),
  2,
  'list_active_habits returns only callers active habits'
);

SELECT is(
  public.mark_habit_done_today(jsonb_build_object(
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'completion_date', current_date::text
  )) #>> '{data,habit,done_today}',
  'true',
  'mark_habit_done_today marks today done'
);

SELECT is(
  public.mark_habit_done_today(jsonb_build_object(
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'completion_date', current_date::text
  )) #>> '{error,code}',
  'completion_duplicate',
  'duplicate same-day completion is prevented'
);

SELECT is(
  public.undo_today_completion(jsonb_build_object(
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'completion_date', current_date::text
  )) #>> '{data,habit,done_today}',
  'false',
  'undo_today_completion removes today completion'
);

SELECT is(
  public.undo_today_completion(jsonb_build_object(
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'completion_date', current_date::text
  )) #>> '{error,code}',
  'completion_not_found',
  'undo missing completion returns completion_not_found'
);

SELECT is(
  public.mark_habit_done_today(jsonb_build_object(
    'habit_id', '02000000-0000-4000-8000-000000000002',
    'completion_date', current_date::text
  )) #>> '{error,code}',
  'not_found',
  'mark done rejects another users habit'
);

SELECT is(
  jsonb_array_length(public.get_weekly_progress(jsonb_build_object(
    'today', current_date::text,
    'week_start', (current_date - extract(dow from current_date)::int)::text
  )) #> '{data,habits}'),
  2,
  'weekly progress returns active caller habits'
);

SELECT is(
  (
    with response as (
      select public.get_habit_detail(jsonb_build_object(
        'habit_id', '01000000-0000-4000-8000-000000000001',
        'today', current_date::text,
        'week_start', (current_date - extract(dow from current_date)::int)::text,
        'recent_limit', 84
      )) as body
    )
    select body #>> '{data,habit,all_time_progress,total_completions}'
    from response
  ),
  '2',
  'habit detail returns all-time completion count'
);

SELECT is(
  (
    with response as (
      select public.get_habit_detail(jsonb_build_object(
        'habit_id', '01000000-0000-4000-8000-000000000001',
        'today', current_date::text,
        'week_start', (current_date - extract(dow from current_date)::int)::text,
        'recent_limit', 84
      )) as body
    )
    select jsonb_array_length(body #> '{data,habit,all_completion_dates}')
    from response
  ),
  2,
  'habit detail returns completion dates for long-term grid'
);

SELECT is(
  public.get_habit_detail(jsonb_build_object(
    'habit_id', '02000000-0000-4000-8000-000000000002',
    'today', current_date::text,
    'week_start', (current_date - extract(dow from current_date)::int)::text
  )) #>> '{error,code}',
  'not_found',
  'habit detail rejects another users habit'
);

SELECT is(
  public.archive_habit(jsonb_build_object('habit_id', '01000000-0000-4000-8000-000000000001')) #>> '{data,status}',
  'archived',
  'archive_habit archives own habit'
);

SELECT is(
  public.mark_habit_done_today(jsonb_build_object(
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'completion_date', current_date::text
  )) #>> '{error,code}',
  'habit_inactive',
  'archived habit cannot receive completions'
);

SELECT is(
  public.delete_habit(jsonb_build_object('habit_id', '01000000-0000-4000-8000-000000000001')) #>> '{data,status}',
  'deleted',
  'delete_habit soft deletes own habit'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

SELECT throws_ok(
  $$ select count(*) from public.habits $$,
  '42501',
  null,
  'anon cannot read app tables directly'
);

SELECT * FROM finish();
ROLLBACK;
