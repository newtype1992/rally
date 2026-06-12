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
      <Stack.Screen name="share-habit" options={{ title: 'Share habit' }} />
      <Stack.Screen name="invite-created" options={{ title: 'Invite created' }} />
      <Stack.Screen name="invite-copied" options={{ title: 'Invite copied' }} />
      <Stack.Screen name="habit-settings" options={{ title: 'Habit settings' }} />
      <Stack.Screen name="nudge-confirmation" options={{ title: 'Nudge' }} />
      <Stack.Screen name="nudge-sent" options={{ title: 'Nudge sent' }} />
      <Stack.Screen name="permission-denied" options={{ title: 'Reminders' }} />
      <Stack.Screen name="check-in-retry" options={{ title: 'Check-in retry' }} />
    </Stack>
  );
}
