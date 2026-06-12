-- Rally backend foundation.
-- Scope: local-first Supabase implementation pass for schema, grants, RLS,
-- Phase 1 RPCs, and local QA support.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

do $$
begin
  create type public.habit_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.habit_privacy as enum ('private', 'shared');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_status as enum ('pending_setup', 'active', 'left');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_status as enum ('active', 'revoked', 'expired', 'closed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_resolution as enum ('valid', 'invalid', 'expired', 'revoked', 'already_joined', 'full', 'accepted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.check_in_status as enum ('completed', 'skipped', 'missed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.check_in_source as enum ('user_action', 'offline_retry', 'system_day_end');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_permission_status as enum ('unknown', 'not_requested', 'granted', 'denied', 'disabled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.push_platform as enum ('ios', 'android');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum ('scheduled_reminder', 'missed_habit', 'nudge', 'reaction');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_channel as enum ('push', 'in_app');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_delivery_status as enum ('queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'in_app_only');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.nudge_reason as enum ('missed', 'behind_pace');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.nudge_delivery_status as enum ('created', 'queued', 'sent', 'delivered', 'opened', 'failed', 'in_app_only');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.nudge_message_variant as enum ('you_have_time', 'small_reset', 'still_with_you', 'next_one_counts');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reaction_type as enum ('cheer', 'high_five', 'fire', 'strong');
exception when duplicate_object then null;
end $$;

create or replace function private.local_week_start(p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_date - extract(dow from p_date)::int;
$$;

create or replace function private.next_sunday(p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_date + case
    when extract(dow from p_date)::int = 0 then 7
    else 7 - extract(dow from p_date)::int
  end;
$$;

create or replace function private.current_local_date(p_timezone text)
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone p_timezone)::date;
$$;

create or replace function private.weekday_array_is_valid(p_days smallint[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(p_days) between 1 and 7
    and not exists (
      select 1
      from unnest(p_days) as d(day_value)
      where d.day_value < 0 or d.day_value > 6
    )
    and cardinality(p_days) = (
      select count(distinct d.day_value)::int
      from unnest(p_days) as d(day_value)
    );
$$;

create or replace function private.parse_weekdays(p_value jsonb)
returns smallint[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_days smallint[];
begin
  if p_value is null or jsonb_typeof(p_value) <> 'array' then
    return null;
  end if;

  select array_agg(day_value order by day_value)
  into v_days
  from (
    select value::smallint as day_value
    from jsonb_array_elements_text(p_value)
  ) parsed;

  if v_days is null or not private.weekday_array_is_valid(v_days) then
    return null;
  end if;

  return v_days;
exception when others then
  return null;
end;
$$;

create or replace function private.initials_for(p_display_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clean text := btrim(coalesce(p_display_name, ''));
  v_initials text;
begin
  if v_clean = '' then
    return 'U';
  end if;

  select upper(string_agg(left(part, 1), ''))
  into v_initials
  from (
    select part
    from regexp_split_to_table(v_clean, '\s+') as part
    where part <> ''
    limit 3
  ) parts;

  return coalesce(nullif(v_initials, ''), 'U');
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  initials text not null,
  avatar_url text null,
  notification_permission_status public.notification_permission_status not null default 'unknown',
  onboarding_completed_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_empty check (length(btrim(display_name)) > 0),
  constraint profiles_initials_length check (char_length(initials) between 1 and 3)
);

create table if not exists public.habits (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status public.habit_status not null default 'active',
  privacy public.habit_privacy not null default 'private',
  max_members smallint not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint habits_name_not_empty check (length(btrim(name)) > 0),
  constraint habits_max_members_range check (max_members between 2 and 5),
  constraint habits_archived_at_required check ((status <> 'archived') or archived_at is not null)
);

create table if not exists public.habit_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  membership_status public.membership_status not null default 'pending_setup',
  weekly_target smallint not null,
  pending_weekly_target smallint null,
  pending_target_effective_week_start date null,
  joined_at timestamptz null,
  left_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_memberships_unique_user unique (habit_id, user_id),
  constraint habit_memberships_weekly_target_range check (weekly_target between 1 and 7),
  constraint habit_memberships_pending_target_range check (pending_weekly_target is null or pending_weekly_target between 1 and 7),
  constraint habit_memberships_pending_target_sunday check (
    pending_target_effective_week_start is null
    or private.local_week_start(pending_target_effective_week_start) = pending_target_effective_week_start
  ),
  constraint habit_memberships_active_joined_at check (membership_status <> 'active' or joined_at is not null),
  constraint habit_memberships_left_left_at check (membership_status <> 'left' or left_at is not null)
);

create unique index if not exists habit_memberships_one_owner_idx
  on public.habit_memberships (habit_id)
  where role = 'owner';

create table if not exists public.membership_schedules (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_membership_id uuid not null references public.habit_memberships(id) on delete cascade,
  planned_weekdays smallint[] not null,
  pending_planned_weekdays smallint[] null,
  pending_schedule_effective_week_start date null,
  timezone text not null,
  week_start_weekday smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_schedules_unique_membership unique (habit_membership_id),
  constraint membership_schedules_planned_weekdays_valid check (private.weekday_array_is_valid(planned_weekdays)),
  constraint membership_schedules_pending_weekdays_valid check (
    pending_planned_weekdays is null or private.weekday_array_is_valid(pending_planned_weekdays)
  ),
  constraint membership_schedules_week_start_sunday check (week_start_weekday = 0),
  constraint membership_schedules_pending_sunday check (
    pending_schedule_effective_week_start is null
    or private.local_week_start(pending_schedule_effective_week_start) = pending_schedule_effective_week_start
  ),
  constraint membership_schedules_timezone_not_empty check (length(btrim(timezone)) > 0)
);

create table if not exists public.membership_target_history (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_membership_id uuid not null references public.habit_memberships(id) on delete cascade,
  effective_week_start date not null,
  weekly_target smallint not null,
  planned_weekdays smallint[] not null,
  timezone text not null,
  source text not null,
  created_at timestamptz not null default now(),
  constraint membership_target_history_unique_week unique (habit_membership_id, effective_week_start),
  constraint membership_target_history_effective_sunday check (private.local_week_start(effective_week_start) = effective_week_start),
  constraint membership_target_history_weekly_target_range check (weekly_target between 1 and 7),
  constraint membership_target_history_planned_weekdays_valid check (private.weekday_array_is_valid(planned_weekdays)),
  constraint membership_target_history_timezone_not_empty check (length(btrim(timezone)) > 0),
  constraint membership_target_history_source_not_empty check (length(btrim(source)) > 0)
);

create table if not exists public.check_ins (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  habit_membership_id uuid not null references public.habit_memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  local_week_start date not null,
  local_timezone text not null,
  status public.check_in_status not null,
  source public.check_in_source not null,
  client_request_id text null,
  recorded_at timestamptz not null default now(),
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_ins_unique_membership_date unique (habit_membership_id, local_date),
  constraint check_ins_local_week_start_sunday check (private.local_week_start(local_date) = local_week_start),
  constraint check_ins_missed_source check (status <> 'missed' or (source = 'system_day_end' and locked_at is not null)),
  constraint check_ins_user_source check (
    status = 'missed'
    or source in ('user_action', 'offline_retry')
  ),
  constraint check_ins_timezone_not_empty check (length(btrim(local_timezone)) > 0),
  constraint check_ins_client_request_not_empty check (client_request_id is null or length(btrim(client_request_id)) > 0)
);

create unique index if not exists check_ins_unique_client_request_idx
  on public.check_ins (user_id, client_request_id)
  where client_request_id is not null;

create table if not exists public.invites (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id),
  created_by_membership_id uuid not null references public.habit_memberships(id),
  public_code text not null,
  token_hash text not null,
  status public.invite_status not null default 'active',
  max_acceptances smallint not null default 4,
  accepted_count smallint not null default 0,
  last_viewed_at timestamptz null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invites_public_code_unique unique (public_code),
  constraint invites_token_hash_unique unique (token_hash),
  constraint invites_max_acceptances_range check (max_acceptances between 1 and 4),
  constraint invites_accepted_count_range check (accepted_count between 0 and max_acceptances),
  constraint invites_expiry_after_created check (expires_at > created_at),
  constraint invites_public_code_not_empty check (length(btrim(public_code)) > 0),
  constraint invites_token_hash_not_empty check (length(btrim(token_hash)) > 0),
  constraint invites_revoked_at_required check (status <> 'revoked' or revoked_at is not null),
  constraint invites_closed_at_required check (status <> 'closed' or closed_at is not null)
);

create table if not exists public.reminder_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_membership_id uuid not null references public.habit_memberships(id) on delete cascade,
  reminders_enabled boolean not null default false,
  nudge_notifications_enabled boolean not null default true,
  missed_notifications_enabled boolean not null default true,
  scheduled_reminder_time time null,
  notification_permission_status public.notification_permission_status not null default 'unknown',
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_preferences_unique_membership unique (habit_membership_id),
  constraint reminder_preferences_timezone_not_empty check (length(btrim(timezone)) > 0)
);

create table if not exists public.device_push_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform public.push_platform not null,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_user_token_unique unique (user_id, expo_push_token),
  constraint device_push_tokens_token_not_empty check (length(btrim(expo_push_token)) > 0)
);

create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  channel public.notification_channel not null default 'push',
  delivery_status public.notification_delivery_status not null default 'queued',
  target_habit_id uuid null references public.habits(id) on delete cascade,
  target_check_in_id uuid null references public.check_ins(id) on delete cascade,
  target_nudge_id uuid null,
  target_reaction_id uuid null,
  title text null,
  body text null,
  expo_ticket_id text null,
  error_message text null,
  sent_at timestamptz null,
  delivered_at timestamptz null,
  opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nudges (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  reason public.nudge_reason not null,
  message_variant public.nudge_message_variant not null,
  created_local_date date not null,
  delivery_status public.nudge_delivery_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nudges_sender_not_recipient check (sender_user_id <> recipient_user_id)
);

create unique index if not exists nudges_sender_daily_limit_idx
  on public.nudges (habit_id, sender_user_id, recipient_user_id, created_local_date);

create table if not exists public.reactions (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type public.reaction_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reactions_unique_sender_checkin unique (sender_user_id, check_in_id)
);

alter table public.notifications
  add constraint notifications_target_nudge_fk
  foreign key (target_nudge_id) references public.nudges(id) on delete cascade;

alter table public.notifications
  add constraint notifications_target_reaction_fk
  foreign key (target_reaction_id) references public.reactions(id) on delete cascade;

create index if not exists habits_owner_status_idx on public.habits (owner_user_id, status);
create index if not exists habits_privacy_status_idx on public.habits (privacy, status);
create index if not exists habit_memberships_user_status_idx on public.habit_memberships (user_id, membership_status);
create index if not exists habit_memberships_habit_status_idx on public.habit_memberships (habit_id, membership_status);
create index if not exists membership_schedules_timezone_idx on public.membership_schedules (timezone);
create index if not exists membership_target_history_membership_week_idx on public.membership_target_history (habit_membership_id, effective_week_start desc);
create index if not exists check_ins_user_date_idx on public.check_ins (user_id, local_date desc);
create index if not exists check_ins_habit_week_idx on public.check_ins (habit_id, local_week_start);
create index if not exists check_ins_membership_week_status_idx on public.check_ins (habit_membership_id, local_week_start, status);
create index if not exists invites_habit_status_idx on public.invites (habit_id, status);
create index if not exists invites_expires_at_idx on public.invites (expires_at);
create index if not exists invites_created_by_user_idx on public.invites (created_by_user_id);
create index if not exists invites_created_by_membership_idx on public.invites (created_by_membership_id);
create index if not exists reminder_preferences_membership_idx on public.reminder_preferences (habit_membership_id);
create index if not exists device_push_tokens_user_enabled_idx on public.device_push_tokens (user_id, enabled);
create index if not exists notifications_recipient_status_created_idx on public.notifications (recipient_user_id, delivery_status, created_at desc);
create index if not exists notifications_status_created_idx on public.notifications (delivery_status, created_at);
create index if not exists notifications_target_habit_idx on public.notifications (target_habit_id);
create index if not exists notifications_target_check_in_idx on public.notifications (target_check_in_id);
create index if not exists notifications_target_nudge_idx on public.notifications (target_nudge_id);
create index if not exists notifications_target_reaction_idx on public.notifications (target_reaction_id);
create index if not exists nudges_habit_date_idx on public.nudges (habit_id, created_local_date);
create index if not exists nudges_recipient_date_idx on public.nudges (recipient_user_id, created_local_date);
create index if not exists reactions_habit_checkin_idx on public.reactions (habit_id, check_in_id);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create trigger habits_touch_updated_at
  before update on public.habits
  for each row execute function private.touch_updated_at();

create trigger habit_memberships_touch_updated_at
  before update on public.habit_memberships
  for each row execute function private.touch_updated_at();

create trigger membership_schedules_touch_updated_at
  before update on public.membership_schedules
  for each row execute function private.touch_updated_at();

create trigger check_ins_touch_updated_at
  before update on public.check_ins
  for each row execute function private.touch_updated_at();

create trigger invites_touch_updated_at
  before update on public.invites
  for each row execute function private.touch_updated_at();

create trigger reminder_preferences_touch_updated_at
  before update on public.reminder_preferences
  for each row execute function private.touch_updated_at();

create trigger device_push_tokens_touch_updated_at
  before update on public.device_push_tokens
  for each row execute function private.touch_updated_at();

create trigger notifications_touch_updated_at
  before update on public.notifications
  for each row execute function private.touch_updated_at();

create trigger nudges_touch_updated_at
  before update on public.nudges
  for each row execute function private.touch_updated_at();

create trigger reactions_touch_updated_at
  before update on public.reactions
  for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'Rally User')), '');

  insert into public.profiles (id, display_name, initials)
  values (new.id, coalesce(v_display_name, 'Rally User'), private.initials_for(coalesce(v_display_name, 'Rally User')))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_rally_profile on auth.users;

create trigger on_auth_user_created_create_rally_profile
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.ensure_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_display_name text;
begin
  select email into v_email
  from auth.users
  where id = p_user_id;

  v_display_name := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Rally User');

  insert into public.profiles (id, display_name, initials)
  values (p_user_id, v_display_name, private.initials_for(v_display_name))
  on conflict (id) do nothing;
end;
$$;

create or replace function private.api_success(p_data jsonb)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'data', coalesce(p_data, '{}'::jsonb),
    'request_id', extensions.gen_random_uuid()::text,
    'server_time', now()
  );
$$;

create or replace function private.api_error(
  p_code text,
  p_message text,
  p_recovery text default 'none',
  p_retryable boolean default false,
  p_details jsonb default '{}'::jsonb,
  p_field text default null
)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', false,
    'error', jsonb_strip_nulls(jsonb_build_object(
      'code', p_code,
      'message', p_message,
      'field', p_field,
      'retryable', p_retryable,
      'recovery', p_recovery,
      'details', coalesce(p_details, '{}'::jsonb)
    )),
    'request_id', extensions.gen_random_uuid()::text,
    'server_time', now()
  );
$$;

create or replace function private.habit_summary(p_habit_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'habit_id', h.id,
    'name', h.name,
    'privacy', h.privacy,
    'status', h.status,
    'owner_user_id', h.owner_user_id,
    'max_members', h.max_members,
    'active_member_count', (
      select count(*)::int
      from public.habit_memberships hm
      where hm.habit_id = h.id
        and hm.membership_status = 'active'
    )
  )
  from public.habits h
  where h.id = p_habit_id;
$$;

create or replace function private.membership_summary(p_membership_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership_id', hm.id,
    'habit_id', hm.habit_id,
    'user_id', hm.user_id,
    'role', hm.role,
    'status', hm.membership_status,
    'weekly_target', hm.weekly_target,
    'planned_weekdays', coalesce(to_jsonb(ms.planned_weekdays), '[]'::jsonb),
    'timezone', ms.timezone,
    'pending_weekly_target', hm.pending_weekly_target,
    'pending_planned_weekdays', to_jsonb(ms.pending_planned_weekdays),
    'pending_effective_week_start', coalesce(hm.pending_target_effective_week_start, ms.pending_schedule_effective_week_start)
  )
  from public.habit_memberships hm
  left join public.membership_schedules ms on ms.habit_membership_id = hm.id
  where hm.id = p_membership_id;
$$;

create or replace function private.reminder_preferences_dto(p_membership_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'habit_membership_id', rp.habit_membership_id,
    'reminders_enabled', rp.reminders_enabled,
    'nudge_notifications_enabled', rp.nudge_notifications_enabled,
    'missed_notifications_enabled', rp.missed_notifications_enabled,
    'scheduled_reminder_time', to_char(rp.scheduled_reminder_time, 'HH24:MI'),
    'notification_permission_status', rp.notification_permission_status,
    'timezone', rp.timezone
  )
  from public.reminder_preferences rp
  where rp.habit_membership_id = p_membership_id;
$$;

create or replace function private.check_in_dto(p_check_in_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'check_in_id', ci.id,
    'habit_id', ci.habit_id,
    'habit_membership_id', ci.habit_membership_id,
    'local_date', ci.local_date,
    'local_week_start', ci.local_week_start,
    'local_timezone', ci.local_timezone,
    'status', ci.status,
    'source', ci.source,
    'client_request_id', ci.client_request_id,
    'recorded_at', ci.recorded_at,
    'locked_at', ci.locked_at
  )
  from public.check_ins ci
  where ci.id = p_check_in_id;
$$;

create or replace function private.progress_summary(p_membership_id uuid, p_week_start date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target smallint;
  v_completed int;
  v_skipped int;
  v_missed int;
  v_raw numeric;
  v_capped numeric;
  v_pace text;
begin
  select coalesce(mth.weekly_target, hm.weekly_target)
  into v_target
  from public.habit_memberships hm
  left join public.membership_target_history mth
    on mth.habit_membership_id = hm.id
   and mth.effective_week_start = p_week_start
  where hm.id = p_membership_id;

  select
    count(*) filter (where status = 'completed')::int,
    count(*) filter (where status = 'skipped')::int,
    count(*) filter (where status = 'missed')::int
  into v_completed, v_skipped, v_missed
  from public.check_ins
  where habit_membership_id = p_membership_id
    and local_week_start = p_week_start;

  v_target := coalesce(v_target, 1);
  v_completed := coalesce(v_completed, 0);
  v_skipped := coalesce(v_skipped, 0);
  v_missed := coalesce(v_missed, 0);
  v_raw := round((v_completed::numeric / greatest(v_target, 1)) * 100, 2);
  v_capped := least(v_raw, 100);

  v_pace := case
    when v_completed >= v_target then 'complete'
    when v_completed = 0 then 'not_started'
    else 'on_pace'
  end;

  return jsonb_build_object(
    'local_week_start', p_week_start,
    'weekly_target', v_target,
    'completed_count', v_completed,
    'skipped_count', v_skipped,
    'missed_count', v_missed,
    'raw_percentage', v_raw,
    'capped_percentage', v_capped,
    'over_target_count', greatest(v_completed - v_target, 0),
    'pace_state', v_pace
  );
end;
$$;

create or replace function private.is_same_shared_habit_member(p_habit_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.habit_memberships hm
    join public.habits h on h.id = hm.habit_id
    where hm.habit_id = p_habit_id
      and hm.user_id = p_user_id
      and hm.membership_status = 'active'
      and h.privacy = 'shared'
      and h.status = 'active'
  );
$$;

create or replace function private.assert_check_in_matches_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit_id uuid;
  v_user_id uuid;
begin
  select hm.habit_id, hm.user_id
  into v_habit_id, v_user_id
  from public.habit_memberships hm
  where hm.id = new.habit_membership_id;

  if v_habit_id is null or v_habit_id <> new.habit_id or v_user_id <> new.user_id then
    raise exception 'check_in membership mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_ins_assert_membership
  before insert or update on public.check_ins
  for each row execute function private.assert_check_in_matches_membership();

create or replace function private.assert_invite_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valid boolean;
begin
  select exists (
    select 1
    from public.habit_memberships hm
    where hm.id = new.created_by_membership_id
      and hm.habit_id = new.habit_id
      and hm.user_id = new.created_by_user_id
      and hm.role = 'owner'
      and hm.membership_status = 'active'
  )
  into v_valid;

  if not coalesce(v_valid, false) then
    raise exception 'invite creator membership mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger invites_assert_creator_membership
  before insert or update on public.invites
  for each row execute function private.assert_invite_creator_membership();

create or replace function public.create_habit_with_membership(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_privacy public.habit_privacy;
  v_max_members smallint;
  v_days smallint[];
  v_timezone text;
  v_week_start date;
  v_habit public.habits%rowtype;
  v_membership public.habit_memberships%rowtype;
  v_reminders_enabled boolean;
  v_nudge_enabled boolean;
  v_missed_enabled boolean;
  v_reminder_time time;
  v_permission public.notification_permission_status;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  v_name := nullif(btrim(input #>> '{habit,name}'), '');
  if v_name is null then
    return private.api_error('validation_failed', 'Habit name is required.', 'none', false, '{}'::jsonb, 'habit.name');
  end if;

  v_privacy := coalesce(nullif(input #>> '{habit,privacy}', ''), 'private')::public.habit_privacy;
  v_max_members := coalesce(nullif(input #>> '{habit,max_members}', '')::smallint, 5);
  if v_max_members < 2 or v_max_members > 5 then
    return private.api_error('validation_failed', 'max_members must be between 2 and 5.', 'none', false, '{}'::jsonb, 'habit.max_members');
  end if;

  v_days := private.parse_weekdays(input #> '{setup,planned_weekdays}');
  if v_days is null then
    return private.api_error('validation_failed', 'planned_weekdays must contain one to seven unique weekdays.', 'none', false, '{}'::jsonb, 'setup.planned_weekdays');
  end if;

  v_timezone := nullif(btrim(input #>> '{setup,timezone}'), '');
  if v_timezone is null then
    return private.api_error('validation_failed', 'Timezone is required.', 'none', false, '{}'::jsonb, 'setup.timezone');
  end if;

  v_week_start := private.local_week_start(private.current_local_date(v_timezone));
  v_reminders_enabled := coalesce((input #>> '{reminders,reminders_enabled}')::boolean, false);
  v_nudge_enabled := coalesce((input #>> '{reminders,nudge_notifications_enabled}')::boolean, true);
  v_missed_enabled := coalesce((input #>> '{reminders,missed_notifications_enabled}')::boolean, true);
  v_reminder_time := nullif(input #>> '{reminders,scheduled_reminder_time}', '')::time;
  v_permission := coalesce(nullif(input #>> '{reminders,notification_permission_status}', ''), 'unknown')::public.notification_permission_status;

  if v_reminders_enabled and v_permission in ('denied', 'disabled') then
    return private.api_error('notification_permission_denied', 'Notifications are not available with the current permission state.', 'open_notification_settings');
  end if;

  perform private.ensure_profile(v_user_id);

  insert into public.habits (owner_user_id, name, privacy, max_members)
  values (v_user_id, v_name, v_privacy, v_max_members)
  returning * into v_habit;

  insert into public.habit_memberships (
    habit_id,
    user_id,
    role,
    membership_status,
    weekly_target,
    joined_at
  )
  values (
    v_habit.id,
    v_user_id,
    'owner',
    'active',
    cardinality(v_days),
    now()
  )
  returning * into v_membership;

  insert into public.membership_schedules (
    habit_membership_id,
    planned_weekdays,
    timezone
  )
  values (v_membership.id, v_days, v_timezone);

  insert into public.membership_target_history (
    habit_membership_id,
    effective_week_start,
    weekly_target,
    planned_weekdays,
    timezone,
    source
  )
  values (v_membership.id, v_week_start, cardinality(v_days), v_days, v_timezone, 'habit_setup');

  insert into public.reminder_preferences (
    habit_membership_id,
    reminders_enabled,
    nudge_notifications_enabled,
    missed_notifications_enabled,
    scheduled_reminder_time,
    notification_permission_status,
    timezone
  )
  values (
    v_membership.id,
    v_reminders_enabled,
    v_nudge_enabled,
    v_missed_enabled,
    v_reminder_time,
    v_permission,
    v_timezone
  );

  return private.api_success(jsonb_build_object(
    'habit', private.habit_summary(v_habit.id),
    'membership', private.membership_summary(v_membership.id),
    'reminder_preferences', private.reminder_preferences_dto(v_membership.id),
    'target_history', jsonb_build_object(
      'effective_week_start', v_week_start,
      'weekly_target', cardinality(v_days),
      'planned_weekdays', to_jsonb(v_days),
      'source', 'habit_setup'
    ),
    'created_at', now()
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported enum or date/time value.', 'none');
  when others then
    return private.api_error('validation_failed', sqlerrm, 'none');
end;
$$;

create or replace function public.get_invite_preview(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(coalesce(input ->> 'invite_token_or_code', input ->> 'token', input ->> 'public_code')), '');
  v_hash text;
  v_invite public.invites%rowtype;
  v_habit public.habits%rowtype;
  v_inviter public.profiles%rowtype;
  v_active_count int;
  v_resolution text;
  v_existing_habit_id uuid;
begin
  if v_token is null then
    return private.api_success(jsonb_build_object('invite_resolution', 'invalid', 'auth_required', true));
  end if;

  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select *
  into v_invite
  from public.invites
  where public_code = v_token
     or token_hash = v_hash
  order by (public_code = v_token) desc
  limit 1;

  if v_invite.id is null then
    return private.api_success(jsonb_build_object('invite_resolution', 'invalid', 'auth_required', true));
  end if;

  update public.invites
  set last_viewed_at = now()
  where id = v_invite.id;

  select * into v_habit from public.habits where id = v_invite.habit_id;
  select * into v_inviter from public.profiles where id = v_invite.created_by_user_id;

  select count(*)::int
  into v_active_count
  from public.habit_memberships
  where habit_id = v_invite.habit_id
    and membership_status = 'active';

  select hm.habit_id
  into v_existing_habit_id
  from public.habit_memberships hm
  where hm.habit_id = v_invite.habit_id
    and hm.user_id = v_user_id
    and hm.membership_status = 'active'
  limit 1;

  v_resolution := case
    when v_invite.status = 'revoked' then 'revoked'
    when v_invite.status = 'expired' or v_invite.expires_at <= now() then 'expired'
    when v_invite.status = 'closed' then 'full'
    when v_existing_habit_id is not null then 'already_joined'
    when v_active_count >= v_habit.max_members then 'full'
    else 'valid'
  end;

  return private.api_success(jsonb_build_object(
    'invite_resolution', v_resolution,
    'habit_name', v_habit.name,
    'inviter_display_name', v_inviter.display_name,
    'inviter_initials', v_inviter.initials,
    'active_member_count', v_active_count,
    'member_limit', v_habit.max_members,
    'privacy_summary', 'Shared habit progress is visible only to active members of this habit.',
    'auth_required', true,
    'habit_id', case when v_existing_habit_id is not null then v_existing_habit_id else null end
  ));
end;
$$;

create or replace function public.accept_invite(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(input ->> 'invite_token_or_code'), '');
  v_hash text;
  v_invite public.invites%rowtype;
  v_habit public.habits%rowtype;
  v_existing public.habit_memberships%rowtype;
  v_membership public.habit_memberships%rowtype;
  v_days smallint[];
  v_timezone text;
  v_week_start date;
  v_next_week_start date;
  v_active_count int;
  v_reminders_enabled boolean;
  v_nudge_enabled boolean;
  v_missed_enabled boolean;
  v_reminder_time time;
  v_permission public.notification_permission_status;
  v_rejoined boolean := false;
  v_inserted_history_count int := 0;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  if v_token is null then
    return private.api_error('invite_invalid', 'Invite code or token is required.', 'request_new_invite');
  end if;

  v_days := private.parse_weekdays(input #> '{setup,planned_weekdays}');
  if v_days is null then
    return private.api_error('validation_failed', 'planned_weekdays must contain one to seven unique weekdays.', 'none', false, '{}'::jsonb, 'setup.planned_weekdays');
  end if;

  v_timezone := nullif(btrim(input #>> '{setup,timezone}'), '');
  if v_timezone is null then
    return private.api_error('validation_failed', 'Timezone is required.', 'none', false, '{}'::jsonb, 'setup.timezone');
  end if;

  v_week_start := private.local_week_start(private.current_local_date(v_timezone));
  v_next_week_start := private.next_sunday(private.current_local_date(v_timezone));
  v_reminders_enabled := coalesce((input #>> '{reminders,reminders_enabled}')::boolean, false);
  v_nudge_enabled := coalesce((input #>> '{reminders,nudge_notifications_enabled}')::boolean, true);
  v_missed_enabled := coalesce((input #>> '{reminders,missed_notifications_enabled}')::boolean, true);
  v_reminder_time := nullif(input #>> '{reminders,scheduled_reminder_time}', '')::time;
  v_permission := coalesce(nullif(input #>> '{reminders,notification_permission_status}', ''), 'unknown')::public.notification_permission_status;

  if v_reminders_enabled and v_permission in ('denied', 'disabled') then
    return private.api_error('notification_permission_denied', 'Notifications are not available with the current permission state.', 'open_notification_settings');
  end if;

  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select *
  into v_invite
  from public.invites
  where public_code = v_token
     or token_hash = v_hash
  order by (public_code = v_token) desc
  limit 1
  for update;

  if v_invite.id is null then
    return private.api_error('invite_invalid', 'This invite is not valid.', 'request_new_invite');
  end if;

  if v_invite.status = 'revoked' then
    return private.api_error('invite_revoked', 'This invite was revoked.', 'request_new_invite');
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at <= now() then
    return private.api_error('invite_expired', 'This invite has expired.', 'request_new_invite');
  end if;

  if v_invite.status = 'closed' then
    return private.api_error('invite_full', 'This habit is already full.', 'request_new_invite');
  end if;

  select * into v_habit from public.habits where id = v_invite.habit_id for update;

  select count(*)::int
  into v_active_count
  from public.habit_memberships
  where habit_id = v_invite.habit_id
    and membership_status = 'active';

  select *
  into v_existing
  from public.habit_memberships
  where habit_id = v_invite.habit_id
    and user_id = v_user_id
  limit 1
  for update;

  if v_existing.id is not null and v_existing.membership_status = 'active' then
    return private.api_error(
      'invite_already_joined',
      'You are already a member of this habit.',
      'open_existing_habit',
      false,
      jsonb_build_object('habit_id', v_existing.habit_id)
    );
  end if;

  if v_active_count >= v_habit.max_members then
    return private.api_error('invite_full', 'This habit is already full.', 'request_new_invite');
  end if;

  perform private.ensure_profile(v_user_id);

  update public.habits
  set privacy = 'shared'
  where id = v_habit.id;

  if v_existing.id is not null then
    v_rejoined := true;
    update public.habit_memberships
    set membership_status = 'active',
        role = 'member',
        weekly_target = cardinality(v_days),
        pending_weekly_target = null,
        pending_target_effective_week_start = null,
        joined_at = now(),
        left_at = null
    where id = v_existing.id
    returning * into v_membership;
  else
    insert into public.habit_memberships (
      habit_id,
      user_id,
      role,
      membership_status,
      weekly_target,
      joined_at
    )
    values (
      v_invite.habit_id,
      v_user_id,
      'member',
      'active',
      cardinality(v_days),
      now()
    )
    returning * into v_membership;
  end if;

  insert into public.membership_schedules (
    habit_membership_id,
    planned_weekdays,
    timezone
  )
  values (v_membership.id, v_days, v_timezone)
  on conflict (habit_membership_id) do update
    set planned_weekdays = excluded.planned_weekdays,
        pending_planned_weekdays = null,
        pending_schedule_effective_week_start = null,
        timezone = excluded.timezone;

  insert into public.membership_target_history (
    habit_membership_id,
    effective_week_start,
    weekly_target,
    planned_weekdays,
    timezone,
    source
  )
  values (
    v_membership.id,
    v_week_start,
    cardinality(v_days),
    v_days,
    v_timezone,
    case when v_rejoined then 'invite_rejoin' else 'invite_acceptance' end
  )
  on conflict (habit_membership_id, effective_week_start) do nothing;

  get diagnostics v_inserted_history_count = row_count;

  if v_rejoined and v_inserted_history_count = 0 then
    update public.habit_memberships
    set pending_weekly_target = cardinality(v_days),
        pending_target_effective_week_start = v_next_week_start
    where id = v_membership.id;

    update public.membership_schedules
    set pending_planned_weekdays = v_days,
        pending_schedule_effective_week_start = v_next_week_start
    where habit_membership_id = v_membership.id;
  end if;

  insert into public.reminder_preferences (
    habit_membership_id,
    reminders_enabled,
    nudge_notifications_enabled,
    missed_notifications_enabled,
    scheduled_reminder_time,
    notification_permission_status,
    timezone
  )
  values (
    v_membership.id,
    v_reminders_enabled,
    v_nudge_enabled,
    v_missed_enabled,
    v_reminder_time,
    v_permission,
    v_timezone
  )
  on conflict (habit_membership_id) do update
    set reminders_enabled = excluded.reminders_enabled,
        nudge_notifications_enabled = excluded.nudge_notifications_enabled,
        missed_notifications_enabled = excluded.missed_notifications_enabled,
        scheduled_reminder_time = excluded.scheduled_reminder_time,
        notification_permission_status = excluded.notification_permission_status,
        timezone = excluded.timezone;

  update public.invites
  set accepted_count = accepted_count + 1,
      status = case when accepted_count + 1 >= max_acceptances then 'closed'::public.invite_status else status end,
      closed_at = case when accepted_count + 1 >= max_acceptances then now() else closed_at end
  where id = v_invite.id;

  return private.api_success(jsonb_build_object(
    'invite_resolution', 'accepted',
    'invite_id', v_invite.id,
    'habit', private.habit_summary(v_invite.habit_id),
    'membership', private.membership_summary(v_membership.id),
    'reminder_preferences', private.reminder_preferences_dto(v_membership.id),
    'target_history', jsonb_build_object(
      'effective_week_start', v_week_start,
      'weekly_target', cardinality(v_days),
      'planned_weekdays', to_jsonb(v_days),
      'source', case when v_rejoined then 'invite_rejoin' else 'invite_acceptance' end
    ),
    'rejoined', v_rejoined,
    'preserved_membership_id', case when v_rejoined then v_membership.id else null end
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported enum or date/time value.', 'none');
  when others then
    return private.api_error('validation_failed', sqlerrm, 'none');
end;
$$;

create or replace function public.record_checkin(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_request_id text := nullif(btrim(input ->> 'client_request_id'), '');
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_membership_id uuid := nullif(input ->> 'habit_membership_id', '')::uuid;
  v_local_date date := nullif(input ->> 'local_date', '')::date;
  v_local_week_start date := nullif(input ->> 'local_week_start', '')::date;
  v_timezone text := nullif(btrim(input ->> 'local_timezone'), '');
  v_status public.check_in_status := nullif(input ->> 'status', '')::public.check_in_status;
  v_source public.check_in_source;
  v_membership public.habit_memberships%rowtype;
  v_existing public.check_ins%rowtype;
  v_check_in public.check_ins%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  if v_client_request_id is null then
    return private.api_error('validation_failed', 'client_request_id is required.', 'none', false, '{}'::jsonb, 'client_request_id');
  end if;

  if v_status not in ('completed', 'skipped') then
    return private.api_error('validation_failed', 'Only completed or skipped check-ins can be recorded by users.', 'none', false, '{}'::jsonb, 'status');
  end if;

  if v_timezone is null then
    return private.api_error('validation_failed', 'local_timezone is required.', 'none', false, '{}'::jsonb, 'local_timezone');
  end if;

  if v_local_week_start <> private.local_week_start(v_local_date) then
    return private.api_error('validation_failed', 'local_week_start must be the Sunday for local_date.', 'none', false, '{}'::jsonb, 'local_week_start');
  end if;

  if v_local_date > private.current_local_date(v_timezone) then
    return private.api_error('validation_failed', 'Future check-ins are not allowed.', 'none', false, '{}'::jsonb, 'local_date');
  end if;

  select *
  into v_membership
  from public.habit_memberships
  where id = v_membership_id
    and habit_id = v_habit_id
    and user_id = v_user_id
    and membership_status = 'active';

  if v_membership.id is null then
    return private.api_error('not_found', 'Habit membership was not found.', 'refresh_view');
  end if;

  select *
  into v_existing
  from public.check_ins
  where user_id = v_user_id
    and client_request_id = v_client_request_id;

  if v_existing.id is not null then
    return private.api_success(jsonb_build_object(
      'check_in', private.check_in_dto(v_existing.id),
      'idempotent_replay', true
    ));
  end if;

  select *
  into v_existing
  from public.check_ins
  where habit_membership_id = v_membership_id
    and local_date = v_local_date
  for update;

  if v_existing.id is not null and v_existing.status = 'missed' then
    return private.api_error('checkin_locked_missed', 'Missed check-ins cannot be changed in this MVP.', 'refresh_view');
  end if;

  v_source := case
    when coalesce(input ->> 'source', '') = 'offline_retry' then 'offline_retry'::public.check_in_source
    else 'user_action'::public.check_in_source
  end;

  if v_existing.id is not null then
    update public.check_ins
    set status = v_status,
        source = v_source,
        client_request_id = v_client_request_id,
        local_timezone = v_timezone,
        recorded_at = now()
    where id = v_existing.id
    returning * into v_check_in;
  else
    insert into public.check_ins (
      habit_id,
      habit_membership_id,
      user_id,
      local_date,
      local_week_start,
      local_timezone,
      status,
      source,
      client_request_id
    )
    values (
      v_habit_id,
      v_membership_id,
      v_user_id,
      v_local_date,
      v_local_week_start,
      v_timezone,
      v_status,
      v_source,
      v_client_request_id
    )
    returning * into v_check_in;
  end if;

  return private.api_success(jsonb_build_object(
    'check_in', private.check_in_dto(v_check_in.id),
    'idempotent_replay', false
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported enum, UUID, or date value.', 'none');
  when unique_violation then
    return private.api_error('checkin_duplicate', 'A check-in already exists for this request or day.', 'refresh_view');
  when others then
    return private.api_error('validation_failed', sqlerrm, 'none');
end;
$$;

create or replace function public.get_daily_view(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text := coalesce(nullif(btrim(input ->> 'timezone'), ''), 'UTC');
  v_local_date date := coalesce(nullif(input ->> 'local_date', '')::date, private.current_local_date(v_timezone));
  v_week_start date := private.local_week_start(v_local_date);
  v_weekday smallint := extract(dow from v_local_date)::smallint;
  v_profile jsonb;
  v_habits jsonb;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  select jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'notification_permission_status', p.notification_permission_status
  )
  into v_profile
  from public.profiles p
  where p.id = v_user_id;

  select coalesce(jsonb_agg(row_data order by row_created_at), '[]'::jsonb)
  into v_habits
  from (
    select
      h.created_at as row_created_at,
      jsonb_build_object(
        'habit', private.habit_summary(h.id),
        'membership', jsonb_build_object(
          'membership_id', hm.id,
          'role', hm.role,
          'weekly_target', hm.weekly_target,
          'planned_weekdays', to_jsonb(ms.planned_weekdays),
          'pending_weekly_target', hm.pending_weekly_target,
          'pending_effective_week_start', hm.pending_target_effective_week_start
        ),
        'today', jsonb_build_object(
          'state', coalesce(ci.status::text, case when v_weekday = any(ms.planned_weekdays) then 'due' else 'upcoming' end),
          'planned_today', v_weekday = any(ms.planned_weekdays),
          'due_today', ci.id is null and v_weekday = any(ms.planned_weekdays),
          'can_record_checkin', ci.status is null or ci.status in ('completed', 'skipped'),
          'check_in', case when ci.id is null then null else private.check_in_dto(ci.id) end,
          'disabled_error_code', case when ci.status = 'missed' then 'checkin_locked_missed' else null end
        ),
        'week_progress', private.progress_summary(hm.id, v_week_start),
        'shared_signal', case when h.privacy = 'shared' then jsonb_build_object(
          'active_member_count', (
            select count(*)::int
            from public.habit_memberships peers
            where peers.habit_id = h.id
              and peers.membership_status = 'active'
          ),
          'peer_completed_today_count', (
            select count(*)::int
            from public.check_ins peer_ci
            where peer_ci.habit_id = h.id
              and peer_ci.user_id <> v_user_id
              and peer_ci.local_date = v_local_date
              and peer_ci.status = 'completed'
          ),
          'peer_missed_today_count', (
            select count(*)::int
            from public.check_ins peer_ci
            where peer_ci.habit_id = h.id
              and peer_ci.user_id <> v_user_id
              and peer_ci.local_date = v_local_date
              and peer_ci.status = 'missed'
          ),
          'peer_behind_pace_count', 0,
          'latest_peer_check_in', null
        ) else null end
      ) as row_data
    from public.habit_memberships hm
    join public.habits h on h.id = hm.habit_id
    join public.membership_schedules ms on ms.habit_membership_id = hm.id
    left join public.check_ins ci
      on ci.habit_membership_id = hm.id
     and ci.local_date = v_local_date
    where hm.user_id = v_user_id
      and hm.membership_status = 'active'
      and h.status = 'active'
  ) rows;

  return private.api_success(jsonb_build_object(
    'local_date', v_local_date,
    'timezone', v_timezone,
    'profile', coalesce(v_profile, '{}'::jsonb),
    'habits', v_habits
  ));
end;
$$;

create or replace function public.create_invite(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_membership public.habit_memberships%rowtype;
  v_habit public.habits%rowtype;
  v_active_count int;
  v_max_acceptances smallint;
  v_expires_in_days int := coalesce(nullif(input ->> 'expires_in_days', '')::int, 14);
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_public_code text := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
  v_invite public.invites%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  select *
  into v_membership
  from public.habit_memberships
  where habit_id = v_habit_id
    and user_id = v_user_id
    and role = 'owner'
    and membership_status = 'active';

  if v_membership.id is null then
    return private.api_error('forbidden', 'Only the active habit owner can create invites.', 'none');
  end if;

  select * into v_habit from public.habits where id = v_habit_id for update;

  select count(*)::int
  into v_active_count
  from public.habit_memberships
  where habit_id = v_habit_id
    and membership_status = 'active';

  if v_active_count >= v_habit.max_members then
    return private.api_error('invite_full', 'This habit is already full.', 'request_new_invite');
  end if;

  v_max_acceptances := least(
    coalesce(nullif(input ->> 'max_acceptances', '')::smallint, (v_habit.max_members - v_active_count)::smallint),
    (v_habit.max_members - v_active_count)::smallint,
    4::smallint
  );

  insert into public.invites (
    habit_id,
    created_by_user_id,
    created_by_membership_id,
    public_code,
    token_hash,
    max_acceptances,
    expires_at
  )
  values (
    v_habit_id,
    v_user_id,
    v_membership.id,
    v_public_code,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_max_acceptances,
    now() + make_interval(days => v_expires_in_days)
  )
  returning * into v_invite;

  update public.habits set privacy = 'shared' where id = v_habit_id;

  return private.api_success(jsonb_build_object(
    'invite_id', v_invite.id,
    'habit_id', v_invite.habit_id,
    'public_code', v_invite.public_code,
    'invite_token', v_token,
    'invite_url', '/invite/' || v_token,
    'status', v_invite.status,
    'resolution', 'valid',
    'expires_at', v_invite.expires_at,
    'max_acceptances', v_invite.max_acceptances,
    'accepted_count', v_invite.accepted_count,
    'active_member_count', v_active_count,
    'max_members', v_habit.max_members
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported UUID or numeric value.', 'none');
  when others then
    return private.api_error('validation_failed', sqlerrm, 'none');
end;
$$;

create or replace function public.revoke_invite(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.invites%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  select i.*
  into v_invite
  from public.invites i
  join public.habits h on h.id = i.habit_id
  where (i.id = nullif(input ->> 'invite_id', '')::uuid or i.public_code = nullif(input ->> 'public_code', ''))
    and h.owner_user_id = v_user_id
  limit 1
  for update;

  if v_invite.id is null then
    return private.api_error('not_found', 'Invite was not found.', 'refresh_view');
  end if;

  if v_invite.status = 'active' then
    update public.invites
    set status = 'revoked',
        revoked_at = now()
    where id = v_invite.id
    returning * into v_invite;
  end if;

  return private.api_success(jsonb_build_object(
    'invite_id', v_invite.id,
    'habit_id', v_invite.habit_id,
    'status', v_invite.status,
    'revoked_at', v_invite.revoked_at
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported UUID value.', 'none');
end;
$$;

create or replace function public.schedule_target_change(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership_id uuid := nullif(input ->> 'habit_membership_id', '')::uuid;
  v_timezone text := nullif(btrim(input ->> 'timezone'), '');
  v_days smallint[] := private.parse_weekdays(input -> 'planned_weekdays');
  v_effective date;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  if v_days is null then
    return private.api_error('validation_failed', 'planned_weekdays must contain one to seven unique weekdays.', 'none', false, '{}'::jsonb, 'planned_weekdays');
  end if;

  if v_timezone is null then
    return private.api_error('validation_failed', 'Timezone is required.', 'none', false, '{}'::jsonb, 'timezone');
  end if;

  v_effective := private.next_sunday(private.current_local_date(v_timezone));

  update public.habit_memberships
  set pending_weekly_target = cardinality(v_days),
      pending_target_effective_week_start = v_effective
  where id = v_membership_id
    and user_id = v_user_id
    and membership_status = 'active';

  if not found then
    return private.api_error('not_found', 'Habit membership was not found.', 'refresh_view');
  end if;

  update public.membership_schedules
  set pending_planned_weekdays = v_days,
      pending_schedule_effective_week_start = v_effective,
      timezone = v_timezone
  where habit_membership_id = v_membership_id;

  return private.api_success(jsonb_build_object(
    'habit_membership_id', v_membership_id,
    'pending_weekly_target', cardinality(v_days),
    'pending_planned_weekdays', to_jsonb(v_days),
    'pending_effective_week_start', v_effective
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported UUID value.', 'none');
end;
$$;

create or replace function public.apply_pending_targets(input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_at timestamptz := coalesce(nullif(input ->> 'run_at', '')::timestamptz, now());
  v_dry_run boolean := coalesce((input ->> 'dry_run')::boolean, false);
  v_applied int := 0;
  v_evaluated int := 0;
  r record;
begin
  if auth.role() <> 'service_role' then
    return private.api_error('forbidden', 'Service role is required.', 'none');
  end if;

  for r in
    select hm.*, ms.planned_weekdays, ms.pending_planned_weekdays, ms.pending_schedule_effective_week_start, ms.timezone
    from public.habit_memberships hm
    join public.membership_schedules ms on ms.habit_membership_id = hm.id
    where hm.pending_weekly_target is not null
      and hm.pending_target_effective_week_start is not null
  loop
    v_evaluated := v_evaluated + 1;
    if r.pending_target_effective_week_start <= (v_run_at at time zone r.timezone)::date then
      if not v_dry_run then
        insert into public.membership_target_history (
          habit_membership_id,
          effective_week_start,
          weekly_target,
          planned_weekdays,
          timezone,
          source
        )
        values (
          r.id,
          r.pending_target_effective_week_start,
          r.pending_weekly_target,
          coalesce(r.pending_planned_weekdays, r.planned_weekdays),
          r.timezone,
          'scheduled_target_change'
        )
        on conflict (habit_membership_id, effective_week_start) do nothing;

        update public.habit_memberships
        set weekly_target = r.pending_weekly_target,
            pending_weekly_target = null,
            pending_target_effective_week_start = null
        where id = r.id;

        update public.membership_schedules
        set planned_weekdays = coalesce(r.pending_planned_weekdays, planned_weekdays),
            pending_planned_weekdays = null,
            pending_schedule_effective_week_start = null
        where habit_membership_id = r.id;
      end if;
      v_applied := v_applied + 1;
    end if;
  end loop;

  return private.api_success(jsonb_build_object(
    'run_at', v_run_at,
    'dry_run', v_dry_run,
    'evaluated_count', v_evaluated,
    'applied_count', v_applied,
    'skipped_count', v_evaluated - v_applied,
    'results', '[]'::jsonb
  ));
end;
$$;

create or replace function public.mark_missed_checkins(input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_at timestamptz := coalesce(nullif(input ->> 'run_at', '')::timestamptz, now());
  v_dry_run boolean := coalesce((input ->> 'dry_run')::boolean, false);
  v_created int := 0;
  v_existing int := 0;
  v_evaluated int := 0;
  v_local_date date;
  r record;
begin
  if auth.role() <> 'service_role' then
    return private.api_error('forbidden', 'Service role is required.', 'none');
  end if;

  for r in
    select hm.id as membership_id, hm.habit_id, hm.user_id, ms.planned_weekdays, ms.timezone
    from public.habit_memberships hm
    join public.membership_schedules ms on ms.habit_membership_id = hm.id
    join public.habits h on h.id = hm.habit_id
    where hm.membership_status = 'active'
      and h.status = 'active'
  loop
    v_local_date := ((v_run_at at time zone r.timezone)::date - 1);
    if extract(dow from v_local_date)::smallint = any(r.planned_weekdays) then
      v_evaluated := v_evaluated + 1;
      if exists (
        select 1
        from public.check_ins ci
        where ci.habit_membership_id = r.membership_id
          and ci.local_date = v_local_date
      ) then
        v_existing := v_existing + 1;
      elsif not v_dry_run then
        insert into public.check_ins (
          habit_id,
          habit_membership_id,
          user_id,
          local_date,
          local_week_start,
          local_timezone,
          status,
          source,
          locked_at
        )
        values (
          r.habit_id,
          r.membership_id,
          r.user_id,
          v_local_date,
          private.local_week_start(v_local_date),
          r.timezone,
          'missed',
          'system_day_end',
          now()
        )
        on conflict (habit_membership_id, local_date) do nothing;
        v_created := v_created + 1;
      else
        v_created := v_created + 1;
      end if;
    end if;
  end loop;

  return private.api_success(jsonb_build_object(
    'run_at', v_run_at,
    'dry_run', v_dry_run,
    'evaluated_membership_days', v_evaluated,
    'missed_created_count', v_created,
    'already_present_count', v_existing,
    'skipped_unplanned_count', 0,
    'results_sample', '[]'::jsonb
  ));
end;
$$;

create or replace function public.update_reminder_preferences(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform input;
  return private.api_error('validation_failed', 'update_reminder_preferences is reserved for the next backend pass.', 'none');
end;
$$;

create or replace function public.register_push_token(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(input ->> 'expo_push_token'), '');
  v_platform public.push_platform := nullif(input ->> 'platform', '')::public.push_platform;
  v_row public.device_push_tokens%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  if v_token is null then
    return private.api_error('push_token_invalid', 'Expo push token is required.', 'open_notification_settings');
  end if;

  perform private.ensure_profile(v_user_id);

  insert into public.device_push_tokens (user_id, expo_push_token, platform, enabled, last_seen_at)
  values (v_user_id, v_token, v_platform, true, now())
  on conflict (user_id, expo_push_token) do update
    set platform = excluded.platform,
        enabled = true,
        last_seen_at = now()
  returning * into v_row;

  return private.api_success(jsonb_build_object(
    'push_token_id', v_row.id,
    'platform', v_row.platform,
    'enabled', v_row.enabled,
    'last_seen_at', v_row.last_seen_at
  ));
exception
  when invalid_text_representation then
    return private.api_error('push_token_invalid', 'Platform is invalid.', 'open_notification_settings');
end;
$$;

create or replace function public.mark_notification_opened(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_notification_id uuid := nullif(input ->> 'notification_id', '')::uuid;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  update public.notifications
  set delivery_status = 'opened',
      opened_at = now()
  where id = v_notification_id
    and recipient_user_id = v_user_id;

  if not found then
    return private.api_error('not_found', 'Notification was not found.', 'refresh_view');
  end if;

  return private.api_success(jsonb_build_object('notification_id', v_notification_id, 'opened_at', now()));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'notification_id is invalid.', 'none');
end;
$$;

create or replace function public.send_nudge(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_recipient uuid := nullif(input ->> 'recipient_user_id', '')::uuid;
  v_reason public.nudge_reason := nullif(input ->> 'reason', '')::public.nudge_reason;
  v_variant public.nudge_message_variant := nullif(input ->> 'message_variant', '')::public.nudge_message_variant;
  v_local_date date := nullif(input ->> 'created_local_date', '')::date;
  v_recipient_count int;
  v_nudge public.nudges%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  if not private.is_same_shared_habit_member(v_habit_id, v_user_id)
     or not private.is_same_shared_habit_member(v_habit_id, v_recipient) then
    return private.api_error('forbidden', 'Nudges are limited to active members of the same shared habit.', 'none');
  end if;

  select count(*)::int
  into v_recipient_count
  from public.nudges
  where habit_id = v_habit_id
    and recipient_user_id = v_recipient
    and created_local_date = v_local_date;

  if v_recipient_count >= 3 then
    return private.api_error('nudge_recipient_limited', 'This member has reached the nudge limit for today.', 'refresh_view');
  end if;

  insert into public.nudges (
    habit_id,
    sender_user_id,
    recipient_user_id,
    reason,
    message_variant,
    created_local_date
  )
  values (v_habit_id, v_user_id, v_recipient, v_reason, v_variant, v_local_date)
  returning * into v_nudge;

  insert into public.notifications (
    recipient_user_id,
    type,
    channel,
    delivery_status,
    target_habit_id,
    target_nudge_id
  )
  values (v_recipient, 'nudge', 'push', 'queued', v_habit_id, v_nudge.id);

  return private.api_success(jsonb_build_object(
    'nudge_id', v_nudge.id,
    'state', 'sent',
    'delivery_status', v_nudge.delivery_status
  ));
exception
  when unique_violation then
    return private.api_error('nudge_sender_limited', 'You already nudged this member for this habit today.', 'refresh_view');
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported UUID, enum, or date value.', 'none');
end;
$$;

create or replace function public.send_reaction(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_check_in_id uuid := nullif(input ->> 'check_in_id', '')::uuid;
  v_reaction_type public.reaction_type := nullif(input ->> 'reaction_type', '')::public.reaction_type;
  v_check_in public.check_ins%rowtype;
  v_reaction public.reactions%rowtype;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'Login is required.', 'login');
  end if;

  select *
  into v_check_in
  from public.check_ins
  where id = v_check_in_id
    and status = 'completed';

  if v_check_in.id is null
     or v_check_in.user_id = v_user_id
     or not private.is_same_shared_habit_member(v_check_in.habit_id, v_user_id) then
    return private.api_error('reaction_not_allowed', 'Reaction target is not allowed.', 'refresh_view');
  end if;

  insert into public.reactions (habit_id, check_in_id, sender_user_id, reaction_type)
  values (v_check_in.habit_id, v_check_in.id, v_user_id, v_reaction_type)
  on conflict (sender_user_id, check_in_id) do update
    set reaction_type = excluded.reaction_type
  returning * into v_reaction;

  insert into public.notifications (
    recipient_user_id,
    type,
    channel,
    delivery_status,
    target_habit_id,
    target_check_in_id,
    target_reaction_id
  )
  values (v_check_in.user_id, 'reaction', 'push', 'queued', v_check_in.habit_id, v_check_in.id, v_reaction.id);

  return private.api_success(jsonb_build_object(
    'reaction_id', v_reaction.id,
    'reaction_type', v_reaction.reaction_type,
    'created_at', v_reaction.created_at
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an unsupported UUID or enum value.', 'none');
end;
$$;

create or replace function public.get_weekly_view(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform input;
  return private.api_error('validation_failed', 'get_weekly_view is reserved for the next backend pass.', 'none');
end;
$$;

create or replace function public.get_calendar_view(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform input;
  return private.api_error('validation_failed', 'get_calendar_view is reserved for the next backend pass.', 'none');
end;
$$;

create or replace function public.get_shared_habit_detail(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform input;
  return private.api_error('validation_failed', 'get_shared_habit_detail is reserved for the next backend pass.', 'none');
end;
$$;

create or replace function public.dispatch_notifications(input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    return private.api_error('forbidden', 'Service role is required.', 'none');
  end if;

  return private.api_success(jsonb_build_object(
    'run_at', coalesce(nullif(input ->> 'run_at', '')::timestamptz, now()),
    'dry_run', coalesce((input ->> 'dry_run')::boolean, false),
    'queued_count', 0,
    'sent_count', 0,
    'in_app_only_count', 0,
    'failed_count', 0,
    'cancelled_count', 0,
    'results', '[]'::jsonb
  ));
end;
$$;

create or replace function public.track_server_event(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    return private.api_error('forbidden', 'Service role is required.', 'none');
  end if;

  return private.api_success(jsonb_build_object(
    'accepted', true,
    'event_name', input ->> 'event_name',
    'idempotent_replay', false
  ));
end;
$$;

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_memberships enable row level security;
alter table public.membership_schedules enable row level security;
alter table public.membership_target_history enable row level security;
alter table public.check_ins enable row level security;
alter table public.invites enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.nudges enable row level security;
alter table public.reactions enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy habits_select_member
  on public.habits
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1
      from public.habit_memberships hm
      where hm.habit_id = habits.id
        and hm.user_id = (select auth.uid())
        and hm.membership_status = 'active'
    )
  );

create policy habit_memberships_select_own
  on public.habit_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy membership_schedules_select_own
  on public.membership_schedules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.habit_memberships hm
      where hm.id = membership_schedules.habit_membership_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy membership_target_history_select_own
  on public.membership_target_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.habit_memberships hm
      where hm.id = membership_target_history.habit_membership_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy check_ins_select_own_or_same_shared_habit
  on public.check_ins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_same_shared_habit_member(habit_id, (select auth.uid()))
  );

create policy invites_select_owner
  on public.invites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.habits h
      where h.id = invites.habit_id
        and h.owner_user_id = (select auth.uid())
    )
  );

create policy reminder_preferences_select_own
  on public.reminder_preferences
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.habit_memberships hm
      where hm.id = reminder_preferences.habit_membership_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy device_push_tokens_select_own
  on public.device_push_tokens
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy nudges_select_involved_or_same_shared_habit
  on public.nudges
  for select
  to authenticated
  using (
    sender_user_id = (select auth.uid())
    or recipient_user_id = (select auth.uid())
    or private.is_same_shared_habit_member(habit_id, (select auth.uid()))
  );

create policy reactions_select_same_shared_habit
  on public.reactions
  for select
  to authenticated
  using (private.is_same_shared_habit_member(habit_id, (select auth.uid())));

grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.profiles,
  public.habits,
  public.habit_memberships,
  public.membership_schedules,
  public.membership_target_history,
  public.check_ins,
  public.invites,
  public.reminder_preferences,
  public.device_push_tokens,
  public.notifications,
  public.nudges,
  public.reactions
to authenticated;

grant insert, update on public.profiles to authenticated;

grant all privileges on
  public.profiles,
  public.habits,
  public.habit_memberships,
  public.membership_schedules,
  public.membership_target_history,
  public.check_ins,
  public.invites,
  public.reminder_preferences,
  public.device_push_tokens,
  public.notifications,
  public.nudges,
  public.reactions
to service_role;

revoke all on
  public.profiles,
  public.habits,
  public.habit_memberships,
  public.membership_schedules,
  public.membership_target_history,
  public.check_ins,
  public.invites,
  public.reminder_preferences,
  public.device_push_tokens,
  public.notifications,
  public.nudges,
  public.reactions
from anon;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_invite_preview(jsonb) to anon, authenticated, service_role;
grant execute on function public.create_habit_with_membership(jsonb) to authenticated, service_role;
grant execute on function public.create_invite(jsonb) to authenticated, service_role;
grant execute on function public.revoke_invite(jsonb) to authenticated, service_role;
grant execute on function public.accept_invite(jsonb) to authenticated, service_role;
grant execute on function public.record_checkin(jsonb) to authenticated, service_role;
grant execute on function public.get_daily_view(jsonb) to authenticated, service_role;
grant execute on function public.schedule_target_change(jsonb) to authenticated, service_role;
grant execute on function public.update_reminder_preferences(jsonb) to authenticated, service_role;
grant execute on function public.register_push_token(jsonb) to authenticated, service_role;
grant execute on function public.mark_notification_opened(jsonb) to authenticated, service_role;
grant execute on function public.send_nudge(jsonb) to authenticated, service_role;
grant execute on function public.send_reaction(jsonb) to authenticated, service_role;
grant execute on function public.get_weekly_view(jsonb) to authenticated, service_role;
grant execute on function public.get_calendar_view(jsonb) to authenticated, service_role;
grant execute on function public.get_shared_habit_detail(jsonb) to authenticated, service_role;
grant execute on function public.apply_pending_targets(jsonb) to service_role;
grant execute on function public.mark_missed_checkins(jsonb) to service_role;
grant execute on function public.dispatch_notifications(jsonb) to service_role;
grant execute on function public.track_server_event(jsonb) to service_role;
