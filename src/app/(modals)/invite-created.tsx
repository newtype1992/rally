import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
} from '@/components/rally/ui';
import { analytics } from '@/lib/analytics';
import { useAppStore } from '@/store/use-app-store';

function inviteLink(inviteUrl: string) {
  if (inviteUrl.startsWith('/')) {
    return `rally://${inviteUrl.slice(1)}`;
  }
  return inviteUrl;
}

export default function InviteCreatedScreen() {
  const router = useRouter();
  const invite = useAppStore((state) => state.lastInvite);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!invite) {
    return (
      <RallyScreen title="Invite created">
        <StatePanel
          title="No invite found"
          message="Create an invite from a habit before copying it."
          actionLabel="Share habit"
          href="/share-habit"
        />
      </RallyScreen>
    );
  }

  const link = inviteLink(invite.invite_url);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(link);
      analytics.capture('invite_shared', { habit_id: invite.habit_id });
      router.push('/invite-copied');
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : 'Copy failed.');
    }
  };

  return (
    <RallyScreen
      title="Invite created"
      subtitle="Share this code or link with the buddy joining this habit."
      footer={
        <FooterActions>
          <RallyButton variant="social" onPress={copy}>
            Copy invite link
          </RallyButton>
          <RallyButton variant="secondary" href={`/shared-habit/${invite.habit_id}`}>
            Open shared habit
          </RallyButton>
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="micro">Invite code</RallyText>
        <RallyText selectable variant="title">
          {invite.public_code}
        </RallyText>
        <RallyText selectable variant="supporting">
          {link}
        </RallyText>
      </RallyCard>
      <StatePanel
        tone="shared"
        title="One habit scope"
        message="Accepting this invite exposes progress only for the selected habit."
      />
      {copyError ? <StatePanel tone="danger" title="Copy failed" message={copyError} /> : null}
    </RallyScreen>
  );
}
