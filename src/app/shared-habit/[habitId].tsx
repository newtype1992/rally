import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  BackendGapState,
  ErrorState,
  LoadingState,
  MetricCell,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { isBackendGap } from '@/lib/rally-api';
import { messageFromError } from '@/lib/forms';
import { formatPercent } from '@/lib/date';
import { useSharedHabitDetail, useTodayContext } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function SharedHabitDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : null;
  const session = useAppStore((state) => state.session);
  const today = useTodayContext();
  const detail = useSharedHabitDetail(
    {
      habit_id: habitId ?? '',
      local_date: today.localDate,
      local_week_start: today.localWeekStart,
      timezone: today.timezone,
    },
    Boolean(session && habitId),
  );

  if (!session) {
    return (
      <RallyScreen title="Shared habit">
        <StatePanel
          title="Log in to open shared habit"
          message="Shared detail is scoped to active members only."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  if (!habitId) {
    return (
      <RallyScreen title="Shared habit">
        <StatePanel
          tone="danger"
          title="Missing habit"
          message="The shared habit route needs a habit ID."
          actionLabel="Open Shared"
          href="/shared"
        />
      </RallyScreen>
    );
  }

  if (detail.isLoading) {
    return (
      <RallyScreen title="Shared habit">
        <LoadingState label="Loading shared habit" />
      </RallyScreen>
    );
  }

  if (detail.error && isBackendGap(detail.error)) {
    return (
      <RallyScreen title="Shared habit" subtitle="Member progress, ranking, nudges, and reactions.">
        <BackendGapState rpcName="get_shared_habit_detail" />
        <StatePanel
          tone="shared"
          title="Shared shell is ready"
          message="This screen intentionally avoids fake member rankings, nudge targets, or reactions until the backend view model is complete."
        />
        <RallyButton variant="secondary" href="/shared">
          Back to Shared
        </RallyButton>
      </RallyScreen>
    );
  }

  if (detail.error) {
    return (
      <RallyScreen title="Shared habit">
        <ErrorState
          title="Shared habit did not load"
          message={messageFromError(detail.error)}
          onRetry={() => detail.refetch()}
        />
      </RallyScreen>
    );
  }

  const data = detail.data;
  if (!data) {
    return null;
  }

  return (
    <RallyScreen title={data.habit.name} subtitle="Fair progress uses each member's own planned days.">
      <RallyCard>
        <RallyText variant="cardTitle">{data.habit.name}</RallyText>
        <RallyText variant="supporting">
          {data.members.length} active members. Owner: {data.habit.owner.display_name}
        </RallyText>
        <RallyButton
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/share-habit',
              params: { habitId: data.habit.habit_id },
            })
          }>
          Create invite
        </RallyButton>
      </RallyCard>

      <Section title="Members">
        {data.members.map((member) => (
          <RallyCard key={member.membership.membership_id}>
            <RallyText variant="cardTitle">{member.profile.display_name}</RallyText>
            <RallyCard style={{ flexDirection: 'row', gap: 8 }}>
              <MetricCell label="Rank" value={`${member.progress.rank}`} tone="shared" />
              <MetricCell
                label="Progress"
                value={formatPercent(member.progress.capped_percentage)}
                tone="primary"
              />
            </RallyCard>
            {member.nudge_eligibility.state === 'ready' &&
            member.membership.membership_id !== data.self_membership_id ? (
              <RallyButton
                variant="social"
                onPress={() =>
                  router.push({
                    pathname: '/nudge-confirmation',
                    params: {
                      habitId: data.habit.habit_id,
                      recipientUserId: member.profile.user_id,
                      recipientName: member.profile.display_name,
                    },
                  })
                }>
                Send nudge
              </RallyButton>
            ) : null}
          </RallyCard>
        ))}
      </Section>
    </RallyScreen>
  );
}
