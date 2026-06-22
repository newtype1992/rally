import { useRouter } from 'expo-router';

import {
  ErrorState,
  HabitCard,
  LoadingState,
  RallyScreen,
  StatePanel,
} from '@/components/rally/ui';
import {
  useActiveHabits,
  useMarkHabitDoneMutation,
  useTodayContext,
  useUndoTodayCompletionMutation,
} from '@/hooks/use-rally-data';
import { messageFromError } from '@/lib/forms';

export default function HabitsDashboardScreen() {
  const router = useRouter();
  const context = useTodayContext();
  const habits = useActiveHabits();
  const markDone = useMarkHabitDoneMutation();
  const undo = useUndoTodayCompletionMutation();

  if (habits.isLoading) {
    return (
      <RallyScreen
        title="Habits"
        subtitle="This week"
        rightAction={{
          icon: 'add',
          accessibilityLabel: 'Add habit',
          href: '/habits/new',
          testID: 'habits-create',
          tone: 'primary',
        }}>
        <LoadingState label="Loading habits..." />
      </RallyScreen>
    );
  }

  if (habits.error) {
    return (
      <RallyScreen
        title="Habits"
        subtitle="This week"
        rightAction={{
          icon: 'add',
          accessibilityLabel: 'Add habit',
          href: '/habits/new',
          testID: 'habits-create',
          tone: 'primary',
        }}>
        <ErrorState
          title="We could not load your habits. Try again."
          message={messageFromError(habits.error)}
          onRetry={() => habits.refetch()}
        />
      </RallyScreen>
    );
  }

  const rows = habits.data?.habits ?? [];

  return (
    <RallyScreen
      title="Habits"
      subtitle="This week"
      rightAction={{
        icon: 'add',
        accessibilityLabel: 'Add habit',
        href: '/habits/new',
        testID: 'habits-create',
        tone: 'primary',
      }}>
      {rows.length === 0 ? (
          <StatePanel
            title="No habits yet"
            message="Create your first habit to start tracking weekly progress."
            actionLabel="Create your first habit"
            href={'/habits/new' as never}
          />
      ) : (
          rows.map((habit) => (
            <HabitCard
              key={habit.habit_id}
              habit={habit}
              busy={markDone.isPending || undo.isPending}
              onOpen={() => router.push(`/habits/${habit.habit_id}` as never)}
              onMarkDone={() =>
                markDone.mutate({
                  habit_id: habit.habit_id,
                  completion_date: context.today,
                })
              }
              onUndo={() =>
                undo.mutate({
                  habit_id: habit.habit_id,
                  completion_date: context.today,
                })
              }
            />
          ))
      )}
      {markDone.error ? <ErrorState title="That did not save. Try marking it done again." message={messageFromError(markDone.error)} /> : null}
      {undo.error ? <ErrorState title="That did not undo. Try again." message={messageFromError(undo.error)} /> : null}
    </RallyScreen>
  );
}
