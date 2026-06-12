import { useRouter } from 'expo-router';

import {
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { useAppStore } from '@/store/use-app-store';

export default function PrivateConfirmationScreen() {
  const router = useRouter();
  const lastCreatedHabit = useAppStore((state) => state.lastCreatedHabit);

  if (!lastCreatedHabit) {
    return (
      <RallyScreen title="Habit created">
        <StatePanel
          title="No recent setup found"
          message="Create a first habit or open Today to refresh your active habits."
          actionLabel="Open Today"
          href="/today"
        />
      </RallyScreen>
    );
  }

  return (
    <RallyScreen
      title="Private by default"
      subtitle="This habit is ready on Today. Sharing is limited to this habit when you choose it."
      footer={
        <FooterActions>
          <RallyButton
            variant="social"
            onPress={() =>
              router.push({
                pathname: '/share-habit',
                params: { habitId: lastCreatedHabit.habit.habit_id },
              })
            }>
            Share this habit
          </RallyButton>
          <RallyButton variant="secondary" href="/today">
            Go to Today
          </RallyButton>
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">{lastCreatedHabit.habit.name}</RallyText>
        <RallyText variant="supporting">
          {lastCreatedHabit.membership.weekly_target} planned days per week
        </RallyText>
      </RallyCard>
      <StatePanel
        tone="private"
        title="Only you can see it now"
        message="Friends only see this habit after they accept an invite for it."
      />
    </RallyScreen>
  );
}
