import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/components/app-providers';
import { rallyColors } from '@/constants/rally';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: rallyColors.bgApp },
            headerStyle: { backgroundColor: rallyColors.bgApp },
            headerShadowVisible: false,
            headerTintColor: rallyColors.textPrimary,
            headerTitleStyle: { color: rallyColors.textPrimary },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
