import { Stack } from 'expo-router';

import { rallyColors } from '@/constants/rally';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
      }}>
      <Stack.Screen name="log-in" options={{ title: 'Log in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
    </Stack>
  );
}
