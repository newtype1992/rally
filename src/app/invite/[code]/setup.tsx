import { Controller, useForm } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import {
  ErrorState,
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
  WeekdaySelector,
} from '@/components/rally/ui';
import { analytics } from '@/lib/analytics';
import { getDeviceTimeZone, makeClientRequestId } from '@/lib/date';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import { useAcceptInviteMutation } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';
import type { Weekday } from '@/types/rally';

type BuddyTargetForm = {
  plannedWeekdays: Weekday[];
};

const buddyTargetSchema = z.object({
  plannedWeekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one day.'),
});

export default function BuddyTargetSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code : null;
  const session = useAppStore((state) => state.session);
  const acceptInvite = useAcceptInviteMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BuddyTargetForm>({
    defaultValues: {
      plannedWeekdays: [1, 3, 5],
    },
  });

  if (!session) {
    return (
      <RallyScreen title="Pick planned days">
        <StatePanel
          title="Log in before joining"
          message="The invite can be previewed without auth, but joining creates a membership on your account."
          actionLabel="Sign in instead"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const parsed = buddyTargetSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    if (!code) {
      setApiError('Invite code is missing.');
      return;
    }
    setApiError(null);
    try {
      const response = await acceptInvite.mutateAsync({
        invite_token_or_code: code,
        client_request_id: makeClientRequestId('invite'),
        setup: {
          planned_weekdays: parsed.data.plannedWeekdays as Weekday[],
          timezone: getDeviceTimeZone(),
          week_start_weekday: 0,
        },
        reminders: {
          reminders_enabled: false,
          nudge_notifications_enabled: false,
          missed_notifications_enabled: false,
          scheduled_reminder_time: null,
          notification_permission_status: 'not_requested',
        },
      });
      analytics.capture('invite_joined', { rejoined: response.rejoined });
      router.replace(`/shared-habit/${response.habit.habit_id}`);
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  return (
    <RallyScreen
      title="Pick planned days"
      subtitle="Your shared comparison uses your own target, not someone else's schedule."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting || acceptInvite.isPending} onPress={onSubmit}>
            Join shared habit
          </RallyButton>
          <RallyButton variant="secondary" href={`/invite/${code}`}>
            Back to invite
          </RallyButton>
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">Set your weekly target</RallyText>
        <RallyText variant="supporting">
          Select the days you plan to do the habit. Rally derives your weekly target from this.
        </RallyText>
      </RallyCard>
      <Controller
        control={control}
        name="plannedWeekdays"
        render={({ field: { value, onChange } }) => (
          <RallyCard>
            <RallyText variant="micro">Planned days</RallyText>
            <WeekdaySelector selected={value} onChange={onChange} />
            {errors.plannedWeekdays?.message ? (
              <RallyText selectable variant="supporting" color="#FF5C7A">
                {errors.plannedWeekdays.message}
              </RallyText>
            ) : null}
          </RallyCard>
        )}
      />
      {apiError ? <ErrorState title="Could not join invite" message={apiError} /> : null}
    </RallyScreen>
  );
}
