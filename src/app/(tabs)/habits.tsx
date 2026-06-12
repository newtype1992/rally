import { useRouter } from 'expo-router';

import {
  ErrorState,
  HabitCard,
  LoadingState,
  RallyButton,
  RallyScreen,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { messageFromError } from '@/lib/forms';
import { useDailyView } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function HabitsScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const daily = useDailyView(Boolean(session));

  if (!session) {
    return (
      <RallyScreen title="Habits">
        <StatePanel
          title="Log in to manage habits"
          message="Habit settings and sharing are scoped to your active session."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  if (daily.isLoading) {
    return (
      <RallyScreen title="Habits">
        <LoadingState label="Loading habits" />
      </RallyScreen>
    );
  }

  if (daily.error) {
    return (
      <RallyScreen title="Habits">
        <ErrorState
          title="Habits did not load"
          message={messageFromError(daily.error)}
          onRetry={() => daily.refetch()}
        />
      </RallyScreen>
    );
  }

  const rows = daily.data?.habits ?? [];

  return (
    <RallyScreen title="Habits" subtitle="Private and shared habits stay separate by habit.">
      <RallyButton href="/first-habit">Add habit</RallyButton>
      <Section title="Active habits">
        {rows.length === 0 ? (
          <StatePanel
            title="No active habits"
            message="Create one private habit before inviting a buddy."
            actionLabel="Set up habit"
            href="/first-habit"
          />
        ) : (
          rows.map((row) => (
            <HabitCard
              key={row.membership.membership_id}
              row={row}
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
          ))
        )}
      </Section>
    </RallyScreen>
  );
}
