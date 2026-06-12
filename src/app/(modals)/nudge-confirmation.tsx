import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  BackendGapState,
  ErrorState,
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { getDeviceTimeZone, isoDateInTimeZone } from '@/lib/date';
import { messageFromError } from '@/lib/forms';
import { sendNudge } from '@/lib/rally-api';

export default function NudgeConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    habitId?: string;
    recipientUserId?: string;
    recipientName?: string;
  }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : null;
  const recipientUserId = typeof params.recipientUserId === 'string' ? params.recipientUserId : null;
  const recipientName = typeof params.recipientName === 'string' ? params.recipientName : 'your buddy';
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canSend = Boolean(habitId && recipientUserId);

  const send = async () => {
    if (!habitId || !recipientUserId) {
      return;
    }
    setIsSending(true);
    setApiError(null);
    try {
      const timezone = getDeviceTimeZone();
      await sendNudge({
        habit_id: habitId,
        recipient_user_id: recipientUserId,
        reason: 'behind_pace',
        message_variant: 'small_reset',
        created_local_date: isoDateInTimeZone(new Date(), timezone),
        timezone,
      });
      router.replace('/nudge-sent');
    } catch (error) {
      setApiError(messageFromError(error));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <RallyScreen
      title="Send nudge"
      subtitle="Nudges stay canned and supportive."
      footer={
        <FooterActions>
          <RallyButton loading={isSending} disabled={!canSend} variant="social" onPress={send}>
            Send nudge
          </RallyButton>
          <RallyButton variant="secondary" href={habitId ? `/shared-habit/${habitId}` : '/shared'}>
            Cancel
          </RallyButton>
        </FooterActions>
      }>
      {!canSend ? <BackendGapState rpcName="get_shared_habit_detail" /> : null}
      <RallyCard>
        <RallyText variant="cardTitle">Check in when you can</RallyText>
        <RallyText variant="supporting">
          Send {recipientName} a small reset nudge without custom text or pressure.
        </RallyText>
      </RallyCard>
      <StatePanel
        tone="shared"
        title="Supportive only"
        message="The backend enforces sender and recipient nudge limits before anything is created."
      />
      {apiError ? <ErrorState title="Nudge failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
