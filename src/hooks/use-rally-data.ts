import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getHabitDetail,
  getWeeklyProgress,
  listActiveHabits,
  markHabitDoneToday,
  RallyApiError,
  undoTodayCompletion,
} from '@/lib/rally-api';
import {
  archiveHabitCommand,
  createHabitCommand,
  deleteHabitCommand,
  markHabitDoneCommand,
  undoHabitCompletionCommand,
  type ActionContext,
  type ActionResult,
} from '@/lib/habit-commands';
import { invalidateHabitQueries } from '@/lib/habit-query-invalidation';
import { getDeviceTimeZone, isoDateInTimeZone, sundayWeekStart } from '@/lib/date';
import type { GetHabitDetailRequest } from '@/types/rally';

const commandTransport = { createHabit, markHabitDoneToday, undoTodayCompletion, archiveHabit, deleteHabit };

export const queryKeys = {
  habits: (today: string, weekStart: string) => ['habits', today, weekStart] as const,
  weeklyProgress: (today: string, weekStart: string) => ['weekly-progress', today, weekStart] as const,
  habitDetail: (habitId: string, today: string, weekStart: string) =>
    ['habit-detail', habitId, today, weekStart] as const,
};

export function useTodayContext() {
  const timezone = getDeviceTimeZone();
  const today = isoDateInTimeZone(new Date(), timezone);
  const weekStart = sundayWeekStart(today);
  return { timezone, today, weekStart };
}

export function useActiveHabits(enabled = true) {
  const context = useTodayContext();
  return useQuery({
    queryKey: queryKeys.habits(context.today, context.weekStart),
    queryFn: () => listActiveHabits({ today: context.today, week_start: context.weekStart }),
    enabled,
  });
}

export function useWeeklyProgress(enabled = true) {
  const context = useTodayContext();
  return useQuery({
    queryKey: queryKeys.weeklyProgress(context.today, context.weekStart),
    queryFn: () => getWeeklyProgress({ today: context.today, week_start: context.weekStart }),
    enabled,
  });
}

export function useHabitDetail(habitId: string | null, enabled = true) {
  const context = useTodayContext();
  return useQuery({
    queryKey: queryKeys.habitDetail(habitId ?? '', context.today, context.weekStart),
    queryFn: () =>
      getHabitDetail({
        habit_id: habitId ?? '',
        today: context.today,
        week_start: context.weekStart,
        recent_limit: 84,
      }),
    enabled: enabled && Boolean(habitId),
  });
}

export function useCreateHabitMutation() {
  const queryClient = useQueryClient();
  const context = useTodayContext();
  return useMutation({
    mutationFn: (input: { name: string; weeklyTarget: number }) =>
      unwrapAction(createHabitCommand(input, actionContext(context), commandTransport)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] });
    },
  });
}

export function useMarkHabitDoneMutation() {
  const queryClient = useQueryClient();
  const context = useTodayContext();
  return useMutation({
    mutationFn: (input: { habitId: string }) => unwrapAction(markHabitDoneCommand(input, actionContext(context), commandTransport)),
    onSuccess: (_data, variables) => invalidateHabitQueries(queryClient, variables.habitId),
  });
}

export function useUndoTodayCompletionMutation() {
  const queryClient = useQueryClient();
  const context = useTodayContext();
  return useMutation({
    mutationFn: (input: { habitId: string }) => unwrapAction(undoHabitCompletionCommand(input, actionContext(context), commandTransport)),
    onSuccess: (_data, variables) => invalidateHabitQueries(queryClient, variables.habitId),
  });
}

export function useArchiveHabitMutation() {
  const queryClient = useQueryClient();
  const context = useTodayContext();
  return useMutation({
    mutationFn: (input: { habitId: string; confirmation: 'explicit' }) =>
      unwrapAction(archiveHabitCommand(input, actionContext(context, input.confirmation), commandTransport)),
    onSuccess: (_data, variables) => invalidateHabitQueries(queryClient, variables.habitId),
  });
}

export function useDeleteHabitMutation() {
  const queryClient = useQueryClient();
  const context = useTodayContext();
  return useMutation({
    mutationFn: (input: { habitId: string; confirmation: 'explicit' }) =>
      unwrapAction(deleteHabitCommand(input, actionContext(context, input.confirmation), commandTransport)),
    onSuccess: (_data, variables) => invalidateHabitQueries(queryClient, variables.habitId),
  });
}

export function habitDetailInput(habitId: string): GetHabitDetailRequest {
  const timezone = getDeviceTimeZone();
  const today = isoDateInTimeZone(new Date(), timezone);
  return {
    habit_id: habitId,
    today,
    week_start: sundayWeekStart(today),
    recent_limit: 84,
  };
}

function actionContext(
  context: ReturnType<typeof useTodayContext>,
  confirmation?: 'explicit',
): ActionContext {
  return { source: 'ui', localDate: context.today, timeZone: context.timezone, confirmation };
}

async function unwrapAction<T>(resultPromise: Promise<ActionResult<T>>) {
  const result = await resultPromise;
  if (!result.ok) throw new RallyApiError(result.error);
  return result;
}
