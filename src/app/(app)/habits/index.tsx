import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, ErrorState, Eyebrow, HabitCard, LoadingState, OfflineNotice, RallyButton, RallyText, ScreenHeader, StatePanel } from '@/components/rally/ui';
import { rallyColors as c } from '@/constants/rally';
import { useActiveHabits, useMarkHabitDoneMutation, useUndoTodayCompletionMutation, useTodayContext } from '@/hooks/use-rally-data';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { signOut } from '@/lib/rally-api';
import type { HabitSummary } from '@/types/rally';

const HabitRow = memo(function HabitRow({ habit, index, online }: { habit: HabitSummary; index: number; online: boolean }) {
  const router = useRouter();
  const mark = useMarkHabitDoneMutation();
  const undo = useUndoTodayCompletionMutation();
  const error = mark.error || undo.error;
  return <View style={{ gap: 10 }}>
    <HabitCard habit={habit} index={index} disabled={!online} busy={mark.isPending || undo.isPending}
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
  const { today } = useTodayContext();
  const online = useNetworkStatus();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const rows = habits.data?.habits ?? [];
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(today + 'T12:00:00Z'));
  const logOut = async () => {
    setLeaving(true);
    setLogoutError(false);
    try { await signOut(); router.replace('/log-in'); }
    catch { setLogoutError(true); }
    finally { setLeaving(false); }
  };
  const header = <View style={s.header}>
    <View style={s.brandRow}><Brand small /><Eyebrow>YOUR DAILY SPACE</Eyebrow></View>
    <ScreenHeader title="Your habits." subtitle={date}
      rightAction={{ icon: 'add', accessibilityLabel: 'Add habit', href: '/habits/new', testID: 'habits-create', tone: 'primary' }} />
    <View style={s.note}><View style={s.noteLine} /><RallyText variant="supporting">Build a little momentum. One habit at a time.</RallyText></View>
    <OfflineNotice />
    {habits.error ? <ErrorState title={rows.length ? 'Progress couldn’t refresh.' : 'We couldn’t load your habits.'}
      message="Check your connection and try again." onRetry={() => habits.refetch()} /> : null}
    {rows.length ? <View style={s.listHeading}><Eyebrow>THIS WEEK</Eyebrow><RallyText variant="micro">{rows.length} {rows.length === 1 ? 'habit' : 'habits'}</RallyText></View> : null}
  </View>;
  return <View style={s.root}>
    <FlatList data={rows} keyExtractor={(habit) => habit.habit_id}
      renderItem={({ item, index }) => <HabitRow habit={item} index={index} online={online} />}
      initialNumToRender={6} maxToRenderPerBatch={5} windowSize={5}
      contentContainerStyle={[s.list, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      ListHeaderComponent={header} ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      refreshControl={<RefreshControl refreshing={habits.isRefetching} onRefresh={() => { void habits.refetch(); }} tintColor={c.actionPrimary} />}
      ListEmptyComponent={habits.isPending
        ? online ? <LoadingState /> : <StatePanel title="Connect to see your habits." message="Your habits will load when you’re back online." />
        : !habits.error ? <StatePanel title="Make space for your first habit." message="Something small. Something that matters to you. Start with one habit and let it grow."
          actionLabel="Create your first habit" href="/habits/new" /> : null}
      ListFooterComponent={<View style={s.footer}>
        <View style={s.footerRule} /><RallyText variant="micro" style={{ textAlign: 'center' }}>Progress belongs to you.</RallyText>
        <RallyButton variant="ghost" loading={leaving} onPress={logOut}>Log out</RallyButton>
        {logoutError ? <ErrorState title="Couldn’t log out." message="Please check your connection and try again." /> : null}
      </View>}
    />
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgApp },
  list: { paddingHorizontal: 24, width: '100%', maxWidth: 528, alignSelf: 'center', flexGrow: 1 },
  header: { gap: 24, paddingBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8 },
  note: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  noteLine: { width: 3, height: 28, borderRadius: 2, backgroundColor: c.actionPrimary },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  footer: { paddingTop: 30, gap: 12 },
  footerRule: { height: 1, backgroundColor: c.borderDefault, marginBottom: 6 },
});
