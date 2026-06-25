import type {
  ApiError,
  ArchiveHabitRequest,
  ArchiveHabitResponse,
  CreateHabitRequest,
  CreateHabitResponse,
  DeleteHabitRequest,
  DeleteHabitResponse,
  HabitSummary,
  LocalDate,
  MarkHabitDoneTodayResponse,
  MarkHabitDoneTodayRequest,
  UndoTodayCompletionRequest,
  UndoTodayCompletionResponse,
  Uuid,
} from '../types/rally';

export type InvocationSource = 'ui' | 'system';

export type ActionContext = {
  source: InvocationSource;
  localDate: LocalDate;
  timeZone: string;
  confirmation?: 'explicit';
};

export type ActionResult<T> =
  | { ok: true; data: T; outcome: string }
  | { ok: false; error: ApiError };

export type HabitCommandTransport = {
  createHabit(input: CreateHabitRequest): Promise<CreateHabitResponse>;
  markHabitDoneToday(input: MarkHabitDoneTodayRequest): Promise<MarkHabitDoneTodayResponse>;
  undoTodayCompletion(input: UndoTodayCompletionRequest): Promise<UndoTodayCompletionResponse>;
  archiveHabit(input: ArchiveHabitRequest): Promise<ArchiveHabitResponse>;
  deleteHabit(input: DeleteHabitRequest): Promise<DeleteHabitResponse>;
};

export async function createHabitCommand(
  input: { name: string; weeklyTarget: number },
  context: ActionContext,
  transport: HabitCommandTransport,
): Promise<ActionResult<CreateHabitResponse>> {
  const contextError = validateContext(context);
  if (contextError) return contextError;
  if (context.source === 'system') {
    return failure('forbidden', 'Habit creation is available only in the main app.', false, 'none');
  }
  return execute(() => transport.createHabit({ name: input.name, weekly_target: input.weeklyTarget }), 'created');
}

export async function markHabitDoneCommand(
  input: { habitId: Uuid },
  context: ActionContext,
  transport: HabitCommandTransport,
): Promise<ActionResult<MarkHabitDoneTodayResponse>> {
  const contextError = validateContext(context);
  if (contextError) return contextError;
  return execute(
    () => transport.markHabitDoneToday({ habit_id: input.habitId, completion_date: context.localDate }),
    'completed',
  );
}

export async function undoHabitCompletionCommand(
  input: { habitId: Uuid },
  context: ActionContext,
  transport: HabitCommandTransport,
): Promise<ActionResult<UndoTodayCompletionResponse>> {
  const contextError = validateContext(context);
  if (contextError) return contextError;
  return execute(
    () => transport.undoTodayCompletion({ habit_id: input.habitId, completion_date: context.localDate }),
    'removed',
  );
}

export async function archiveHabitCommand(
  input: { habitId: Uuid },
  context: ActionContext,
  transport: HabitCommandTransport,
): Promise<ActionResult<ArchiveHabitResponse>> {
  const contextError = validateContext(context);
  if (contextError) return contextError;
  const confirmationError = requireExplicitConfirmation(context);
  if (confirmationError) return confirmationError;
  return execute(() => transport.archiveHabit({ habit_id: input.habitId }), 'archived');
}

export async function deleteHabitCommand(
  input: { habitId: Uuid },
  context: ActionContext,
  transport: HabitCommandTransport,
): Promise<ActionResult<DeleteHabitResponse>> {
  const contextError = validateContext(context);
  if (contextError) return contextError;
  const confirmationError = requireExplicitConfirmation(context);
  if (confirmationError) return confirmationError;
  return execute(() => transport.deleteHabit({ habit_id: input.habitId }), 'deleted');
}

export type SystemHabitProjection = Readonly<{ id: Uuid }>;

export function projectHabitForSystem(habit: HabitSummary): SystemHabitProjection {
  return { id: habit.habit_id };
}

async function execute<T>(operation: () => Promise<T>, fallbackOutcome: string): Promise<ActionResult<T>> {
  try {
    const data = await operation();
    return { ok: true, data, outcome: hasOutcome(data) ? data.outcome ?? fallbackOutcome : fallbackOutcome };
  } catch (error) {
    if (hasApiError(error)) return { ok: false, error: error.error };
    return failure('offline_unavailable', error instanceof Error ? error.message : 'The action could not be completed.', true, 'retry');
  }
}

function hasOutcome(data: unknown): data is { outcome?: string } {
  return Boolean(data && typeof data === 'object' && 'outcome' in data);
}

function hasApiError(error: unknown): error is { error: ApiError } {
  return Boolean(error && typeof error === 'object' && 'error' in error);
}

function validateContext(context: ActionContext): ActionResult<never> | null {
  if (!context.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(context.localDate)) {
    return failure('validation_failed', 'A valid local date is required.', false, 'none', 'localDate');
  }
  if (!context.timeZone?.trim()) {
    return failure('validation_failed', 'A time zone is required.', false, 'none', 'timeZone');
  }
  return null;
}

function requireExplicitConfirmation(context: ActionContext): ActionResult<never> | null {
  return context.confirmation === 'explicit'
    ? null
    : failure('validation_failed', 'Explicit confirmation is required.', false, 'none', 'confirmation');
}

function failure(
  code: ApiError['code'],
  message: string,
  retryable: boolean,
  recovery: NonNullable<ApiError['recovery']>,
  field?: string,
): ActionResult<never> {
  return { ok: false, error: { code, message, retryable, recovery, field } };
}
