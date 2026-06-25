import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState, RallyButton, RallySheetScreen, RallyText } from '@/components/rally/ui';
import { useArchiveHabitMutation } from '@/hooks/use-rally-data';
import { messageFromError } from '@/lib/forms';

export default function ArchiveHabitModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string; habitName?: string }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : '';
  const habitName = typeof params.habitName === 'string' ? params.habitName : 'Habit';
  const archiveHabit = useArchiveHabitMutation();

  const archive = async () => {
    await archiveHabit.mutateAsync({ habitId, confirmation: 'explicit' });
    router.replace('/habits');
  };

  return (
    <RallySheetScreen backgroundTitle={habitName} sheetTitle="Archive this habit?" onClose={() => router.back()}>
      <RallyText variant="supporting">It will leave your active dashboard.</RallyText>
      <RallyButton loading={archiveHabit.isPending} onPress={archive}>
        Archive habit
      </RallyButton>
      <RallyButton variant="secondary" onPress={() => router.back()}>
        Cancel
      </RallyButton>
      {archiveHabit.error ? (
        <ErrorState title="We could not archive this habit. Try again." message={messageFromError(archiveHabit.error)} />
      ) : null}
    </RallySheetScreen>
  );
}
