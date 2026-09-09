import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { LoadingState, RallyScreen } from '@/components/rally/ui';
import { completeSocialRedirect } from '@/lib/social-auth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const link = Linking.useLinkingURL();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    const url = Platform.OS === 'web' ? window.location.href : link;
    if (!url) return;
    started.current = true;
    void completeSocialRedirect(url).then(() => router.replace('/habits')).catch(() => {
      // A separate destination clears callback parameters without re-entering
      // this exchange screen or racing the router's browser history state.
      router.replace('/auth/error');
    });
  }, [link, router]);
  return <RallyScreen title="Finishing sign-in">
    <LoadingState label="Verifying your sign-in…" />
  </RallyScreen>;
}
