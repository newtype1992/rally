import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import {
  ErrorState,
  HabitCard,
  LoadingState,
  MetricCell,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { addDays, makeClientRequestId } from '@/lib/date';
import { messageFromError } from '@/lib/forms';
import { useDailyView, useRecordCheckinMutation, useTodayContext } from '@/hooks/use-rally-data';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAppStore } from '@/store/use-app-store';
import type { CheckInStatus, DailyHabitRow } from '@/types/rally';

export default function TodayScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const sessionInitialized = useAppStore((state) => state.sessionInitialized);
  const pendingCheckins = useAppStore((state) => state.pendingCheckins);
  const addPendingCheckin = useAppStore((state) => state.addPendingCheckin);
  const isOnline = useNetworkStatus();
  const today = useTodayContext();
  const daily = useDailyView(Boolean(session));
  const recordCheckinMutation = useRecordCheckinMutation();

  const record = async (row: DailyHabitRow, status: Extract<CheckInStatus, 'completed' | 'skipped'>) => {
    const payload = {
      client_request_id: makeClientRequestId('checkin'),
      habit_id: row.habit.habit_id,
      habit_membership_id: row.membership.membership_id,
      local_date: today.localDate,
      local_week_start: today.localWeekStart,
      local_timezone: today.timezone,
      status,
    };

    if (!isOnline) {
      addPendingCheckin({
        ...payload,
        queued_at_client: new Date().toISOString(),
        habit_name: row.habit.name,
        privacy: row.habit.privacy,
      });
      router.push('/check-in-retry');
      return;
    }

    try {
      await recordCheckinMutation.mutateAsync(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (_error) {
      router.push({
        pathname: '/check-in-retry',
        params: { message: messageFromError(_error) },
      });
    }
  };

  if (!sessionInitialized) {
    return (
      <RallyScreen title="Today">
        <LoadingState />
      </RallyScreen>
    );
  }

  if (!session) {
    return (
      <RallyScreen title="Today">
        <StatePanel
          title="Log in to load Today"
          message="Rally needs your session before it can read private habit data."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  if (daily.isLoading) {
    return (
      <RallyScreen title="Today">
        <LoadingState label="Loading Today" />
      </RallyScreen>
    );
  }

  if (daily.error) {
    return (
      <RallyScreen title="Today">
        <ErrorState
          title="Today did not load"
          message={messageFromError(daily.error)}
          onRetry={() => daily.refetch()}
        />
      </RallyScreen>
    );
  }

  const rows = daily.data?.habits ?? [];
  const dueCount = rows.filter((row) => row.today.due_today).length;
  const completedCount = rows.filter((row) => row.today.state === 'completed').length;

  return (
    <RallyScreen title="Today" subtitle={daily.data?.local_date ?? today.localDate}>
      <RallyCard>
        <RallyText variant="cardTitle">
          {dueCount === 0 ? 'No habits due right now' : `${dueCount} due today`}
        </RallyText>
        <RallyText variant="supporting">
          Week runs {today.localWeekStart} to {addDays(today.localWeekStart, 6)}
        </RallyText>
      </RallyCard>

      <Section title="Daily loop">
        <RallyCard style={{ flexDirection: 'row', gap: 8 }}>
          <MetricCell label="Completed" value={`${completedCount}`} tone="success" />
          <MetricCell label="Pending sync" value={`${pendingCheckins.length}`} tone="warning" />
        </RallyCard>
      </Section>

      {pendingCheckins.length > 0 ? (
        <StatePanel
          tone="warning"
          title="Pending check-ins"
          message="Offline check-ins are queued with client request IDs and will retry when the device is online."
          actionLabel="Review pending"
          href="/check-in-retry"
        />
      ) : null}

      <Section title="Habits">
        {rows.length === 0 ? (
          <StatePanel
            title="Create your first habit"
            message="Start private, choose planned days, then share only if accountability helps."
            actionLabel="Set up habit"
            href="/first-habit"
          />
        ) : (
          rows.map((row) => {
            const pending = pendingCheckins.find(
              (item) => item.habit_membership_id === row.membership.membership_id,
            );
            return (
              <HabitCard
                key={row.membership.membership_id}
                row={row}
                pendingCheckin={pending}
                onCheckIn={() => record(row, 'completed')}
                onSkip={() => record(row, 'skipped')}
                onShare={
                  row.membership.role === 'owner'
                    ? () =>
                        router.push({
                          pathname: '/share-habit',
                          params: { habitId: row.habit.habit_id },
                        })
                    : undefined
                }
                onSettings={() =>
                  router.push({
                    pathname: '/habit-settings',
                    params: {
                      habitId: row.habit.habit_id,
                      membershipId: row.membership.membership_id,
                      habitName: row.habit.name,
                      plannedWeekdays: row.membership.planned_weekdays.join(','),
                    },
                  })
                }
                onOpenShared={
                  row.habit.privacy === 'shared'
                    ? () => router.push(`/shared-habit/${row.habit.habit_id}`)
                    : undefined
                }
              />
            );
          })
        )}
      </Section>
    </RallyScreen>
  );
}
