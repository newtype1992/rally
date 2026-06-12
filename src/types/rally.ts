export type Uuid = string;
export type IsoDateTime = string;
export type LocalDate = string;
export type SundayWeekStart = string;
export type LocalTime = string;
export type IanaTimezone = string;
export type ClientRequestId = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HabitStatus = 'draft' | 'active' | 'archived';
export type HabitPrivacy = 'private' | 'shared';
export type MembershipRole = 'owner' | 'member';
export type MembershipStatus = 'pending_setup' | 'active' | 'left';
export type InviteStatus = 'active' | 'revoked' | 'expired' | 'closed';
export type InviteResolution =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'already_joined'
  | 'full'
  | 'accepted';
export type CheckInStatus = 'completed' | 'skipped' | 'missed';
export type CheckInSource = 'user_action' | 'offline_retry' | 'system_day_end';
export type NotificationPermissionStatus =
  | 'unknown'
  | 'not_requested'
  | 'granted'
  | 'denied'
  | 'disabled';
export type PushPlatform = 'ios' | 'android';
export type HabitDailyState =
  | 'upcoming'
  | 'due'
  | 'completed'
  | 'skipped'
  | 'missed'
  | 'pending_sync';
export type PaceState = 'not_started' | 'on_pace' | 'behind_pace' | 'complete';
export type NudgeReason = 'missed' | 'behind_pace';
export type NudgeMessageVariant =
  | 'you_have_time'
  | 'small_reset'
  | 'still_with_you'
  | 'next_one_counts';
export type NudgeActionState =
  | 'ready'
  | 'sender_limited'
  | 'recipient_limited'
  | 'not_eligible'
  | 'sent'
  | 'failed';
export type ReactionType = 'cheer' | 'high_five' | 'fire' | 'strong';

export type RecoveryAction =
  | 'login'
  | 'retry'
  | 'show_offline_queue'
  | 'request_new_invite'
  | 'open_existing_habit'
  | 'open_notification_settings'
  | 'refresh_view'
  | 'none';

export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'offline_unavailable'
  | 'invite_invalid'
  | 'invite_expired'
  | 'invite_revoked'
  | 'invite_full'
  | 'invite_already_joined'
  | 'checkin_duplicate'
  | 'checkin_locked_missed'
  | 'target_effective_date_invalid'
  | 'nudge_sender_limited'
  | 'nudge_recipient_limited'
  | 'reaction_not_allowed'
  | 'notification_permission_denied'
  | 'push_token_invalid';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
  recovery?: RecoveryAction;
  details?: Record<string, unknown>;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      request_id: string;
      server_time: IsoDateTime;
    }
  | {
      ok: false;
      error: ApiError;
      request_id: string;
      server_time: IsoDateTime;
    };

export type ProfileSummary = {
  user_id: Uuid;
  display_name: string;
  initials?: string;
  avatar_url?: string | null;
  notification_permission_status?: NotificationPermissionStatus;
};

export type HabitSummary = {
  habit_id: Uuid;
  name: string;
  privacy: HabitPrivacy;
  status: HabitStatus;
  owner_user_id?: Uuid;
  max_members: number;
  active_member_count: number;
};

export type MembershipSummary = {
  membership_id: Uuid;
  habit_id: Uuid;
  user_id: Uuid;
  role: MembershipRole;
  status: MembershipStatus;
  weekly_target: number;
  planned_weekdays: Weekday[];
  timezone: IanaTimezone;
  pending_weekly_target: number | null;
  pending_planned_weekdays: Weekday[] | null;
  pending_effective_week_start: SundayWeekStart | null;
};

export type ReminderPreferenceDto = {
  habit_membership_id: Uuid;
  reminders_enabled: boolean;
  nudge_notifications_enabled: boolean;
  missed_notifications_enabled: boolean;
  scheduled_reminder_time: LocalTime | null;
  notification_permission_status: NotificationPermissionStatus;
  timezone: IanaTimezone;
};

export type CheckInDto = {
  check_in_id: Uuid;
  habit_id: Uuid;
  habit_membership_id: Uuid;
  local_date: LocalDate;
  local_week_start: SundayWeekStart;
  local_timezone: IanaTimezone;
  status: CheckInStatus;
  source: CheckInSource;
  client_request_id: ClientRequestId | null;
  recorded_at: IsoDateTime;
  locked_at: IsoDateTime | null;
};

export type ProgressSummary = {
  local_week_start: SundayWeekStart;
  weekly_target: number;
  completed_count: number;
  skipped_count: number;
  missed_count: number;
  raw_percentage: number;
  capped_percentage: number;
  over_target_count: number;
  pace_state: PaceState;
};

export type NudgeEligibility = {
  state: NudgeActionState;
  reason: NudgeReason | null;
  sender_remaining_today: number;
  recipient_remaining_today: number;
  disabled_error_code: 'nudge_sender_limited' | 'nudge_recipient_limited' | 'forbidden' | null;
};

export type CreateHabitWithMembershipRequest = {
  client_request_id?: ClientRequestId;
  habit: {
    name: string;
    privacy?: HabitPrivacy;
    max_members?: number;
  };
  setup: {
    planned_weekdays: Weekday[];
    timezone: IanaTimezone;
    week_start_weekday?: 0;
  };
  reminders: {
    reminders_enabled: boolean;
    nudge_notifications_enabled?: boolean;
    missed_notifications_enabled?: boolean;
    scheduled_reminder_time: LocalTime | null;
    notification_permission_status: NotificationPermissionStatus;
  };
};

export type CreateHabitWithMembershipResponse = {
  habit: HabitSummary;
  membership: MembershipSummary;
  reminder_preferences: ReminderPreferenceDto;
  target_history: {
    effective_week_start: SundayWeekStart;
    weekly_target: number;
    planned_weekdays: Weekday[];
    source: 'habit_setup';
  };
  created_at: IsoDateTime;
};

export type GetDailyViewRequest = {
  local_date: LocalDate;
  timezone: IanaTimezone;
  include_shared_signals?: boolean;
};

export type DailyHabitRow = {
  habit: HabitSummary;
  membership: Pick<
    MembershipSummary,
    | 'membership_id'
    | 'role'
    | 'weekly_target'
    | 'planned_weekdays'
    | 'pending_weekly_target'
    | 'pending_effective_week_start'
  > & {
    pending_planned_weekdays?: Weekday[] | null;
  };
  today: {
    state: Exclude<HabitDailyState, 'pending_sync'>;
    planned_today: boolean;
    due_today: boolean;
    can_record_checkin: boolean;
    check_in: CheckInDto | null;
    disabled_error_code: ApiErrorCode | null;
  };
  week_progress: ProgressSummary;
  shared_signal: {
    active_member_count: number;
    peer_completed_today_count: number;
    peer_missed_today_count: number;
    peer_behind_pace_count: number;
    latest_peer_check_in: {
      check_in_id: Uuid;
      member: ProfileSummary;
      status: CheckInStatus;
      recorded_at: IsoDateTime;
    } | null;
  } | null;
};

export type GetDailyViewResponse = {
  local_date: LocalDate;
  local_week_start?: SundayWeekStart;
  timezone: IanaTimezone;
  profile: ProfileSummary;
  habits: DailyHabitRow[];
};

export type RecordCheckinRequest = {
  client_request_id: ClientRequestId;
  habit_id: Uuid;
  habit_membership_id: Uuid;
  local_date: LocalDate;
  local_week_start: SundayWeekStart;
  local_timezone: IanaTimezone;
  status: 'completed' | 'skipped';
  queued_at_client?: IsoDateTime;
};

export type RecordCheckinResponse = {
  check_in: CheckInDto;
  idempotent_replay: boolean;
  same_day_correction?: boolean;
  replaced_status?: 'completed' | 'skipped' | null;
  progress_after_write?: ProgressSummary;
};

export type CreateInviteRequest = {
  habit_id: Uuid;
  expires_in_days?: number;
  max_acceptances?: number;
};

export type CreateInviteResponse = {
  invite_id: Uuid;
  habit_id: Uuid;
  public_code: string;
  invite_token: string;
  invite_url: string;
  status: InviteStatus;
  resolution: 'valid';
  expires_at: IsoDateTime;
  max_acceptances: number;
  accepted_count: number;
  active_member_count: number;
  max_members: number;
};

export type RevokeInviteRequest = {
  invite_id?: Uuid;
  public_code?: string;
};

export type RevokeInviteResponse = {
  invite_id: Uuid;
  habit_id: Uuid;
  status: InviteStatus;
  revoked_at: IsoDateTime | null;
};

export type GetInvitePreviewRequest = {
  invite_token_or_code: string;
};

export type GetInvitePreviewResponse = {
  invite_resolution: InviteResolution;
  auth_required: boolean;
  habit_preview: {
    habit_name: string | null;
    inviter_display_name: string | null;
    inviter_initials?: string | null;
    active_member_count: number | null;
    member_limit: number | null;
    privacy_summary: string | null;
  };
  authenticated_context?: {
    already_joined: boolean;
    existing_habit_id: Uuid | null;
    existing_membership_id: Uuid | null;
  };
};

export type AcceptInviteRequest = {
  invite_token_or_code: string;
  client_request_id?: ClientRequestId;
  setup: {
    planned_weekdays: Weekday[];
    timezone: IanaTimezone;
    week_start_weekday?: 0;
  };
  reminders: {
    reminders_enabled: boolean;
    nudge_notifications_enabled: boolean;
    missed_notifications_enabled: boolean;
    scheduled_reminder_time: LocalTime | null;
    notification_permission_status: NotificationPermissionStatus;
  };
};

export type AcceptInviteResponse = {
  invite_resolution: 'accepted';
  invite_id: Uuid;
  habit: HabitSummary;
  membership: MembershipSummary;
  reminder_preferences: ReminderPreferenceDto;
  target_history: {
    effective_week_start: SundayWeekStart;
    weekly_target: number;
    planned_weekdays: Weekday[];
    source: 'invite_acceptance' | 'invite_rejoin';
  };
  rejoined: boolean;
  preserved_membership_id: Uuid | null;
};

export type ScheduleTargetChangeRequest = {
  habit_membership_id: Uuid;
  planned_weekdays: Weekday[];
  timezone: IanaTimezone;
  requested_effective_week_start?: SundayWeekStart;
};

export type ScheduleTargetChangeResponse = {
  habit_membership_id: Uuid;
  pending_weekly_target?: number;
  pending_planned_weekdays?: Weekday[];
  pending_effective_week_start?: SundayWeekStart;
  current_week?: {
    local_week_start: SundayWeekStart;
    weekly_target: number;
    planned_weekdays: Weekday[];
    progress: ProgressSummary;
  };
  pending?: {
    weekly_target: number;
    planned_weekdays: Weekday[];
    effective_week_start: SundayWeekStart;
  };
};

export type UpdateReminderPreferencesRequest = {
  habit_membership_id: Uuid;
  reminders_enabled: boolean;
  nudge_notifications_enabled: boolean;
  missed_notifications_enabled: boolean;
  scheduled_reminder_time: LocalTime | null;
  timezone: IanaTimezone;
  notification_permission_status: NotificationPermissionStatus;
};

export type UpdateReminderPreferencesResponse = {
  reminder_preferences: ReminderPreferenceDto;
  profile_notification_permission_status: NotificationPermissionStatus;
};

export type RegisterPushTokenRequest = {
  expo_push_token: string;
  platform: PushPlatform;
  device_id?: string;
  app_install_id?: string;
  notification_permission_status?: NotificationPermissionStatus;
};

export type RegisterPushTokenResponse = {
  device_push_token_id?: Uuid;
  push_token_id?: Uuid;
  platform: PushPlatform;
  enabled: boolean;
  last_seen_at: IsoDateTime;
  profile_notification_permission_status?: NotificationPermissionStatus;
};

export type MarkNotificationOpenedRequest = {
  notification_id: Uuid;
  opened_at_client?: IsoDateTime;
};

export type MarkNotificationOpenedResponse = {
  notification_id: Uuid;
  delivery_status?: 'opened';
  opened_at: IsoDateTime;
  route?: NotificationRoute;
};

export type NotificationRoute =
  | {
      kind: 'habit';
      habit_id: Uuid;
      habit_membership_id: Uuid | null;
    }
  | {
      kind: 'shared_habit';
      habit_id: Uuid;
    }
  | {
      kind: 'daily';
      unavailable_reason?: 'target_missing' | 'not_authorized' | 'habit_archived';
    };

export type SendNudgeRequest = {
  habit_id: Uuid;
  recipient_membership_id?: Uuid;
  recipient_user_id?: Uuid;
  reason: NudgeReason;
  message_variant: NudgeMessageVariant;
  created_local_date: LocalDate;
  timezone: IanaTimezone;
};

export type SendNudgeResponse = {
  nudge?: {
    nudge_id: Uuid;
    habit_id: Uuid;
    sender_user_id: Uuid;
    recipient_user_id: Uuid;
    reason: NudgeReason;
    message_variant: NudgeMessageVariant;
    created_local_date: LocalDate;
    delivery_status: string;
  };
  nudge_id?: Uuid;
  state?: NudgeActionState;
  delivery_status?: string;
  eligibility_after_write?: NudgeEligibility;
};

export type SendReactionRequest = {
  habit_id: Uuid;
  check_in_id: Uuid;
  reaction_type: ReactionType;
};

export type SendReactionResponse = {
  reaction?: {
    reaction_id: Uuid;
    habit_id: Uuid;
    check_in_id: Uuid;
    sender_user_id: Uuid;
    recipient_user_id: Uuid;
    reaction_type: ReactionType;
    created_at: IsoDateTime;
    updated_at: IsoDateTime;
  };
  reaction_id?: Uuid;
  reaction_type?: ReactionType;
  created_at?: IsoDateTime;
  replaced_reaction_type?: ReactionType | null;
};

export type GetWeeklyViewRequest = {
  local_week_start: SundayWeekStart;
  timezone: IanaTimezone;
};

export type WeeklyHabitRow = {
  habit: HabitSummary;
  membership_id: Uuid;
  own_progress: ProgressSummary;
  target_source: 'target_history' | 'current_membership_fallback';
  planned_weekdays: Weekday[];
  day_states: {
    local_date: LocalDate;
    weekday: Weekday;
    planned: boolean;
    state: 'scheduled' | 'completed' | 'skipped' | 'missed' | 'none';
    check_in_id: Uuid | null;
  }[];
  shared_comparison: {
    member_count: number;
    own_rank: number | null;
    leader_capped_percentage: number | null;
    peers_behind_pace_count: number;
  } | null;
};

export type GetWeeklyViewResponse = {
  local_week_start: SundayWeekStart;
  week_end: LocalDate;
  timezone: IanaTimezone;
  habits: WeeklyHabitRow[];
};

export type GetCalendarViewRequest = {
  range_start: LocalDate;
  range_end: LocalDate;
  timezone: IanaTimezone;
  selected_local_date?: LocalDate;
};

export type GetCalendarViewResponse = {
  range_start: LocalDate;
  range_end: LocalDate;
  timezone: IanaTimezone;
  days: {
    local_date: LocalDate;
    markers: {
      habit_id: Uuid;
      habit_membership_id: Uuid;
      privacy: HabitPrivacy;
      state: 'scheduled' | 'completed' | 'skipped' | 'missed';
    }[];
  }[];
  selected_day: {
    local_date: LocalDate;
    habits: {
      habit: HabitSummary;
      membership_id: Uuid;
      planned: boolean;
      state: 'scheduled' | 'completed' | 'skipped' | 'missed' | 'none';
      check_in: CheckInDto | null;
    }[];
  } | null;
};

export type SharedHabitMemberRow = {
  profile: ProfileSummary;
  membership: {
    membership_id: Uuid;
    role: MembershipRole;
    status: 'active';
    weekly_target: number;
    planned_weekdays: Weekday[];
    pending_weekly_target: number | null;
    pending_planned_weekdays: Weekday[] | null;
    pending_effective_week_start: SundayWeekStart | null;
  };
  progress: ProgressSummary & {
    rank: number;
  };
  today: {
    state: Exclude<HabitDailyState, 'pending_sync'>;
    check_in: CheckInDto | null;
  };
  upcoming_planned_weekdays: Weekday[];
  nudge_eligibility: NudgeEligibility;
  reaction_targets: {
    check_in_id: Uuid;
    local_date: LocalDate;
    available_reactions: ReactionType[];
    current_user_reaction: ReactionType | null;
  }[];
};

export type SharedHabitActivityItem =
  | {
      kind: 'check_in';
      check_in: CheckInDto;
      member: ProfileSummary;
      reactions: {
        reaction_id: Uuid;
        sender: ProfileSummary;
        reaction_type: ReactionType;
        created_at: IsoDateTime;
      }[];
    }
  | {
      kind: 'nudge';
      nudge_id: Uuid;
      sender: ProfileSummary;
      recipient: ProfileSummary;
      reason: NudgeReason;
      message_variant: NudgeMessageVariant;
      created_at: IsoDateTime;
    }
  | {
      kind: 'reaction';
      reaction_id: Uuid;
      sender: ProfileSummary;
      recipient: ProfileSummary;
      check_in_id: Uuid;
      reaction_type: ReactionType;
      created_at: IsoDateTime;
    };

export type GetSharedHabitDetailRequest = {
  habit_id: Uuid;
  local_week_start: SundayWeekStart;
  local_date: LocalDate;
  timezone: IanaTimezone;
};

export type GetSharedHabitDetailResponse = {
  habit: HabitSummary & {
    owner: ProfileSummary;
  };
  self_membership_id: Uuid;
  local_week_start: SundayWeekStart;
  local_date: LocalDate;
  members: SharedHabitMemberRow[];
  recent_activity: SharedHabitActivityItem[];
};

export type PendingCheckin = RecordCheckinRequest & {
  habit_name: string;
  privacy: HabitPrivacy;
};
