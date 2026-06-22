export type Uuid = string;
export type ISODate = string;
export type LocalDate = ISODate;
export type SundayWeekStart = ISODate;
export type Timestamp = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HabitStatus = 'active' | 'archived' | 'deleted';

export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'habit_inactive'
  | 'completion_duplicate'
  | 'completion_not_found'
  | 'conflict'
  | 'server_error'
  | 'offline_unavailable';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
  recovery?: 'login' | 'retry' | 'refresh' | 'none';
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      request_id: string;
      server_time: Timestamp;
    }
  | {
      ok: false;
      error: ApiError;
      request_id: string;
      server_time: Timestamp;
    };

export type HabitSummary = {
  habit_id: Uuid;
  name: string;
  weekly_target: number;
  completed_this_week: number;
  progress_percentage: number;
  done_today: boolean;
  today_completion_id: Uuid | null;
};

export type AllTimeProgress = {
  total_completions: number;
  current_streak: number;
  best_streak: number;
  active_days: number;
};

export type HabitDetail = HabitSummary & {
  status: HabitStatus;
  recent_completion_dates: ISODate[];
  all_completion_dates: ISODate[];
  all_time_progress: AllTimeProgress;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CreateHabitRequest = {
  name: string;
  weekly_target: number;
};

export type CreateHabitResponse = {
  habit: HabitSummary;
};

export type ListActiveHabitsRequest = {
  today: ISODate;
  week_start: ISODate;
};

export type ListActiveHabitsResponse = {
  habits: HabitSummary[];
};

export type MarkHabitDoneTodayRequest = {
  habit_id: Uuid;
  completion_date: ISODate;
};

export type MarkHabitDoneTodayResponse = {
  habit: HabitSummary;
};

export type UndoTodayCompletionRequest = {
  habit_id: Uuid;
  completion_date: ISODate;
};

export type UndoTodayCompletionResponse = {
  habit: HabitSummary;
};

export type GetWeeklyProgressRequest = {
  week_start: ISODate;
  today: ISODate;
};

export type GetWeeklyProgressResponse = {
  habits: HabitSummary[];
};

export type GetHabitDetailRequest = {
  habit_id: Uuid;
  today: ISODate;
  week_start: ISODate;
  recent_limit?: number;
};

export type GetHabitDetailResponse = {
  habit: HabitDetail;
};

export type ArchiveHabitRequest = {
  habit_id: Uuid;
};

export type ArchiveHabitResponse = {
  habit_id: Uuid;
  status: 'archived';
};

export type DeleteHabitRequest = {
  habit_id: Uuid;
};

export type DeleteHabitResponse = {
  habit_id: Uuid;
  status: 'deleted';
};
