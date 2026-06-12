import { Controller, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import {
  ErrorState,
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  SwitchRow,
  TextField,
} from '@/components/rally/ui';
import { analytics } from '@/lib/analytics';
import { getDeviceTimeZone, makeClientRequestId } from '@/lib/date';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import {
  requestNotificationPermissionStatus,
  registerDevicePushTokenIfPossible,
} from '@/lib/notifications';
import { useCreateHabitMutation } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

type DetailsForm = {
  remindersEnabled: boolean;
  scheduledReminderTime: string;
};

const detailsSchema = z
  .object({
    remindersEnabled: z.boolean(),
    scheduledReminderTime: z.string(),
  })
  .superRefine((value, context) => {
    if (value.remindersEnabled && !/^\d{2}:\d{2}$/.test(value.scheduledReminderTime)) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledReminderTime'],
        message: 'Use HH:MM time, like 18:30.',
      });
    }
  });

export default function SetupDetailsScreen() {
  const router = useRouter();
  const draft = useAppStore((state) => state.onboardingDraft);
  const updateDraft = useAppStore((state) => state.updateOnboardingDraft);
  const setLastCreatedHabit = useAppStore((state) => state.setLastCreatedHabit);
  const resetDraft = useAppStore((state) => state.resetOnboardingDraft);
  const createHabit = useCreateHabitMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DetailsForm>({
    defaultValues: {
      remindersEnabled: draft.remindersEnabled,
      scheduledReminderTime: draft.scheduledReminderTime ?? '18:30',
    },
  });
  const remindersEnabled = useWatch({ control, name: 'remindersEnabled' });

  const createHabitFromValues = async (
    remindersEnabledForRequest: boolean,
    scheduledReminderTime: string | null,
    notificationPermissionStatus: 'not_requested' | 'granted' | 'denied' | 'disabled' | 'unknown',
  ) => {
    const timezone = getDeviceTimeZone();
    const response = await createHabit.mutateAsync({
      client_request_id: makeClientRequestId('habit'),
      habit: {
        name: draft.habitName,
        privacy: 'private',
        max_members: 5,
      },
      setup: {
        planned_weekdays: draft.plannedWeekdays,
        timezone,
        week_start_weekday: 0,
      },
      reminders: {
        reminders_enabled: remindersEnabledForRequest,
        nudge_notifications_enabled: remindersEnabledForRequest,
        missed_notifications_enabled: remindersEnabledForRequest,
        scheduled_reminder_time: remindersEnabledForRequest ? scheduledReminderTime : null,
        notification_permission_status: notificationPermissionStatus,
      },
    });
    setLastCreatedHabit(response);
    analytics.capture('habit_created', { privacy: response.habit.privacy });
    analytics.capture('onboarding_completed');
    resetDraft();
    if (notificationPermissionStatus === 'granted') {
      registerDevicePushTokenIfPossible(notificationPermissionStatus).catch(() => null);
    }
    router.replace('/private-confirmation');
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = detailsSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    if (!draft.habitName) {
      router.replace('/first-habit');
      return;
    }
    setApiError(null);
    try {
      if (parsed.data.remindersEnabled) {
        const permission = await requestNotificationPermissionStatus();
        updateDraft({
          remindersEnabled: true,
          scheduledReminderTime: parsed.data.scheduledReminderTime,
          notificationPermissionStatus: permission,
        });
        if (permission === 'denied' || permission === 'disabled') {
          router.push('/permission-denied');
          return;
        }
        await createHabitFromValues(true, parsed.data.scheduledReminderTime, permission);
        return;
      }
      await createHabitFromValues(false, null, 'not_requested');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  const continueWithoutReminders = async () => {
    if (!draft.habitName) {
      router.replace('/first-habit');
      return;
    }
    setApiError(null);
    try {
      await createHabitFromValues(false, null, 'not_requested');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  };

  return (
    <RallyScreen
      title="Setup details"
      subtitle="Reminders are optional. Your selected days already define the weekly target."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting || createHabit.isPending} onPress={onSubmit}>
            Create private habit
          </RallyButton>
          {remindersEnabled ? (
            <RallyButton variant="secondary" onPress={continueWithoutReminders}>
              Continue without reminders
            </RallyButton>
          ) : null}
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">{draft.habitName || 'Your habit'}</RallyText>
        <RallyText variant="supporting">
          {draft.plannedWeekdays.length} planned days per week. You can adjust next week after setup.
        </RallyText>
      </RallyCard>
      <Controller
        control={control}
        name="remindersEnabled"
        render={({ field: { value, onChange } }) => (
          <SwitchRow
            title="Reminders"
            description="Use device notifications for planned days and missed-day recovery."
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
              placeholder="18:30"
              error={errors.scheduledReminderTime?.message}
            />
          )}
        />
      ) : null}
      {apiError ? <ErrorState title="Habit setup failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
