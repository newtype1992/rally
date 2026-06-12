import {
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { useAppStore } from '@/store/use-app-store';

export default function InviteCopiedScreen() {
  const invite = useAppStore((state) => state.lastInvite);

  return (
    <RallyScreen
      title="Invite copied"
      subtitle="The link is ready to send."
      footer={
        <FooterActions>
          <RallyButton variant="secondary" href={invite ? `/shared-habit/${invite.habit_id}` : '/shared'}>
            Open shared habit
          </RallyButton>
          <RallyButton variant="ghost" href="/invite-created">
            Back to invite
          </RallyButton>
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">Invite link copied</RallyText>
        <RallyText variant="supporting">Your buddy can preview the habit and choose their planned days before joining.</RallyText>
      </RallyCard>
      <StatePanel
        tone="success"
        title="Ready to share"
        message="Invite preview protects private details until the invited user joins."
      />
    </RallyScreen>
  );
}
