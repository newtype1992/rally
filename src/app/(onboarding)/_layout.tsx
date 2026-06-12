import { Stack } from 'expo-router';

import { rallyColors } from '@/constants/rally';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
      }}>
      <Stack.Screen name="first-habit" options={{ title: 'First habit' }} />
      <Stack.Screen name="setup-details" options={{ title: 'Setup details' }} />
      <Stack.Screen name="private-confirmation" options={{ title: 'Habit created' }} />
    </Stack>
  );
}
