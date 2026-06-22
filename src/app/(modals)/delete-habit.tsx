import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState, RallyButton, RallySheetScreen, RallyText } from '@/components/rally/ui';
import { useDeleteHabitMutation } from '@/hooks/use-rally-data';
import { messageFromError } from '@/lib/forms';

export default function DeleteHabitModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string; habitName?: string }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : '';
  const habitName = typeof params.habitName === 'string' ? params.habitName : 'Habit';
  const deleteHabit = useDeleteHabitMutation();

  const remove = async () => {
    await deleteHabit.mutateAsync({ habit_id: habitId });
    router.replace('/habits');
  };

  return (
    <RallySheetScreen backgroundTitle={habitName} sheetTitle="Delete this habit?" onClose={() => router.back()}>
      <RallyText variant="supporting">This removes it from your active dashboard.</RallyText>
      <RallyButton variant="danger" loading={deleteHabit.isPending} onPress={remove}>
        Delete habit
      </RallyButton>
      <RallyButton variant="secondary" onPress={() => router.back()}>
        Cancel
      </RallyButton>
      {deleteHabit.error ? (
        <ErrorState title="We could not delete this habit. Try again." message={messageFromError(deleteHabit.error)} />
      ) : null}
    </RallySheetScreen>
  );
}
