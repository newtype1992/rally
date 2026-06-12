import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import {
  ErrorState,
  FooterActions,
  LoadingState,
  MetricCell,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { messageFromError } from '@/lib/forms';
import { useInvitePreview } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function InvitePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code : null;
  const session = useAppStore((state) => state.session);
  const setInviteTokenOrCode = useAppStore((state) => state.setInviteTokenOrCode);
  const preview = useInvitePreview(code);

  useEffect(() => {
    setInviteTokenOrCode(code);
  }, [code, setInviteTokenOrCode]);

  if (!code) {
    return (
      <RallyScreen title="Invite">
        <StatePanel
          tone="danger"
          title="Invalid invite"
          message="This invite link is missing its code."
          actionLabel="Go to Today"
          href="/today"
        />
      </RallyScreen>
    );
  }

  if (preview.isLoading) {
    return (
      <RallyScreen title="Invite preview">
        <LoadingState label="Checking invite" />
      </RallyScreen>
    );
  }

  if (preview.error) {
    return (
      <RallyScreen title="Invite preview">
        <ErrorState
          title="Invite did not load"
          message={messageFromError(preview.error)}
          onRetry={() => preview.refetch()}
        />
      </RallyScreen>
    );
  }

  const data = preview.data;
  if (!data) {
    return null;
  }

  const habitName = data.habit_preview.habit_name ?? 'Shared habit';
  const inviter = data.habit_preview.inviter_display_name ?? 'A buddy';

  if (data.invite_resolution !== 'valid') {
    return (
      <RallyScreen title="Invite preview">
        <InviteResolutionState
          resolution={data.invite_resolution}
          habitId={data.authenticated_context?.existing_habit_id ?? null}
        />
      </RallyScreen>
    );
  }

  return (
    <RallyScreen
      title="Join shared habit"
      subtitle={`${inviter} invited you to track ${habitName}.`}
      footer={
        <FooterActions>
          <RallyButton
            variant="social"
            onPress={() => {
              if (!session) {
                router.push('/log-in');
                return;
              }
              router.push(`/invite/${code}/setup`);
            }}>
            Join shared habit
          </RallyButton>
          {!session ? (
            <RallyButton variant="secondary" href="/sign-up">
              Create account
            </RallyButton>
          ) : null}
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">{habitName}</RallyText>
        <RallyText variant="supporting">
          {data.habit_preview.privacy_summary ??
            'Joining shares progress only for this habit.'}
        </RallyText>
      </RallyCard>
      <RallyCard style={{ flexDirection: 'row', gap: 8 }}>
        <MetricCell
          label="Members"
          value={`${data.habit_preview.active_member_count ?? 0}`}
          tone="shared"
        />
        <MetricCell
          label="Limit"
          value={`${data.habit_preview.member_limit ?? 5}`}
          tone="primary"
        />
      </RallyCard>
      <StatePanel
        tone="private"
        title="Pick your own planned days next"
        message="Your target is based on your schedule, so comparison is by percentage of each person's own goal."
      />
    </RallyScreen>
  );
}

function InviteResolutionState({
  resolution,
  habitId,
}: {
  resolution: string;
  habitId: string | null;
}) {
  switch (resolution) {
    case 'already_joined':
      return (
        <StatePanel
          tone="success"
          title="Already joined"
          message="You already belong to this shared habit."
          actionLabel={habitId ? 'Open shared habit' : 'Open Today'}
          href={habitId ? `/shared-habit/${habitId}` : '/today'}
        />
      );
    case 'expired':
      return (
        <StatePanel
          tone="danger"
          title="Invite expired"
          message="Ask the habit owner for a fresh invite."
          actionLabel="Back to Today"
          href="/today"
        />
      );
    case 'revoked':
      return (
        <StatePanel
          tone="danger"
          title="Invite revoked"
          message="The owner turned this invite off."
          actionLabel="Back to Today"
          href="/today"
        />
      );
    case 'full':
      return (
        <StatePanel
          tone="warning"
          title="Habit is full"
          message="This shared habit already has its maximum number of active members."
          actionLabel="Back to Today"
          href="/today"
        />
      );
    default:
      return (
        <StatePanel
          tone="danger"
          title="Invalid invite"
          message="This invite code does not match an active Rally invite."
          actionLabel="Back to Today"
          href="/today"
        />
      );
  }
}
