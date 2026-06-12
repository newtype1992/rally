import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { rallyColors } from '@/constants/rally';

function TabIcon({ color, name }: { color: ColorValue; name: SFSymbol }) {
  return <SymbolView name={name} tintColor={color} size={22} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: rallyColors.bgApp },
        headerTintColor: rallyColors.textPrimary,
        headerShadowVisible: false,
        tabBarActiveTintColor: rallyColors.actionPrimary,
        tabBarInactiveTintColor: rallyColors.textMuted,
        tabBarStyle: {
          backgroundColor: rallyColors.bgSurface,
          borderTopColor: rallyColors.borderDefault,
        },
        sceneStyle: { backgroundColor: rallyColors.bgApp },
      }}>
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="checkmark.circle" />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="list.bullet" />,
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          title: 'Shared',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="person.2" />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="chart.bar" />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="person.crop.circle" />,
        }}
      />
    </Tabs>
  );
}
