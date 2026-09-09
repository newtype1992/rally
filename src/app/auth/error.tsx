import { useRouter } from 'expo-router';

import { ErrorState, RallyButton, RallyScreen } from '@/components/rally/ui';

export default function AuthErrorScreen() {
  const router = useRouter();
  return <RallyScreen title="Sign-in interrupted">
    <ErrorState title="We couldn’t finish sign-in." message="The sign-in link expired, was cancelled, or could not be verified. Please start again." />
    <RallyButton onPress={() => router.replace('/log-in')}>Back to log in</RallyButton>
  </RallyScreen>;
}
