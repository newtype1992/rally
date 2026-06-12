import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ErrorState,
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { messageFromError } from '@/lib/forms';
import { useRecordCheckinMutation } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';
import type { RecordCheckinRequest } from '@/types/rally';

export default function CheckInRetryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ message?: string }>();
  const message = typeof params.message === 'string' ? params.message : null;
  const pendingCheckins = useAppStore((state) => state.pendingCheckins);
  const removePendingCheckin = useAppStore((state) => state.removePendingCheckin);
  const recordCheckinMutation = useRecordCheckinMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const retryPending = async () => {
    setApiError(null);
    try {
      for (const pending of pendingCheckins) {
        const payload: RecordCheckinRequest = {
          client_request_id: pending.client_request_id,
          habit_id: pending.habit_id,
          habit_membership_id: pending.habit_membership_id,
          local_date: pending.local_date,
          local_week_start: pending.local_week_start,
          local_timezone: pending.local_timezone,
          status: pending.status,
          queued_at_client: pending.queued_at_client,
        };
        await recordCheckinMutation.mutateAsync(payload);
        removePendingCheckin(pending.client_request_id);
      }
      router.replace('/today');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  };

  return (
    <RallyScreen
      title="Check-in recovery"
      footer={
        <FooterActions>
          {pendingCheckins.length > 0 ? (
            <RallyButton loading={recordCheckinMutation.isPending} onPress={retryPending}>
              Retry check-in
            </RallyButton>
          ) : null}
          <RallyButton variant="secondary" href="/today">
            Keep pending
          </RallyButton>
        </FooterActions>
      }>
      <StatePanel
        tone={pendingCheckins.length > 0 ? 'warning' : 'danger'}
        title={pendingCheckins.length > 0 ? 'Pending sync' : 'Check-in failed'}
        message={
          message ??
          (pendingCheckins.length > 0
            ? 'Your check-in is queued and will retry with its client request ID.'
            : 'No pending check-in is currently queued.')
        }
      />
      {pendingCheckins.map((pending) => (
        <RallyCard key={pending.client_request_id}>
          <RallyText variant="cardTitle">{pending.habit_name}</RallyText>
          <RallyText selectable variant="supporting">
            {pending.status} on {pending.local_date}
          </RallyText>
          <RallyText selectable variant="code">
            {pending.client_request_id}
          </RallyText>
        </RallyCard>
      ))}
      {apiError ? <ErrorState title="Retry failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
