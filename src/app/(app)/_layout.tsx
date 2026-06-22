import { Redirect, Stack } from 'expo-router';

import { LoadingState, RallyScreen } from '@/components/rally/ui';
import { rallyColors } from '@/constants/rally';
import { useAppStore } from '@/store/use-app-store';

export default function AppLayout() {
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

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: rallyColors.bgApp },
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerShadowVisible: false,
        headerTintColor: rallyColors.textPrimary,
        headerTitleStyle: { color: rallyColors.textPrimary },
      }}>
      <Stack.Screen name="habits/index" options={{ title: 'Habits', headerShown: false }} />
      <Stack.Screen
        name="habits/new"
        options={{
          title: 'Create habit',
          headerShown: false,
          presentation: 'formSheet',
          gestureEnabled: true,
          sheetAllowedDetents: [0.8],
          sheetCornerRadius: 16,
          sheetGrabberVisible: true,
          sheetLargestUndimmedDetentIndex: 'none',
          sheetExpandsWhenScrolledToEdge: false,
        }}
      />
      <Stack.Screen
        name="habits/[habitId]"
        options={{ title: 'Habit detail', headerShown: false, gestureEnabled: true }}
      />
    </Stack>
  );
}
