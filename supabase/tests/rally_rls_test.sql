BEGIN;
SELECT plan(11);

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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'rls-c@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"RLS Casey"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, initials)
values
  ('11111111-1111-4111-8111-111111111111', 'RLS Avery', 'RA'),
  ('22222222-2222-4222-8222-222222222222', 'RLS Blair', 'RB'),
  ('33333333-3333-4333-8333-333333333333', 'RLS Casey', 'RC')
on conflict (id) do update
set display_name = excluded.display_name,
    initials = excluded.initials;

insert into public.habits (id, owner_user_id, name, privacy, status, max_members)
values
  ('01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'RLS private A', 'private', 'active', 5),
  ('02000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'RLS shared AB', 'shared', 'active', 5),
  ('03000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'RLS private C', 'private', 'active', 5)
on conflict (id) do nothing;

insert into public.habit_memberships (
  id,
  habit_id,
  user_id,
  role,
  membership_status,
  weekly_target,
  joined_at
)
values
  ('01100000-0000-4000-8000-000000000011', '01000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'owner', 'active', 3, now()),
  ('02100000-0000-4000-8000-000000000021', '02000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'owner', 'active', 3, now()),
  ('02200000-0000-4000-8000-000000000022', '02000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'member', 'active', 3, now()),
  ('03100000-0000-4000-8000-000000000031', '03000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'owner', 'active', 3, now())
on conflict (id) do nothing;

insert into public.membership_schedules (id, habit_membership_id, planned_weekdays, timezone)
values
  ('01110000-0000-4000-8000-000000000111', '01100000-0000-4000-8000-000000000011', array[1,3,5]::smallint[], 'UTC'),
  ('02110000-0000-4000-8000-000000000211', '02100000-0000-4000-8000-000000000021', array[1,3,5]::smallint[], 'UTC'),
  ('02210000-0000-4000-8000-000000000221', '02200000-0000-4000-8000-000000000022', array[1,3,5]::smallint[], 'UTC'),
  ('03110000-0000-4000-8000-000000000311', '03100000-0000-4000-8000-000000000031', array[1,3,5]::smallint[], 'UTC')
on conflict (id) do nothing;

insert into public.membership_target_history (
  id,
  habit_membership_id,
  effective_week_start,
  weekly_target,
  planned_weekdays,
  timezone,
  source
)
values
  ('01111000-0000-4000-8000-000000001111', '01100000-0000-4000-8000-000000000011', private.local_week_start(current_date), 3, array[1,3,5]::smallint[], 'UTC', 'test'),
  ('02111000-0000-4000-8000-000000002111', '02100000-0000-4000-8000-000000000021', private.local_week_start(current_date), 3, array[1,3,5]::smallint[], 'UTC', 'test'),
  ('02211000-0000-4000-8000-000000002211', '02200000-0000-4000-8000-000000000022', private.local_week_start(current_date), 3, array[1,3,5]::smallint[], 'UTC', 'test'),
  ('03111000-0000-4000-8000-000000003111', '03100000-0000-4000-8000-000000000031', private.local_week_start(current_date), 3, array[1,3,5]::smallint[], 'UTC', 'test')
on conflict (id) do nothing;

insert into public.check_ins (
  id,
  habit_id,
  habit_membership_id,
  user_id,
  local_date,
  local_week_start,
  local_timezone,
  status,
  source,
  client_request_id,
  locked_at
)
values
  ('04000000-0000-4000-8000-000000000001', '02000000-0000-4000-8000-000000000002', '02200000-0000-4000-8000-000000000022', '22222222-2222-4222-8222-222222222222', current_date - 1, private.local_week_start(current_date - 1), 'UTC', 'completed', 'user_action', 'rls-peer-checkin', null),
  ('04000000-0000-4000-8000-000000000002', '03000000-0000-4000-8000-000000000003', '03100000-0000-4000-8000-000000000031', '33333333-3333-4333-8333-333333333333', current_date - 1, private.local_week_start(current_date - 1), 'UTC', 'completed', 'user_action', 'rls-unrelated-checkin', null),
  ('04000000-0000-4000-8000-000000000003', '01000000-0000-4000-8000-000000000001', '01100000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', current_date - 2, private.local_week_start(current_date - 2), 'UTC', 'missed', 'system_day_end', null, now())
on conflict (id) do nothing;

insert into public.invites (
  id,
  habit_id,
  created_by_user_id,
  created_by_membership_id,
  public_code,
  token_hash,
  status,
  max_acceptances,
  accepted_count,
  expires_at
)
values (
  '05000000-0000-4000-8000-000000000001',
  '02000000-0000-4000-8000-000000000002',
  '11111111-1111-4111-8111-111111111111',
  '02100000-0000-4000-8000-000000000021',
  'TSTCODE',
  encode(extensions.digest('test-invite-token', 'sha256'), 'hex'),
  'active',
  3,
  0,
  now() + interval '14 days'
)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

SELECT is(
  (select count(*)::int from public.habits where id = '01000000-0000-4000-8000-000000000001'),
  1,
  'owner can read own private habit'
);

SELECT is(
  (select count(*)::int from public.habits where id = '03000000-0000-4000-8000-000000000003'),
  0,
  'user cannot read another users private habit'
);

SELECT is(
  (select count(*)::int from public.check_ins where id = '04000000-0000-4000-8000-000000000001'),
  1,
  'shared member can read same-habit peer check-in'
);

SELECT is(
  (select count(*)::int from public.check_ins where id = '04000000-0000-4000-8000-000000000002'),
  0,
  'shared member cannot read unrelated habit check-in'
);

SELECT throws_ok(
  $$ insert into public.check_ins (
    habit_id,
    habit_membership_id,
    user_id,
    local_date,
    local_week_start,
    local_timezone,
    status,
    source,
    client_request_id
  ) values (
    '01000000-0000-4000-8000-000000000001',
    '01100000-0000-4000-8000-000000000011',
    '11111111-1111-4111-8111-111111111111',
    current_date,
    current_date - extract(dow from current_date)::int,
    'UTC',
    'completed',
    'user_action',
    'blocked-direct-insert'
  ) $$,
  '42501',
  null,
  'direct check-in insert is blocked'
);

SELECT is(
  public.record_checkin(jsonb_build_object(
    'client_request_id', 'rls-idempotency-1',
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'habit_membership_id', '01100000-0000-4000-8000-000000000011',
    'local_date', current_date::text,
    'local_week_start', (current_date - extract(dow from current_date)::int)::text,
    'local_timezone', 'UTC',
    'status', 'completed'
  )) #>> '{data,idempotent_replay}',
  'false',
  'record_checkin creates the first check-in'
);

SELECT is(
  public.record_checkin(jsonb_build_object(
    'client_request_id', 'rls-idempotency-1',
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'habit_membership_id', '01100000-0000-4000-8000-000000000011',
    'local_date', current_date::text,
    'local_week_start', (current_date - extract(dow from current_date)::int)::text,
    'local_timezone', 'UTC',
    'status', 'completed'
  )) #>> '{data,idempotent_replay}',
  'true',
  'record_checkin is idempotent by client_request_id'
);

SELECT is(
  public.record_checkin(jsonb_build_object(
    'client_request_id', 'rls-locked-missed',
    'habit_id', '01000000-0000-4000-8000-000000000001',
    'habit_membership_id', '01100000-0000-4000-8000-000000000011',
    'local_date', (current_date - 2)::text,
    'local_week_start', ((current_date - 2) - extract(dow from (current_date - 2))::int)::text,
    'local_timezone', 'UTC',
    'status', 'completed'
  )) #>> '{error,code}',
  'checkin_locked_missed',
  'missed check-in cannot be changed to completed'
);

SELECT throws_ok(
  $$ select public.apply_pending_targets('{}'::jsonb) $$,
  '42501',
  null,
  'authenticated role cannot execute service-only job RPC'
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

SELECT is(
  public.get_invite_preview(jsonb_build_object('invite_token_or_code', 'TSTCODE')) #>> '{data,invite_resolution}',
  'valid',
  'anon can execute limited invite preview'
);

SELECT * FROM finish();
ROLLBACK;
