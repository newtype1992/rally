import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptInvite,
  createHabitWithMembership,
  createInvite,
  getCalendarView,
  getDailyView,
  getInvitePreview,
  getSharedHabitDetail,
  getWeeklyView,
  recordCheckin,
  scheduleTargetChange,
  updateReminderPreferences,
} from '@/lib/rally-api';
import { getDeviceTimeZone, isoDateInTimeZone, sundayWeekStart } from '@/lib/date';
import type {
  AcceptInviteRequest,
  CreateHabitWithMembershipRequest,
  CreateInviteRequest,
  GetCalendarViewRequest,
  GetSharedHabitDetailRequest,
  GetWeeklyViewRequest,
  RecordCheckinRequest,
  ScheduleTargetChangeRequest,
  UpdateReminderPreferencesRequest,
} from '@/types/rally';

export const queryKeys = {
  daily: (localDate: string, timezone: string) => ['daily', localDate, timezone] as const,
  invitePreview: (code: string) => ['invite-preview', code] as const,
  weekly: (localWeekStart: string, timezone: string) => ['weekly', localWeekStart, timezone] as const,
  calendar: (rangeStart: string, rangeEnd: string, timezone: string) =>
    ['calendar', rangeStart, rangeEnd, timezone] as const,
  sharedHabit: (habitId: string, localWeekStart: string, localDate: string, timezone: string) =>
    ['shared-habit', habitId, localWeekStart, localDate, timezone] as const,
};

export function useTodayContext() {
  const timezone = getDeviceTimeZone();
  const localDate = isoDateInTimeZone(new Date(), timezone);
  const localWeekStart = sundayWeekStart(localDate);
  return { timezone, localDate, localWeekStart };
}

export function useDailyView(enabled = true) {
  const context = useTodayContext();
  return useQuery({
    queryKey: queryKeys.daily(context.localDate, context.timezone),
    queryFn: () =>
      getDailyView({
        local_date: context.localDate,
        timezone: context.timezone,
        include_shared_signals: true,
      }),
    enabled,
  });
}

export function useInvitePreview(inviteTokenOrCode: string | null) {
  return useQuery({
    queryKey: queryKeys.invitePreview(inviteTokenOrCode ?? ''),
    queryFn: () => getInvitePreview({ invite_token_or_code: inviteTokenOrCode ?? '' }),
    enabled: Boolean(inviteTokenOrCode),
  });
}

export function useWeeklyView(input: GetWeeklyViewRequest, enabled = true) {
  return useQuery({
    queryKey: queryKeys.weekly(input.local_week_start, input.timezone),
    queryFn: () => getWeeklyView(input),
    enabled,
    retry: false,
  });
}

export function useCalendarView(input: GetCalendarViewRequest, enabled = true) {
  return useQuery({
    queryKey: queryKeys.calendar(input.range_start, input.range_end, input.timezone),
    queryFn: () => getCalendarView(input),
    enabled,
    retry: false,
  });
}

export function useSharedHabitDetail(input: GetSharedHabitDetailRequest, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sharedHabit(
      input.habit_id,
      input.local_week_start,
      input.local_date,
      input.timezone,
    ),
    queryFn: () => getSharedHabitDetail(input),
    enabled,
    retry: false,
  });
}

export function useCreateHabitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitWithMembershipRequest) => createHabitWithMembership(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily'] }),
  });
}

export function useRecordCheckinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordCheckinRequest) => recordCheckin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily'] });
      queryClient.invalidateQueries({ queryKey: ['weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['shared-habit'] });
    },
  });
}

export function useCreateInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteRequest) => createInvite(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily'] }),
  });
}

export function useAcceptInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptInviteRequest) => acceptInvite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily'] });
      queryClient.invalidateQueries({ queryKey: ['invite-preview'] });
    },
  });
}

export function useScheduleTargetChangeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleTargetChangeRequest) => scheduleTargetChange(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily'] });
      queryClient.invalidateQueries({ queryKey: ['weekly'] });
      queryClient.invalidateQueries({ queryKey: ['shared-habit'] });
    },
  });
}

export function useUpdateReminderPreferencesMutation() {
  return useMutation({
    mutationFn: (input: UpdateReminderPreferencesRequest) => updateReminderPreferences(input),
    retry: false,
  });
}
