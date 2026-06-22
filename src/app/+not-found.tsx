import { RallyButton, RallyScreen, StatePanel } from '@/components/rally/ui';

export default function NotFoundScreen() {
  return (
    <RallyScreen title="Not found">
      <StatePanel
        title="This Rally screen is not available"
        message="The route does not match a current Rally flow."
      />
      <RallyButton href="/habits">Go to Habits</RallyButton>
    </RallyScreen>
  );
}
