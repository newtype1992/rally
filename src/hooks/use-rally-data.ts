import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getHabitDetail,
  getWeeklyProgress,
  listActiveHabits,
  markHabitDoneToday,
  undoTodayCompletion,
} from '@/lib/rally-api';
import { getDeviceTimeZone, isoDateInTimeZone, sundayWeekStart } from '@/lib/date';
import type {
  ArchiveHabitRequest,
  CreateHabitRequest,
  DeleteHabitRequest,
  GetHabitDetailRequest,
  MarkHabitDoneTodayRequest,
  UndoTodayCompletionRequest,
} from '@/types/rally';

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
  return useMutation({
    mutationFn: (input: CreateHabitRequest) => createHabit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] });
    },
  });
}

export function useMarkHabitDoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkHabitDoneTodayRequest) => markHabitDoneToday(input),
    onSuccess: (_data, variables) => invalidateHabit(queryClient, variables.habit_id),
  });
}

export function useUndoTodayCompletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UndoTodayCompletionRequest) => undoTodayCompletion(input),
    onSuccess: (_data, variables) => invalidateHabit(queryClient, variables.habit_id),
  });
}

export function useArchiveHabitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArchiveHabitRequest) => archiveHabit(input),
    onSuccess: (_data, variables) => invalidateHabit(queryClient, variables.habit_id),
  });
}

export function useDeleteHabitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteHabitRequest) => deleteHabit(input),
    onSuccess: (_data, variables) => invalidateHabit(queryClient, variables.habit_id),
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

function invalidateHabit(queryClient: ReturnType<typeof useQueryClient>, habitId: string) {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
  queryClient.invalidateQueries({ queryKey: ['weekly-progress'] });
  queryClient.invalidateQueries({ queryKey: ['habit-detail', habitId] });
}
