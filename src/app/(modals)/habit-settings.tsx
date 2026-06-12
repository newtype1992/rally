import { Controller, useForm, useWatch } from 'react-hook-form';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import {
  BackendGapState,
  ErrorState,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
  SwitchRow,
  TextField,
  WeekdaySelector,
} from '@/components/rally/ui';
import { rallyColors } from '@/constants/rally';
import { getDeviceTimeZone } from '@/lib/date';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import { isBackendGap } from '@/lib/rally-api';
import {
  useScheduleTargetChangeMutation,
  useUpdateReminderPreferencesMutation,
} from '@/hooks/use-rally-data';
import type { Weekday } from '@/types/rally';

type SettingsForm = {
  plannedWeekdays: Weekday[];
  remindersEnabled: boolean;
  scheduledReminderTime: string;
};

const settingsSchema = z.object({
  plannedWeekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one day.'),
  remindersEnabled: z.boolean(),
  scheduledReminderTime: z.string(),
});

function parseWeekdays(value: string | undefined): Weekday[] {
  if (!value) {
    return [1, 3, 5];
  }
  const parsed = value
    .split(',')
    .map((item) => Number(item))
    .filter((item): item is Weekday => Number.isInteger(item) && item >= 0 && item <= 6);
  return parsed.length > 0 ? parsed : [1, 3, 5];
}

export default function HabitSettingsScreen() {
  const params = useLocalSearchParams<{
    membershipId?: string;
    habitName?: string;
    plannedWeekdays?: string;
  }>();
  const membershipId = typeof params.membershipId === 'string' ? params.membershipId : null;
  const habitName = typeof params.habitName === 'string' ? params.habitName : 'Habit';
  const scheduleTarget = useScheduleTargetChangeMutation();
  const reminderMutation = useUpdateReminderPreferencesMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({
    defaultValues: {
      plannedWeekdays: parseWeekdays(typeof params.plannedWeekdays === 'string' ? params.plannedWeekdays : undefined),
      remindersEnabled: false,
      scheduledReminderTime: '18:30',
    },
  });
  const remindersEnabled = useWatch({ control, name: 'remindersEnabled' });

  const saveTarget = handleSubmit(async (values) => {
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    if (!membershipId) {
      setApiError('Habit membership is missing.');
      return;
    }
    setApiError(null);
    setSavedMessage(null);
    try {
      const response = await scheduleTarget.mutateAsync({
        habit_membership_id: membershipId,
        planned_weekdays: parsed.data.plannedWeekdays as Weekday[],
        timezone: getDeviceTimeZone(),
      });
      setSavedMessage(`Next change scheduled for ${response.pending_effective_week_start ?? response.pending?.effective_week_start ?? 'next Sunday'}.`);
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  const saveReminders = handleSubmit(async (values) => {
    if (!membershipId) {
      setApiError('Habit membership is missing.');
      return;
    }
    setApiError(null);
    try {
      await reminderMutation.mutateAsync({
        habit_membership_id: membershipId,
        reminders_enabled: values.remindersEnabled,
        nudge_notifications_enabled: values.remindersEnabled,
        missed_notifications_enabled: values.remindersEnabled,
        scheduled_reminder_time: values.remindersEnabled ? values.scheduledReminderTime : null,
        timezone: getDeviceTimeZone(),
        notification_permission_status: 'not_requested',
      });
    } catch (error) {
      if (!isBackendGap(error)) {
        setApiError(messageFromError(error));
      }
    }
  });

  return (
    <RallyScreen title="Habit settings" subtitle={habitName}>
      <Section title="Next-week target">
        <Controller
          control={control}
          name="plannedWeekdays"
          render={({ field: { value, onChange } }) => (
            <RallyCard>
              <RallyText variant="micro">Planned days</RallyText>
              <WeekdaySelector selected={value} onChange={onChange} />
              {errors.plannedWeekdays?.message ? (
                <RallyText selectable variant="supporting" color={rallyColors.statusDanger}>
                  {errors.plannedWeekdays.message}
                </RallyText>
              ) : null}
            </RallyCard>
          )}
        />
        <RallyButton loading={isSubmitting || scheduleTarget.isPending} onPress={saveTarget}>
          Schedule target change
        </RallyButton>
      </Section>

      <Section title="Reminder preferences">
        <Controller
          control={control}
          name="remindersEnabled"
          render={({ field: { value, onChange } }) => (
            <SwitchRow
              title="Reminder notifications"
              description="Reminder saves depend on the next backend pass."
              value={value}
              onValueChange={onChange}
            />
          )}
        />
        {remindersEnabled ? (
          <Controller
            control={control}
            name="scheduledReminderTime"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Reminder time"
                value={value}
                onChangeText={onChange}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />
        ) : null}
        <RallyButton variant="secondary" loading={reminderMutation.isPending} onPress={saveReminders}>
          Save reminder preferences
        </RallyButton>
        {reminderMutation.error && isBackendGap(reminderMutation.error) ? (
          <BackendGapState rpcName="update_reminder_preferences" />
        ) : null}
      </Section>

      {savedMessage ? <StatePanel tone="success" title="Target scheduled" message={savedMessage} /> : null}
      {apiError ? <ErrorState title="Settings update failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
