import { Redirect } from 'expo-router';

import { LoadingState, RallyScreen } from '@/components/rally/ui';
import { useAppStore } from '@/store/use-app-store';

export default function HomeScreen() {
  const session = useAppStore((state) => state.session);
  const sessionInitialized = useAppStore((state) => state.sessionInitialized);

  if (!sessionInitialized) {
    return (
      <RallyScreen title="Rally">
        <LoadingState />
      </RallyScreen>
    );
  }

  if (!session) {
    return <Redirect href="/log-in" />;
  }

  return <Redirect href="/habits" />;
}
