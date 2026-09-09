import { Stack } from 'expo-router';

import { rallyColors } from '@/constants/rally';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="log-in"
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        gestureEnabled: false,
        headerBackVisible: false,
        headerShown: false,
        animation: 'fade',
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
      }}>
      <Stack.Screen name="log-in" options={{ title: 'Log in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
    </Stack>
  );
}
