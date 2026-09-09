import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, Eyebrow, LoadingState, MetricCell, ProgressBar, RallyButton, RallyCard, RallyScreen, RallyText, Section, StatePanel } from '@/components/rally/ui';
import { rallyColors as c, rallyCompletionColors } from '@/constants/rally';
import { useHabitDetail, useMarkHabitDoneMutation, useTodayContext, useUndoTodayCompletionMutation } from '@/hooks/use-rally-data';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { addDays } from '@/lib/date';
import { classifyCompletionStreaks, completionTierLabel } from '@/lib/streak-classifier';

export default function HabitDetailScreen() {
  const router = useRouter();
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const context = useTodayContext();
  const detail = useHabitDetail(habitId ?? null);
  const mark = useMarkHabitDoneMutation();
  const undo = useUndoTodayCompletionMutation();
  const online = useNetworkStatus();
  const habit = detail.data?.habit;
  if (!habitId) return <RallyScreen title="Habit" backHref="/habits"><StatePanel title="We couldn’t find this habit." message="Open a habit from your dashboard." /></RallyScreen>;
  if (!habit && detail.isPending) return <RallyScreen title="Your progress." backHref="/habits">
    {online ? <LoadingState label="Loading habit..." /> : <StatePanel title="Connect to see your progress." message="Your habit will load when you’re back online." />}
  </RallyScreen>;
  if (!habit) return <RallyScreen title="Your progress." backHref="/habits"><ErrorState title="We couldn’t load this habit." message="Please try again." onRetry={() => detail.refetch()} /></RallyScreen>;
  const busy = mark.isPending || undo.isPending;
  const active = habit.status === 'active';
  return <RallyScreen title={habit.name} subtitle={`${habit.weekly_target} ${habit.weekly_target === 1 ? 'time' : 'times'} per week`} backHref="/habits">
    {detail.error ? <ErrorState title="Progress couldn’t refresh." message="You’re seeing the last saved update." onRetry={() => detail.refetch()} /> : null}
    <RallyCard style={s.weekCard}>
      <Eyebrow>THIS WEEK</Eyebrow>
      <View style={s.between}><View style={s.weekNumber}><RallyText style={s.bigNumber}>{habit.completed_this_week}</RallyText>
        <RallyText color={c.textSecondary} style={{ fontSize: 16, lineHeight: 24 }}>/ {habit.weekly_target} complete</RallyText></View>
        <RallyText variant="supporting">{Math.round(habit.progress_percentage)}%</RallyText></View>
      <ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} />
      <RallyText variant="supporting">{habit.completed_this_week >= habit.weekly_target ? 'Weekly target reached.' : `${habit.weekly_target - habit.completed_this_week} more to reach your weekly target.`}</RallyText>
      {active ? <View style={habit.done_today ? s.between : undefined}>
        {habit.done_today ? <RallyText color={c.statusSuccess}>✓  <Text>Done today</Text></RallyText> : null}
        <RallyButton variant={habit.done_today ? 'ghost' : 'primary'} disabled={!online} loading={busy}
        style={habit.done_today ? { minHeight: 44, paddingVertical: 9, paddingHorizontal: 14 } : undefined}
        onPress={() => { if (habit.done_today) { mark.reset(); undo.mutate({ habitId }); } else { undo.reset(); mark.mutate({ habitId }); } }}>
        {busy ? 'Updating…' : habit.done_today ? 'Undo' : 'Mark done'}
      </RallyButton></View> : <RallyText variant="supporting">This habit is no longer active.</RallyText>}
      {mark.error || undo.error ? <ErrorState title="That didn’t save." message="Check your connection and try again." /> : null}
    </RallyCard>
    <Section title="All-time progress">
      <View style={s.metrics}>
        <MetricCell label="Total completions" value={String(habit.all_time_progress.total_completions)} />
        <MetricCell label="Active days" value={String(habit.all_time_progress.active_days)} />
        <MetricCell label="Current streak" value={streakDays(habit.all_time_progress.current_streak)} />
        <MetricCell label="Best streak" value={streakDays(habit.all_time_progress.best_streak)} />
      </View>
    </Section>
    <CompletionHistory dates={habit.all_completion_dates} weekStart={context.weekStart} today={context.today} />
    {active ? <View style={s.manage}>
      <RallyButton variant="ghost" style={s.manageAction} onPress={() => router.push({ pathname: '/archive-habit', params: { habitId, habitName: habit.name } })}>Archive habit</RallyButton>
      <RallyButton variant="dangerQuiet" style={[s.manageAction, { borderBottomWidth: 0 }]} onPress={() => router.push({ pathname: '/delete-habit', params: { habitId, habitName: habit.name } })}>Delete habit</RallyButton>
    </View> : null}
  </RallyScreen>;
}

function CompletionHistory({ dates, weekStart, today }: { dates: string[]; weekStart: string; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const classified = useMemo(() => classifyCompletionStreaks(dates), [dates]);
  const weeks = useMemo(() => Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(weekStart, -77 + w * 7 + d))), [weekStart]);
  const visible = weeks.flat().filter((d) => classified[d]);
  const month = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
  return <Section title="Last 12 weeks">
    <View style={{ gap: 14 }}>
      <RallyText variant="micro">{month(weeks[0][0])} — {month(weeks[11][6])}</RallyText>
      <View accessible accessibilityLabel={visible.length + ' completed days in the last 12 weeks. Use Show completion dates for details.'}>
        <View style={s.heatmap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.weekLabels}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <Text key={i} maxFontSizeMultiplier={1} style={s.dayLabel}>{day}</Text>)}</View>
          {weeks.map((week) => <View key={week[0]} style={s.week}>{week.map((date) => <View key={date} style={[s.cell,
            classified[date] ? { backgroundColor: rallyCompletionColors[classified[date].tier] } : null,
            date > today && { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.borderDefault }, date === today && { borderWidth: 1.5, borderColor: c.textPrimary }]} />)}</View>)}
        </View>
      </View>
      <View style={s.legend}>{Object.entries(rallyCompletionColors).map(([tier, color], i) => <View key={tier} style={s.legendItem}>
        <View style={[s.swatch, { backgroundColor: color }]} /><RallyText variant="micro">{['1–2d', '3d+', '7d+', '30d+', '90d+'][i]}</RallyText>
      </View>)}</View>
      <RallyButton variant="ghost" style={{ alignSelf: 'flex-start', paddingHorizontal: 0, paddingVertical: 10, minHeight: 44 }} onPress={() => setExpanded(!expanded)}>{expanded ? 'Hide completion dates' : 'Show completion dates'}</RallyButton>
      {expanded ? <View style={{ gap: 12 }}>{visible.length ? visible.map((date) =>
        <RallyText key={date} variant="supporting">{formatDate(date)} · {classified[date].streakLength}-day streak · {completionTierLabel(classified[date].tier)}</RallyText>)
        : <RallyText variant="supporting">No completed dates in this window.</RallyText>}</View> : null}
    </View>
  </Section>;
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
}
function streakDays(count: number) { return `${count} ${count === 1 ? 'day' : 'days'}`; }
const s = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  weekCard: { padding: 19, gap: 14 },
  weekNumber: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  bigNumber: { fontSize: 39, lineHeight: 46, letterSpacing: -1.5, fontWeight: '500' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  heatmap: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', justifyContent: 'space-between' },
  weekLabels: { width: 12, gap: 4 },
  dayLabel: { height: 15, lineHeight: 15, fontSize: 9, color: c.textMuted },
  week: { flex: 1, maxWidth: 15, gap: 4 },
  cell: { width: '100%', height: 15, borderRadius: 3, backgroundColor: c.borderDefault },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 7, height: 7, borderRadius: 2 },
  manage: { borderTopWidth: 1, borderTopColor: c.borderDefault, paddingTop: 10, marginTop: 0 },
  manageAction: { minHeight: 48, paddingHorizontal: 0, justifyContent: 'flex-start', borderRadius: 0, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
});
