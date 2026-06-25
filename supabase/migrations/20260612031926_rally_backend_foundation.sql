create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create or replace function private.api_success(p_data jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'data', p_data,
    'request_id', extensions.gen_random_uuid()::text,
    'server_time', now()
  );
$$;

create or replace function private.api_error(
  p_code text,
  p_message text,
  p_recovery text default 'none',
  p_retryable boolean default false,
  p_field text default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', false,
    'error', jsonb_strip_nulls(jsonb_build_object(
      'code', p_code,
      'message', p_message,
      'recovery', p_recovery,
      'retryable', p_retryable,
      'field', p_field
    )),
    'request_id', extensions.gen_random_uuid()::text,
    'server_time', now()
  );
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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_empty check (length(btrim(email)) > 0)
);

create table public.habits (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  weekly_target integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  deleted_at timestamptz null,
  constraint habits_name_not_empty check (length(btrim(name)) > 0),
  constraint habits_weekly_target_positive check (weekly_target > 0),
  constraint habits_status_valid check (status in ('active', 'archived', 'deleted')),
  constraint habits_archived_at_required check (status <> 'archived' or archived_at is not null),
  constraint habits_deleted_at_required check (status <> 'deleted' or deleted_at is not null)
);

create table public.habit_completions (
  id uuid primary key default extensions.gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  constraint habit_completions_unique_habit_date unique (habit_id, completion_date)
);

create index habits_user_status_idx on public.habits (user_id, status, created_at);
create index habit_completions_user_date_idx on public.habit_completions (user_id, completion_date desc);
create index habit_completions_habit_date_idx on public.habit_completions (habit_id, completion_date desc);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger habits_touch_updated_at
before update on public.habits
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, new.id::text),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.ensure_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  select u.id, coalesce(u.email, u.id::text), nullif(btrim(u.raw_user_meta_data ->> 'display_name'), '')
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do nothing;
end;
$$;

create or replace function private.validate_completion_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  select user_id, status
  into v_user_id, v_status
  from public.habits
  where id = new.habit_id;

  if v_user_id is null then
    raise exception 'habit not found' using errcode = '23503';
  end if;

  if v_status <> 'active' then
    raise exception 'habit inactive' using errcode = '23514';
  end if;

  if new.user_id is null then
    new.user_id := v_user_id;
  end if;

  if new.user_id <> v_user_id then
    raise exception 'completion user must match habit owner' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger habit_completions_validate_owner
before insert or update on public.habit_completions
for each row execute function private.validate_completion_owner();

create or replace function private.habit_summary(p_habit_id uuid, p_today date, p_week_start date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with habit_row as (
    select h.*
    from public.habits h
    where h.id = p_habit_id
  ),
  weekly as (
    select count(*)::int as completed_this_week
    from public.habit_completions hc
    where hc.habit_id = p_habit_id
      and hc.completion_date between p_week_start and p_week_start + 6
  ),
  today_row as (
    select hc.id
    from public.habit_completions hc
    where hc.habit_id = p_habit_id
      and hc.completion_date = p_today
    limit 1
  )
  select jsonb_build_object(
    'habit_id', h.id,
    'name', h.name,
    'weekly_target', h.weekly_target,
    'completed_this_week', coalesce(w.completed_this_week, 0),
    'progress_percentage', least(round((coalesce(w.completed_this_week, 0)::numeric / greatest(h.weekly_target, 1)) * 100), 100),
    'done_today', t.id is not null,
    'today_completion_id', t.id
  )
  from habit_row h
  cross join weekly w
  left join today_row t on true;
$$;

create or replace function private.all_time_progress(p_habit_id uuid, p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_created date;
  v_current int := 0;
  v_best int := 0;
  v_run int := 0;
  v_prev date := null;
  v_date date;
begin
  select count(*)::int
  into v_total
  from public.habit_completions
  where habit_id = p_habit_id;

  select created_at::date
  into v_created
  from public.habits
  where id = p_habit_id;

  v_date := p_today;
  loop
    exit when not exists (
      select 1 from public.habit_completions
      where habit_id = p_habit_id and completion_date = v_date
    );
    v_current := v_current + 1;
    v_date := v_date - 1;
  end loop;

  for v_date in
    select completion_date
    from public.habit_completions
    where habit_id = p_habit_id
    order by completion_date
  loop
    if v_prev is null or v_date = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    v_best := greatest(v_best, v_run);
    v_prev := v_date;
  end loop;

  return jsonb_build_object(
    'total_completions', coalesce(v_total, 0),
    'current_streak', v_current,
    'best_streak', v_best,
    'active_days', greatest(0, p_today - coalesce(v_created, p_today) + 1)
  );
end;
$$;

create or replace function private.habit_detail(p_habit_id uuid, p_today date, p_week_start date, p_recent_limit int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.habit_summary(h.id, p_today, p_week_start) || jsonb_build_object(
    'status', h.status,
    'recent_completion_dates', (
      select coalesce(jsonb_agg(hc.completion_date order by hc.completion_date desc), '[]'::jsonb)
      from (
        select completion_date
        from public.habit_completions
        where habit_id = h.id
        order by completion_date desc
        limit greatest(1, p_recent_limit)
      ) hc
    ),
    'all_completion_dates', (
      select coalesce(jsonb_agg(hc.completion_date order by hc.completion_date), '[]'::jsonb)
      from public.habit_completions hc
      where hc.habit_id = h.id
    ),
    'all_time_progress', private.all_time_progress(h.id, p_today),
    'created_at', h.created_at,
    'updated_at', h.updated_at
  )
  from public.habits h
  where h.id = p_habit_id;
$$;

create or replace function public.create_habit(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(btrim(input ->> 'name'), '');
  v_weekly_target int := nullif(input ->> 'weekly_target', '')::int;
  v_habit public.habits%rowtype;
  v_today date := current_date;
  v_week_start date := current_date - extract(dow from current_date)::int;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_name is null then
    return private.api_error('validation_failed', 'name is required.', 'none', false, 'name');
  end if;
  if v_weekly_target is null or v_weekly_target < 1 then
    return private.api_error('validation_failed', 'weekly_target must be a positive integer.', 'none', false, 'weekly_target');
  end if;

  perform private.ensure_profile(v_user_id);

  insert into public.habits (user_id, name, weekly_target)
  values (v_user_id, v_name, v_weekly_target)
  returning * into v_habit;

  return private.api_success(jsonb_build_object('habit', private.habit_summary(v_habit.id, v_today, v_week_start)));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'weekly_target is invalid.', 'none', false, 'weekly_target');
end;
$$;

create or replace function public.list_active_habits(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := nullif(input ->> 'today', '')::date;
  v_week_start date := nullif(input ->> 'week_start', '')::date;
  v_habits jsonb;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_today is null or v_week_start is null then
    return private.api_error('validation_failed', 'today and week_start are required.', 'none');
  end if;

  perform private.ensure_profile(v_user_id);

  select coalesce(jsonb_agg(private.habit_summary(h.id, v_today, v_week_start) order by h.created_at), '[]'::jsonb)
  into v_habits
  from public.habits h
  where h.user_id = v_user_id
    and h.status = 'active';

  return private.api_success(jsonb_build_object('habits', v_habits));
exception
  when invalid_datetime_format then
    return private.api_error('validation_failed', 'Request contains an invalid date.', 'none');
end;
$$;

create or replace function public.mark_habit_done_today(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_completion_date date := nullif(input ->> 'completion_date', '')::date;
  v_week_start date;
  v_status text;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_habit_id is null or v_completion_date is null then
    return private.api_error('validation_failed', 'habit_id and completion_date are required.', 'none');
  end if;

  select status into v_status
  from public.habits
  where id = v_habit_id and user_id = v_user_id;

  if v_status is null then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;
  if v_status <> 'active' then
    return private.api_error('habit_inactive', 'This habit is no longer active.', 'none');
  end if;

  insert into public.habit_completions (habit_id, user_id, completion_date)
  values (v_habit_id, v_user_id, v_completion_date);

  v_week_start := v_completion_date - extract(dow from v_completion_date)::int;
  return private.api_success(jsonb_build_object('habit', private.habit_summary(v_habit_id, v_completion_date, v_week_start)));
exception
  when unique_violation then
    return private.api_error('completion_duplicate', 'This habit is already done today.', 'none');
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an invalid UUID or date.', 'none');
end;
$$;

create or replace function public.undo_today_completion(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_completion_date date := nullif(input ->> 'completion_date', '')::date;
  v_week_start date;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_habit_id is null or v_completion_date is null then
    return private.api_error('validation_failed', 'habit_id and completion_date are required.', 'none');
  end if;

  if not exists (select 1 from public.habits where id = v_habit_id and user_id = v_user_id) then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;

  delete from public.habit_completions
  where habit_id = v_habit_id
    and user_id = v_user_id
    and completion_date = v_completion_date;

  if not found then
    return private.api_error('completion_not_found', 'No completion exists for today.', 'none');
  end if;

  v_week_start := v_completion_date - extract(dow from v_completion_date)::int;
  return private.api_success(jsonb_build_object('habit', private.habit_summary(v_habit_id, v_completion_date, v_week_start)));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an invalid UUID or date.', 'none');
end;
$$;

create or replace function public.get_weekly_progress(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := nullif(input ->> 'today', '')::date;
  v_week_start date := nullif(input ->> 'week_start', '')::date;
  v_habits jsonb;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_today is null or v_week_start is null then
    return private.api_error('validation_failed', 'today and week_start are required.', 'none');
  end if;

  select coalesce(jsonb_agg(private.habit_summary(h.id, v_today, v_week_start) order by h.created_at), '[]'::jsonb)
  into v_habits
  from public.habits h
  where h.user_id = v_user_id
    and h.status = 'active';

  return private.api_success(jsonb_build_object('habits', v_habits));
exception
  when invalid_datetime_format then
    return private.api_error('validation_failed', 'Request contains an invalid date.', 'none');
end;
$$;

create or replace function public.get_habit_detail(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
  v_today date := nullif(input ->> 'today', '')::date;
  v_week_start date := nullif(input ->> 'week_start', '')::date;
  v_recent_limit int := coalesce(nullif(input ->> 'recent_limit', '')::int, 84);
  v_habit jsonb;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_habit_id is null or v_today is null or v_week_start is null then
    return private.api_error('validation_failed', 'habit_id, today, and week_start are required.', 'none');
  end if;
  if not exists (select 1 from public.habits where id = v_habit_id and user_id = v_user_id) then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;

  select private.habit_detail(v_habit_id, v_today, v_week_start, v_recent_limit)
  into v_habit;

  return private.api_success(jsonb_build_object('habit', v_habit));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'Request contains an invalid UUID or date.', 'none');
end;
$$;

create or replace function public.archive_habit(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;

  update public.habits
  set status = 'archived',
      archived_at = now()
  where id = v_habit_id
    and user_id = v_user_id
    and status = 'active';

  if not found then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;

  return private.api_success(jsonb_build_object('habit_id', v_habit_id, 'status', 'archived'));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'habit_id is invalid.', 'none', false, 'habit_id');
end;
$$;

create or replace function public.delete_habit(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid := nullif(input ->> 'habit_id', '')::uuid;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;

  update public.habits
  set status = 'deleted',
      deleted_at = now()
  where id = v_habit_id
    and user_id = v_user_id
    and status <> 'deleted';

  if not found then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;

  return private.api_success(jsonb_build_object('habit_id', v_habit_id, 'status', 'deleted'));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'habit_id is invalid.', 'none', false, 'habit_id');
end;
$$;

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy habits_select_own on public.habits
for select to authenticated
using ((select auth.uid()) = user_id);

create policy habit_completions_select_own on public.habit_completions
for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles, public.habits, public.habit_completions to authenticated;
grant update on public.profiles to authenticated;
grant all privileges on public.profiles, public.habits, public.habit_completions to service_role;

revoke all on public.profiles, public.habits, public.habit_completions from anon;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.create_habit(jsonb) to authenticated, service_role;
grant execute on function public.list_active_habits(jsonb) to authenticated, service_role;
grant execute on function public.mark_habit_done_today(jsonb) to authenticated, service_role;
grant execute on function public.undo_today_completion(jsonb) to authenticated, service_role;
grant execute on function public.get_weekly_progress(jsonb) to authenticated, service_role;
grant execute on function public.get_habit_detail(jsonb) to authenticated, service_role;
grant execute on function public.archive_habit(jsonb) to authenticated, service_role;
grant execute on function public.delete_habit(jsonb) to authenticated, service_role;
