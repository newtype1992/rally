import { FooterActions, RallyButton, RallyScreen, StatePanel } from '@/components/rally/ui';

export default function NudgeSentScreen() {
  return (
    <RallyScreen
      title="Nudge sent"
      footer={
        <FooterActions>
          <RallyButton variant="secondary" href="/shared">
            Back to Shared
          </RallyButton>
        </FooterActions>
      }>
      <StatePanel
        tone="success"
        title="Support sent"
        message="The nudge was recorded and queued according to the recipient's notification state."
      />
    </RallyScreen>
  );
}
