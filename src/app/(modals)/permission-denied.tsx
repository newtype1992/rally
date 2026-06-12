import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import {
  ErrorState,
  FooterActions,
  RallyButton,
  RallyScreen,
  StatePanel,
} from '@/components/rally/ui';
import { getDeviceTimeZone, makeClientRequestId } from '@/lib/date';
import { messageFromError } from '@/lib/forms';
import { useCreateHabitMutation } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function PermissionDeniedScreen() {
  const router = useRouter();
  const draft = useAppStore((state) => state.onboardingDraft);
  const resetDraft = useAppStore((state) => state.resetOnboardingDraft);
  const setLastCreatedHabit = useAppStore((state) => state.setLastCreatedHabit);
  const createHabit = useCreateHabitMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const keepRemindersOff = async () => {
    if (!draft.habitName) {
      router.replace('/setup-details');
      return;
    }
    setApiError(null);
    try {
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
          reminders_enabled: false,
          nudge_notifications_enabled: false,
          missed_notifications_enabled: false,
          scheduled_reminder_time: null,
          notification_permission_status: 'denied',
        },
      });
      setLastCreatedHabit(response);
      resetDraft();
      router.replace('/private-confirmation');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  };

  return (
    <RallyScreen
      title="Reminders are off"
      footer={
        <FooterActions>
          <RallyButton loading={createHabit.isPending} onPress={keepRemindersOff}>
            Keep reminders off
          </RallyButton>
          <RallyButton variant="secondary" onPress={() => Linking.openSettings()}>
            Open system settings
          </RallyButton>
        </FooterActions>
      }>
      <StatePanel
        tone="warning"
        title="Notification permission denied"
        message="Rally can still create the habit. Reminder changes can be revisited later after the backend reminder RPC is complete."
      />
      {apiError ? <ErrorState title="Habit setup failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
