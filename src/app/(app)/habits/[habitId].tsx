import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip, ErrorState, Eyebrow, LoadingState, MetricCell, ProgressBar, RallyButton, RallyCard, RallyScreen, RallyText, Section, StatePanel } from '@/components/rally/ui';
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
  return <RallyScreen title={habit.name} subtitle="A little effort. A lasting difference." backHref="/habits">
    {detail.error ? <ErrorState title="Progress couldn’t refresh." message="You’re seeing the last saved update." onRetry={() => detail.refetch()} /> : null}
    <RallyCard style={s.weekCard}>
      <View style={s.between}><Eyebrow>THIS WEEK</Eyebrow><Chip label={habit.done_today ? 'Done today' : 'Your weekly rhythm'} tone={habit.done_today ? 'success' : 'neutral'} /></View>
      <View style={s.weekNumber}><RallyText style={s.bigNumber}>{habit.completed_this_week}</RallyText>
        <RallyText color={c.textMuted} style={{ fontSize: 28, lineHeight: 38 }}>/ {habit.weekly_target}</RallyText></View>
      <View style={s.between}><RallyText variant="supporting">days completed this week</RallyText><RallyText color={c.actionPrimary} variant="code">{Math.round(habit.progress_percentage)}%</RallyText></View>
      <ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} />
      {active ? <RallyButton variant={habit.done_today ? 'secondary' : 'primary'} disabled={!online} loading={busy}
        onPress={() => { if (habit.done_today) { mark.reset(); undo.mutate({ habitId }); } else { undo.reset(); mark.mutate({ habitId }); } }}>
        {habit.done_today ? 'Undo' : 'Mark done'}
      </RallyButton> : <RallyText variant="supporting">This habit is no longer active.</RallyText>}
      {mark.error || undo.error ? <ErrorState title="That didn’t save." message="Check your connection and try again." /> : null}
    </RallyCard>
    <Section title="All-time progress">
      <View style={s.metrics}>
        <MetricCell label="Total completions" value={String(habit.all_time_progress.total_completions)} />
        <MetricCell label="Current streak" value={String(habit.all_time_progress.current_streak)} />
        <MetricCell label="Best streak" value={String(habit.all_time_progress.best_streak)} />
        <MetricCell label="Active days" value={String(habit.all_time_progress.active_days)} />
      </View>
    </Section>
    <CompletionHistory dates={habit.all_completion_dates} weekStart={context.weekStart} today={context.today} />
    <Section title="Recent completions">
      <View style={s.recent}>
        {habit.recent_completion_dates.length ? habit.recent_completion_dates.slice(0, 8).map((date) =>
          <View key={date} style={s.recentRow}><RallyText variant="supporting">{formatDate(date)}</RallyText><Text style={{ color: c.actionPrimary }}>✓</Text></View>)
          : <RallyText variant="supporting">No completions yet. Your next small step starts today.</RallyText>}
      </View>
    </Section>
    {active ? <View style={s.manage}><Eyebrow>MAKE ROOM FOR WHAT MATTERS</Eyebrow>
      <RallyButton variant="ghost" onPress={() => router.push({ pathname: '/archive-habit', params: { habitId, habitName: habit.name } })}>Archive habit</RallyButton>
      <RallyButton variant="danger" onPress={() => router.push({ pathname: '/delete-habit', params: { habitId, habitName: habit.name } })}>Delete habit</RallyButton>
    </View> : null}
  </RallyScreen>;
}

function CompletionHistory({ dates, weekStart, today }: { dates: string[]; weekStart: string; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const classified = useMemo(() => classifyCompletionStreaks(dates), [dates]);
  const weeks = useMemo(() => Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(weekStart, -77 + w * 7 + d))), [weekStart]);
  const visible = weeks.flat().filter((d) => classified[d]);
  const month = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
  return <Section title="Your consistency">
    <RallyCard>
      <View style={s.between}><RallyText variant="cardTitle">Last 12 weeks</RallyText><RallyText variant="micro">{month(weeks[0][0])} — {month(weeks[11][6])}</RallyText></View>
      <View accessible accessibilityLabel={visible.length + ' completed days in the last 12 weeks. Use Show completion dates for details.'}>
        <View style={s.heatmap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.weekLabels}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <Text key={i} maxFontSizeMultiplier={1} style={s.dayLabel}>{day}</Text>)}</View>
          {weeks.map((week) => <View key={week[0]} style={s.week}>{week.map((date) => <View key={date} style={[s.cell,
            classified[date] ? { backgroundColor: rallyCompletionColors[classified[date].tier] } : null,
            date > today && { opacity: 0.3 }, date === today && { borderWidth: 1.5, borderColor: c.textPrimary }]} />)}</View>)}
        </View>
      </View>
      <View style={s.legend}>{Object.entries(rallyCompletionColors).map(([tier, color], i) => <View key={tier} style={s.legendItem}>
        <View style={[s.swatch, { backgroundColor: color }]} /><RallyText variant="micro">{['1–2d', '3d+', '7d+', '30d+', '90d+'][i]}</RallyText>
      </View>)}</View>
      <RallyText variant="supporting">Every square is a day. Colors follow the length of each unbroken streak.</RallyText>
      <RallyButton variant="ghost" onPress={() => setExpanded(!expanded)}>{expanded ? 'Hide completion dates' : 'Show completion dates'}</RallyButton>
      {expanded ? <View style={{ gap: 12 }}>{visible.length ? visible.map((date) =>
        <RallyText key={date} variant="supporting">{formatDate(date)} · {classified[date].streakLength}-day streak · {completionTierLabel(classified[date].tier)}</RallyText>)
        : <RallyText variant="supporting">No completed dates in this window.</RallyText>}</View> : null}
    </RallyCard>
  </Section>;
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
}
const s = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  weekCard: { padding: 24, gap: 20, borderColor: '#5C513B' },
  weekNumber: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  bigNumber: { fontSize: 72, lineHeight: 80, letterSpacing: -4, fontWeight: '500', color: c.actionPrimary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heatmap: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', justifyContent: 'space-between' },
  weekLabels: { width: 12, gap: 4 },
  dayLabel: { height: 15, lineHeight: 15, fontSize: 9, color: c.textMuted },
  week: { flex: 1, maxWidth: 15, gap: 4 },
  cell: { width: '100%', height: 15, borderRadius: 3, backgroundColor: '#343B30' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 7, height: 7, borderRadius: 2 },
  recent: { gap: 0 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
  manage: { borderTopWidth: 1, borderTopColor: c.borderDefault, paddingTop: 24, gap: 12, marginTop: 8 },
});
