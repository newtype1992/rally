import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, ErrorState, HabitCard, LoadingState, OfflineNotice, RallyButton, ScreenHeader, StatePanel } from '@/components/rally/ui';
import { rallyColors as c } from '@/constants/rally';
import { useActiveHabits, useMarkHabitDoneMutation, useUndoTodayCompletionMutation, useTodayContext } from '@/hooks/use-rally-data';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { signOut } from '@/lib/rally-api';
import { addDays } from '@/lib/date';
import type { HabitSummary } from '@/types/rally';

const HabitRow = memo(function HabitRow({ habit, online }: { habit: HabitSummary; online: boolean }) {
  const router = useRouter();
  const mark = useMarkHabitDoneMutation();
  const undo = useUndoTodayCompletionMutation();
  const error = mark.error || undo.error;
  return <View style={{ gap: 10 }}>
    <HabitCard habit={habit} disabled={!online} busy={mark.isPending || undo.isPending}
      onOpen={() => router.push({ pathname: '/habits/[habitId]', params: { habitId: habit.habit_id } })}
      onMarkDone={() => { undo.reset(); mark.mutate({ habitId: habit.habit_id }); }}
      onUndo={() => { mark.reset(); undo.mutate({ habitId: habit.habit_id }); }} />
    {error ? <ErrorState title="That didn’t save." message="Check your connection, then try again." /> : null}
  </View>;
});

export default function HabitsDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const habits = useActiveHabits();
  const { weekStart } = useTodayContext();
  const online = useNetworkStatus();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const rows = habits.data?.habits ?? [];
  const weekFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const date = 'This week · ' + weekFormatter.formatRange(new Date(weekStart + 'T12:00:00Z'), new Date(addDays(weekStart, 6) + 'T12:00:00Z'));
  const logOut = async () => {
    setLeaving(true);
    setLogoutError(false);
    try { await signOut(); router.replace('/log-in'); }
    catch { setLogoutError(true); }
    finally { setLeaving(false); }
  };
  const header = <View style={s.header}>
    <View style={s.brandRow}><Brand small /><RallyButton variant="ghost" loading={leaving} onPress={logOut} style={s.logout}>{leaving ? 'Logging out…' : 'Log out'}</RallyButton></View>
    <ScreenHeader title="Your habits." subtitle={date}
      rightAction={{ icon: 'add', accessibilityLabel: 'Add habit', href: '/habits/new', testID: 'habits-create', tone: 'primary' }} />
    <OfflineNotice />
    {habits.error ? <ErrorState title={rows.length ? 'Progress couldn’t refresh.' : 'We couldn’t load your habits.'}
      message="Check your connection and try again." onRetry={() => habits.refetch()} /> : null}
    {logoutError ? <ErrorState title="Couldn’t log out." message="Please check your connection and try again." /> : null}
  </View>;
  return <View style={s.root}>
    <FlatList data={rows} keyExtractor={(habit) => habit.habit_id}
      renderItem={({ item }) => <HabitRow habit={item} online={online} />}
      initialNumToRender={6} maxToRenderPerBatch={5} windowSize={5}
      contentContainerStyle={[s.list, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      ListHeaderComponent={header} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={<RefreshControl refreshing={habits.isRefetching} onRefresh={() => { void habits.refetch(); }} tintColor={c.actionPrimary} />}
      ListEmptyComponent={habits.isPending
        ? online ? <LoadingState /> : <StatePanel title="Connect to see your habits." message="Your habits will load when you’re back online." />
        : !habits.error ? <StatePanel title="No habits yet." message="Create your first habit to start tracking weekly progress."
          actionLabel="Create your first habit" href="/habits/new" /> : null}
    />
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgApp },
  list: { paddingHorizontal: 22, width: '100%', maxWidth: 524, alignSelf: 'center', flexGrow: 1 },
  header: { gap: 24, paddingBottom: 23 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  logout: { minHeight: 44, paddingHorizontal: 0, paddingVertical: 10 },
});
