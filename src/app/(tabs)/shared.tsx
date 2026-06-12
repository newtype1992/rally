import { useRouter } from 'expo-router';

import {
  ErrorState,
  HabitCard,
  LoadingState,
  RallyScreen,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { messageFromError } from '@/lib/forms';
import { useDailyView } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function SharedScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const daily = useDailyView(Boolean(session));

  if (!session) {
    return (
      <RallyScreen title="Shared">
        <StatePanel
          title="Log in to view shared habits"
          message="Rally only exposes shared progress for habits you actively belong to."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  if (daily.isLoading) {
    return (
      <RallyScreen title="Shared">
        <LoadingState label="Loading shared habits" />
      </RallyScreen>
    );
  }

  if (daily.error) {
    return (
      <RallyScreen title="Shared">
        <ErrorState
          title="Shared habits did not load"
          message={messageFromError(daily.error)}
          onRetry={() => daily.refetch()}
        />
      </RallyScreen>
    );
  }

  const sharedRows = (daily.data?.habits ?? []).filter((row) => row.habit.privacy === 'shared');

  return (
    <RallyScreen title="Shared" subtitle="Accountability spaces are scoped to each shared habit.">
      <Section title="Shared habits">
        {sharedRows.length === 0 ? (
          <StatePanel
            tone="shared"
            title="No shared habits yet"
            message="Share a habit from Today or Habits when a buddy would help."
            actionLabel="Open Habits"
            href="/habits"
          />
        ) : (
          sharedRows.map((row) => (
            <HabitCard
              key={row.membership.membership_id}
              row={row}
              onOpenShared={() => router.push(`/shared-habit/${row.habit.habit_id}`)}
            />
          ))
        )}
      </Section>
    </RallyScreen>
  );
}
