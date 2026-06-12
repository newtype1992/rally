-- Local Rally QA seed data.
-- Uses fixed fake users, habits, invites, check-ins, notifications, and tokens.

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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    'authenticated',
    'authenticated',
    'casey.local@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Casey"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    'authenticated',
    'authenticated',
    'devon.local@example.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Devon"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, initials, notification_permission_status, onboarding_completed_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Avery', 'A', 'granted', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Blair', 'B', 'granted', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Casey', 'C', 'denied', now()),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'Devon', 'D', 'not_requested', now())
on conflict (id) do update
set display_name = excluded.display_name,
    initials = excluded.initials,
    notification_permission_status = excluded.notification_permission_status,
    onboarding_completed_at = excluded.onboarding_completed_at;

insert into public.habits (id, owner_user_id, name, status, privacy, max_members)
values
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Morning walk', 'active', 'private', 5),
  ('20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Strength training', 'active', 'shared', 5),
  ('30000000-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Reading sprint', 'active', 'private', 5),
  ('40000000-0000-4000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Stretch group', 'active', 'shared', 2)
on conflict (id) do nothing;

insert into public.habit_memberships (
  id,
  habit_id,
  user_id,
  role,
  membership_status,
  weekly_target,
  pending_weekly_target,
  pending_target_effective_week_start,
  joined_at,
  left_at
)
values
  ('11000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', 3, null, null, now(), null),
  ('21000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', 4, 5, '2026-06-14', now(), null),
  ('22000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'member', 'active', 3, null, null, now(), null),
  ('23000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000002', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'member', 'left', 2, null, null, now() - interval '14 days', now() - interval '7 days'),
  ('31000000-0000-4000-8000-000000000031', '30000000-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'owner', 'active', 5, null, null, now(), null),
  ('41000000-0000-4000-8000-000000000041', '40000000-0000-4000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'owner', 'active', 2, null, null, now(), null),
  ('42000000-0000-4000-8000-000000000042', '40000000-0000-4000-8000-000000000004', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'member', 'active', 2, null, null, now(), null)
on conflict (id) do nothing;

insert into public.membership_schedules (
  id,
  habit_membership_id,
  planned_weekdays,
  pending_planned_weekdays,
  pending_schedule_effective_week_start,
  timezone
)
values
  ('11100000-0000-4000-8000-000000000111', '11000000-0000-4000-8000-000000000011', array[1,3,5]::smallint[], null, null, 'America/Toronto'),
  ('21100000-0000-4000-8000-000000000211', '21000000-0000-4000-8000-000000000021', array[0,2,4,6]::smallint[], array[0,1,2,4,6]::smallint[], '2026-06-14', 'America/Toronto'),
  ('22100000-0000-4000-8000-000000000221', '22000000-0000-4000-8000-000000000022', array[1,3,5]::smallint[], null, null, 'America/Toronto'),
  ('23100000-0000-4000-8000-000000000231', '23000000-0000-4000-8000-000000000023', array[2,4]::smallint[], null, null, 'America/Toronto'),
  ('31100000-0000-4000-8000-000000000311', '31000000-0000-4000-8000-000000000031', array[1,2,3,4,5]::smallint[], null, null, 'America/Toronto'),
  ('41100000-0000-4000-8000-000000000411', '41000000-0000-4000-8000-000000000041', array[1,4]::smallint[], null, null, 'America/Toronto'),
  ('42100000-0000-4000-8000-000000000421', '42000000-0000-4000-8000-000000000042', array[1,4]::smallint[], null, null, 'America/Toronto')
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
  ('11110000-0000-4000-8000-000000001111', '11000000-0000-4000-8000-000000000011', '2026-06-07', 3, array[1,3,5]::smallint[], 'America/Toronto', 'seed'),
  ('21110000-0000-4000-8000-000000002111', '21000000-0000-4000-8000-000000000021', '2026-06-07', 4, array[0,2,4,6]::smallint[], 'America/Toronto', 'seed'),
  ('22110000-0000-4000-8000-000000002211', '22000000-0000-4000-8000-000000000022', '2026-06-07', 3, array[1,3,5]::smallint[], 'America/Toronto', 'seed'),
  ('31110000-0000-4000-8000-000000003111', '31000000-0000-4000-8000-000000000031', '2026-06-07', 5, array[1,2,3,4,5]::smallint[], 'America/Toronto', 'seed'),
  ('41110000-0000-4000-8000-000000004111', '41000000-0000-4000-8000-000000000041', '2026-06-07', 2, array[1,4]::smallint[], 'America/Toronto', 'seed'),
  ('42110000-0000-4000-8000-000000004211', '42000000-0000-4000-8000-000000000042', '2026-06-07', 2, array[1,4]::smallint[], 'America/Toronto', 'seed')
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
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-06-08', '2026-06-07', 'America/Toronto', 'completed', 'user_action', 'seed-private-a-1', null),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000021', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2026-06-09', '2026-06-07', 'America/Toronto', 'completed', 'user_action', 'seed-shared-a-1', null),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000022', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '2026-06-09', '2026-06-07', 'America/Toronto', 'completed', 'user_action', 'seed-shared-b-1', null),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000022', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '2026-06-11', '2026-06-07', 'America/Toronto', 'missed', 'system_day_end', null, now()),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000031', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '2026-06-09', '2026-06-07', 'America/Toronto', 'completed', 'user_action', 'seed-private-c-1', null)
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
  expires_at,
  revoked_at,
  closed_at,
  created_at
)
values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '21000000-0000-4000-8000-000000000021', 'VALIDA1', encode(extensions.digest('valid-invite-token', 'sha256'), 'hex'), 'active', 3, 1, now() + interval '14 days', null, null, now()),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '21000000-0000-4000-8000-000000000021', 'EXPIRE1', encode(extensions.digest('expired-invite-token', 'sha256'), 'hex'), 'active', 3, 0, now() - interval '1 day', null, null, now() - interval '20 days'),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '21000000-0000-4000-8000-000000000021', 'REVOKE1', encode(extensions.digest('revoked-invite-token', 'sha256'), 'hex'), 'revoked', 3, 0, now() + interval '14 days', now(), null, now()),
  ('60000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '41000000-0000-4000-8000-000000000041', 'FULL001', encode(extensions.digest('full-invite-token', 'sha256'), 'hex'), 'active', 1, 1, now() + interval '14 days', null, null, now())
on conflict (id) do nothing;

insert into public.reminder_preferences (
  id,
  habit_membership_id,
  reminders_enabled,
  nudge_notifications_enabled,
  missed_notifications_enabled,
  scheduled_reminder_time,
  notification_permission_status,
  timezone
)
values
  ('70000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', true, true, true, '18:30', 'granted', 'America/Toronto'),
  ('70000000-0000-4000-8000-000000000021', '21000000-0000-4000-8000-000000000021', true, true, true, '07:30', 'granted', 'America/Toronto'),
  ('70000000-0000-4000-8000-000000000022', '22000000-0000-4000-8000-000000000022', true, true, true, '08:00', 'granted', 'America/Toronto'),
  ('70000000-0000-4000-8000-000000000031', '31000000-0000-4000-8000-000000000031', false, false, false, null, 'denied', 'America/Toronto')
on conflict (id) do nothing;

insert into public.device_push_tokens (id, user_id, expo_push_token, platform, enabled)
values
  ('80000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ExponentPushToken[local-avery]', 'ios', true),
  ('80000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'ExponentPushToken[local-blair]', 'android', true)
on conflict (id) do nothing;

insert into public.nudges (
  id,
  habit_id,
  sender_user_id,
  recipient_user_id,
  reason,
  message_variant,
  created_local_date,
  delivery_status
)
values
  ('90000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'missed', 'small_reset', '2026-06-11', 'sent')
on conflict (id) do nothing;

insert into public.reactions (
  id,
  habit_id,
  check_in_id,
  sender_user_id,
  reaction_type
)
values
  ('91000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'cheer')
on conflict (id) do nothing;

insert into public.notifications (
  id,
  recipient_user_id,
  type,
  channel,
  delivery_status,
  target_habit_id,
  target_check_in_id,
  target_nudge_id,
  target_reaction_id,
  title,
  body
)
values
  ('92000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'nudge', 'push', 'queued', '20000000-0000-4000-8000-000000000002', null, '90000000-0000-4000-8000-000000000001', null, 'Avery nudged you', 'Small reset. Next one counts.'),
  ('92000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'reaction', 'in_app', 'in_app_only', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', null, '91000000-0000-4000-8000-000000000001', 'Avery reacted', 'Nice check-in.')
on conflict (id) do nothing;
