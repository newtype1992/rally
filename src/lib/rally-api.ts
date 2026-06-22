import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type {
  ApiError,
  ApiResult,
  ArchiveHabitRequest,
  ArchiveHabitResponse,
  CreateHabitRequest,
  CreateHabitResponse,
  DeleteHabitRequest,
  DeleteHabitResponse,
  GetHabitDetailRequest,
  GetHabitDetailResponse,
  GetWeeklyProgressRequest,
  GetWeeklyProgressResponse,
  ListActiveHabitsRequest,
  ListActiveHabitsResponse,
  MarkHabitDoneTodayRequest,
  MarkHabitDoneTodayResponse,
  UndoTodayCompletionRequest,
  UndoTodayCompletionResponse,
} from '@/types/rally';

export class RallyApiError extends Error {
  error: ApiError;
  result?: ApiResult<never>;

  constructor(error: ApiError, result?: ApiResult<never>) {
    super(error.message);
    this.name = 'RallyApiError';
    this.error = error;
    this.result = result;
  }
}

function transportError(message: string): ApiError {
  return {
    code: 'offline_unavailable',
    message,
    recovery: 'retry',
    retryable: true,
  };
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  return Boolean(value && typeof value === 'object' && 'ok' in value);
}

async function rpc<T>(name: string, input: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data, error } = await supabase.rpc(name, { input });
    if (error) {
      throw new RallyApiError(transportError(error.message));
    }
    if (!isApiResult<T>(data)) {
      throw new RallyApiError(transportError(`Unexpected response from ${name}.`));
    }
    if (!data.ok) {
      throw new RallyApiError(data.error, data as ApiResult<never>);
    }
    return data.data;
  } catch (error) {
    if (error instanceof RallyApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : `Unable to reach ${name}.`;
    throw new RallyApiError(transportError(message));
  }
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throwAuthError(error);
  }
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) {
    throwAuthError(error);
  }
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throwAuthError(error);
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throwAuthError(error);
  }
  return data.session;
}

function throwAuthError(error: AuthError): never {
  throw new RallyApiError({
    code: 'unauthenticated',
    message: error.message,
    recovery: 'login',
    retryable: false,
  });
}

export function createHabit(input: CreateHabitRequest) {
  return rpc<CreateHabitResponse>('create_habit', input);
}

export function listActiveHabits(input: ListActiveHabitsRequest) {
  return rpc<ListActiveHabitsResponse>('list_active_habits', input);
}

export function markHabitDoneToday(input: MarkHabitDoneTodayRequest) {
  return rpc<MarkHabitDoneTodayResponse>('mark_habit_done_today', input);
}

export function undoTodayCompletion(input: UndoTodayCompletionRequest) {
  return rpc<UndoTodayCompletionResponse>('undo_today_completion', input);
}

export function getWeeklyProgress(input: GetWeeklyProgressRequest) {
  return rpc<GetWeeklyProgressResponse>('get_weekly_progress', input);
}

export function getHabitDetail(input: GetHabitDetailRequest) {
  return rpc<GetHabitDetailResponse>('get_habit_detail', input);
}

export function archiveHabit(input: ArchiveHabitRequest) {
  return rpc<ArchiveHabitResponse>('archive_habit', input);
}

export function deleteHabit(input: DeleteHabitRequest) {
  return rpc<DeleteHabitResponse>('delete_habit', input);
}
