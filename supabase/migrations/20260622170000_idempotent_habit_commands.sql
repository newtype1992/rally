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
  v_inserted boolean;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  if v_habit_id is null or v_completion_date is null then
    return private.api_error('validation_failed', 'habit_id and completion_date are required.', 'none');
  end if;

  select status into v_status from public.habits where id = v_habit_id and user_id = v_user_id;
  if v_status is null then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;
  if v_status <> 'active' then
    return private.api_error('habit_inactive', 'This habit is no longer active.', 'none');
  end if;

  insert into public.habit_completions (habit_id, user_id, completion_date)
  values (v_habit_id, v_user_id, v_completion_date)
  on conflict (habit_id, completion_date) do nothing
  returning true into v_inserted;

  v_week_start := v_completion_date - extract(dow from v_completion_date)::int;
  return private.api_success(jsonb_build_object(
    'habit', private.habit_summary(v_habit_id, v_completion_date, v_week_start),
    'outcome', case when coalesce(v_inserted, false) then 'completed' else 'already_complete' end
  ));
exception
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
  v_deleted_count int;
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
  where habit_id = v_habit_id and user_id = v_user_id and completion_date = v_completion_date;
  get diagnostics v_deleted_count = row_count;

  v_week_start := v_completion_date - extract(dow from v_completion_date)::int;
  return private.api_success(jsonb_build_object(
    'habit', private.habit_summary(v_habit_id, v_completion_date, v_week_start),
    'outcome', case when v_deleted_count > 0 then 'removed' else 'already_absent' end
  ));
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
  v_status text;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  select status into v_status from public.habits where id = v_habit_id and user_id = v_user_id;
  if v_status is null or v_status = 'deleted' then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;
  if v_status = 'active' then
    update public.habits set status = 'archived', archived_at = now() where id = v_habit_id;
  end if;
  return private.api_success(jsonb_build_object(
    'habit_id', v_habit_id,
    'status', 'archived',
    'outcome', case when v_status = 'archived' then 'already_archived' else 'archived' end
  ));
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
  v_status text;
begin
  if v_user_id is null then
    return private.api_error('unauthenticated', 'User must sign up or log in.', 'login');
  end if;
  select status into v_status from public.habits where id = v_habit_id and user_id = v_user_id;
  if v_status is null then
    return private.api_error('not_found', 'Habit was not found.', 'none');
  end if;
  if v_status <> 'deleted' then
    update public.habits set status = 'deleted', deleted_at = now() where id = v_habit_id;
  end if;
  return private.api_success(jsonb_build_object(
    'habit_id', v_habit_id,
    'status', 'deleted',
    'outcome', case when v_status = 'deleted' then 'already_deleted' else 'deleted' end
  ));
exception
  when invalid_text_representation then
    return private.api_error('validation_failed', 'habit_id is invalid.', 'none', false, 'habit_id');
end;
$$;
