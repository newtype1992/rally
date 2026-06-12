import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  ApiError,
  ApiResult,
  CreateHabitWithMembershipRequest,
  CreateHabitWithMembershipResponse,
  CreateInviteRequest,
  CreateInviteResponse,
  GetCalendarViewRequest,
  GetCalendarViewResponse,
  GetDailyViewRequest,
  GetDailyViewResponse,
  GetInvitePreviewRequest,
  GetInvitePreviewResponse,
  GetSharedHabitDetailRequest,
  GetSharedHabitDetailResponse,
  GetWeeklyViewRequest,
  GetWeeklyViewResponse,
  MarkNotificationOpenedRequest,
  MarkNotificationOpenedResponse,
  RecordCheckinRequest,
  RecordCheckinResponse,
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
  RevokeInviteRequest,
  RevokeInviteResponse,
  ScheduleTargetChangeRequest,
  ScheduleTargetChangeResponse,
  SendNudgeRequest,
  SendNudgeResponse,
  SendReactionRequest,
  SendReactionResponse,
  UpdateReminderPreferencesRequest,
  UpdateReminderPreferencesResponse,
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

export function isBackendGap(error: unknown) {
  return (
    error instanceof RallyApiError &&
    error.error.code === 'validation_failed' &&
    error.error.message.includes('reserved for the next backend pass')
  );
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

type LegacyInvitePreview = {
  invite_resolution: GetInvitePreviewResponse['invite_resolution'];
  habit_name?: string | null;
  inviter_display_name?: string | null;
  inviter_initials?: string | null;
  active_member_count?: number | null;
  member_limit?: number | null;
  privacy_summary?: string | null;
  auth_required?: boolean;
  habit_id?: string | null;
  membership_id?: string | null;
  habit_preview?: GetInvitePreviewResponse['habit_preview'];
  authenticated_context?: GetInvitePreviewResponse['authenticated_context'];
};

function normalizeInvitePreview(data: LegacyInvitePreview): GetInvitePreviewResponse {
  if (data.habit_preview) {
    return data as GetInvitePreviewResponse;
  }
  return {
    invite_resolution: data.invite_resolution,
    auth_required: data.auth_required ?? true,
    habit_preview: {
      habit_name: data.habit_name ?? null,
      inviter_display_name: data.inviter_display_name ?? null,
      inviter_initials: data.inviter_initials ?? null,
      active_member_count: data.active_member_count ?? null,
      member_limit: data.member_limit ?? null,
      privacy_summary: data.privacy_summary ?? null,
    },
    authenticated_context: {
      already_joined: data.invite_resolution === 'already_joined',
      existing_habit_id: data.habit_id ?? null,
      existing_membership_id: data.membership_id ?? null,
    },
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throwAuthError(error);
  }
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
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

export function createHabitWithMembership(input: CreateHabitWithMembershipRequest) {
  return rpc<CreateHabitWithMembershipResponse>('create_habit_with_membership', input);
}

export function getDailyView(input: GetDailyViewRequest) {
  return rpc<GetDailyViewResponse>('get_daily_view', input);
}

export function recordCheckin(input: RecordCheckinRequest) {
  return rpc<RecordCheckinResponse>('record_checkin', input);
}

export function createInvite(input: CreateInviteRequest) {
  return rpc<CreateInviteResponse>('create_invite', input);
}

export function revokeInvite(input: RevokeInviteRequest) {
  return rpc<RevokeInviteResponse>('revoke_invite', input);
}

export async function getInvitePreview(input: GetInvitePreviewRequest) {
  const response = await rpc<LegacyInvitePreview>('get_invite_preview', input);
  return normalizeInvitePreview(response);
}

export function acceptInvite(input: AcceptInviteRequest) {
  return rpc<AcceptInviteResponse>('accept_invite', input);
}

export function scheduleTargetChange(input: ScheduleTargetChangeRequest) {
  return rpc<ScheduleTargetChangeResponse>('schedule_target_change', input);
}

export function updateReminderPreferences(input: UpdateReminderPreferencesRequest) {
  return rpc<UpdateReminderPreferencesResponse>('update_reminder_preferences', input);
}

export function registerPushToken(input: RegisterPushTokenRequest) {
  return rpc<RegisterPushTokenResponse>('register_push_token', input);
}

export function markNotificationOpened(input: MarkNotificationOpenedRequest) {
  return rpc<MarkNotificationOpenedResponse>('mark_notification_opened', input);
}

export function sendNudge(input: SendNudgeRequest) {
  return rpc<SendNudgeResponse>('send_nudge', input);
}

export function sendReaction(input: SendReactionRequest) {
  return rpc<SendReactionResponse>('send_reaction', input);
}

export function getWeeklyView(input: GetWeeklyViewRequest) {
  return rpc<GetWeeklyViewResponse>('get_weekly_view', input);
}

export function getCalendarView(input: GetCalendarViewRequest) {
  return rpc<GetCalendarViewResponse>('get_calendar_view', input);
}

export function getSharedHabitDetail(input: GetSharedHabitDetailRequest) {
  return rpc<GetSharedHabitDetailResponse>('get_shared_habit_detail', input);
}
