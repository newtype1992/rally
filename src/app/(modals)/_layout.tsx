import { Stack } from 'expo-router';

import { rallyColors } from '@/constants/rally';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
        presentation: 'modal',
      }}>
      <Stack.Screen name="archive-habit" options={{ title: 'Archive habit', headerShown: false }} />
      <Stack.Screen name="delete-habit" options={{ title: 'Delete habit', headerShown: false }} />
    </Stack>
  );
}
