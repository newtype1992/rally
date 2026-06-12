import { Stack } from 'expo-router';

import { rallyColors } from '@/constants/rally';

export default function InviteLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
      }}>
      <Stack.Screen name="[code]" options={{ title: 'Invite preview' }} />
      <Stack.Screen name="[code]/setup" options={{ title: 'Pick planned days' }} />
    </Stack>
  );
}
