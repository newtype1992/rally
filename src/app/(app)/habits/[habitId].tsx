import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Chip,
  ErrorState,
  LoadingState,
  MetricCell,
  ProgressBar,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { rallyColors, rallyCompletionColors, rallyRadius, rallySpacing, weekdayOptions } from '@/constants/rally';
import {
  useHabitDetail,
  useMarkHabitDoneMutation,
  useTodayContext,
  useUndoTodayCompletionMutation,
} from '@/hooks/use-rally-data';
import { addDays } from '@/lib/date';
import { messageFromError } from '@/lib/forms';
import { classifyCompletionStreaks, completionTierLabel } from '@/lib/streak-classifier';

export default function HabitDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : null;
  const context = useTodayContext();
  const detail = useHabitDetail(habitId);
  const markDone = useMarkHabitDoneMutation();
  const undo = useUndoTodayCompletionMutation();

  if (!habitId) {
    return (
      <RallyScreen title="Habit" backHref="/habits">
        <StatePanel title="We could not find this habit." message="Open a habit from your dashboard." actionLabel="Back" href={'/habits' as never} />
      </RallyScreen>
    );
  }

  if (detail.isLoading) {
    return (
      <RallyScreen title="Habit" backHref="/habits">
        <LoadingState label="Loading habit..." />
      </RallyScreen>
    );
  }

  if (detail.error || !detail.data?.habit) {
    return (
      <RallyScreen title="Habit" backHref="/habits">
        <ErrorState
          title="We could not load this habit. Try again."
          message={detail.error ? messageFromError(detail.error) : 'We could not find this habit.'}
          onRetry={() => detail.refetch()}
        />
      </RallyScreen>
    );
  }

  const habit = detail.data.habit;
  const classifiedCompletions = classifyCompletionStreaks(habit.all_completion_dates);
  const gridDates = lastTwelveWeeks(context.weekStart);
  const gridWeeks = groupDatesByWeek(gridDates);
  const months = gridRangeLabel(gridDates[0], gridDates[gridDates.length - 1]);

  return (
    <RallyScreen title={habit.name} backHref="/habits">
      <RallyCard>
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderCopy}>
            <RallyText variant="heading">This week</RallyText>
            <RallyText variant="supporting">
              {habit.completed_this_week} / {habit.weekly_target} completed
            </RallyText>
          </View>
          <RallyText variant="code" color={rallyColors.actionPrimary}>
            {Math.round(habit.progress_percentage)}%
          </RallyText>
        </View>
        <ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} />
        {habit.done_today ? (
          <View style={styles.todayActions}>
            <Chip label="Done today" tone="success" />
            <RallyButton
              variant="secondary"
              loading={undo.isPending}
              onPress={() => undo.mutate({ habit_id: habit.habit_id, completion_date: context.today })}>
              Undo
            </RallyButton>
          </View>
        ) : (
          <RallyButton
            loading={markDone.isPending}
            onPress={() => markDone.mutate({ habit_id: habit.habit_id, completion_date: context.today })}>
            Mark done
          </RallyButton>
        )}
      </RallyCard>

      <Section title="All-time progress">
        <View style={styles.metricGrid}>
          <MetricCell label="Total completions" value={String(habit.all_time_progress.total_completions)} />
          <MetricCell label="Current streak" value={String(habit.all_time_progress.current_streak)} />
          <MetricCell label="Best streak" value={String(habit.all_time_progress.best_streak)} />
          <MetricCell label="Active days" value={String(habit.all_time_progress.active_days)} />
        </View>
        <RallyCard>
          <View style={styles.gridHeader}>
            <RallyText variant="cardTitle">Last 12 weeks</RallyText>
            <RallyText variant="supporting">{months}</RallyText>
          </View>
          <View style={styles.heatmap}>
            <View style={styles.weekdayLabels} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {weekdayOptions.map((weekday) => (
                <RallyText key={weekday.value} variant="micro" style={styles.weekdayLabel}>
                  {weekday.longLabel.slice(0, 1)}
                </RallyText>
              ))}
            </View>
            <View style={styles.completionGrid}>
              {gridWeeks.map((week) => (
                <View key={week[0]} style={styles.weekColumn}>
                  {week.map((date) => {
                    const completion = classifiedCompletions[date];
                    const isToday = date === context.today;

                    return (
                      <View
                        key={date}
                        accessible
                        accessibilityLabel={completion
                          ? `${date}, completed, ${completion.streakLength}-day streak, ${completionTierLabel(completion.tier)}${isToday ? ', today' : ', not today'}`
                          : `${date}, not completed, no streak, no tier${isToday ? ', today' : ', not today'}`}
                        style={[
                          styles.gridCell,
                          completion ? { borderColor: rallyCompletionColors[completion.tier], backgroundColor: rallyCompletionColors[completion.tier] } : null,
                          isToday ? styles.gridCellToday : null,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
          <View style={styles.streakLegend} accessibilityLabel="Completion streak color tiers">
            {STREAK_LEGEND.map((item) => (
              <View key={item.label} style={styles.streakLegendItem}>
                <View style={[styles.streakLegendSwatch, { backgroundColor: item.color }]} />
                <RallyText variant="micro">{item.label}</RallyText>
              </View>
            ))}
          </View>
        </RallyCard>
      </Section>

      <Section title="Recent completions">
        <RallyCard>
          {habit.recent_completion_dates.length === 0 ? (
            <RallyText variant="supporting">No completions yet.</RallyText>
          ) : (
            <View style={styles.recentDates}>
              {habit.recent_completion_dates.slice(0, 8).map((date) => (
                <RallyText key={date} variant="supporting">
                  {date}
                </RallyText>
              ))}
            </View>
          )}
        </RallyCard>
      </Section>

      <View style={styles.managementActions}>
        <Pressable onPress={() => router.push({ pathname: '/archive-habit', params: { habitId, habitName: habit.name } } as never)}>
          <RallyText variant="supporting">Archive habit</RallyText>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/delete-habit', params: { habitId, habitName: habit.name } } as never)}>
          <RallyText variant="supporting" color={rallyColors.statusDanger}>
            Delete habit
          </RallyText>
        </Pressable>
      </View>

      {markDone.error ? <ErrorState title="That did not save. Try marking it done again." message={messageFromError(markDone.error)} /> : null}
      {undo.error ? <ErrorState title="That did not undo. Try again." message={messageFromError(undo.error)} /> : null}
    </RallyScreen>
  );
}

function lastTwelveWeeks(currentWeekStart: string) {
  const start = addDays(currentWeekStart, -77);
  return Array.from({ length: 84 }, (_item, index) => addDays(start, index));
}

function groupDatesByWeek(dates: string[]) {
  return Array.from({ length: 12 }, (_item, weekIndex) => dates.slice(weekIndex * 7, weekIndex * 7 + 7));
}

function gridRangeLabel(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const start = formatter.format(new Date(`${startDate}T00:00:00.000Z`));
  const end = formatter.format(new Date(`${endDate}T00:00:00.000Z`));
  return `${start} - ${end}`;
}

const STREAK_LEGEND = [
  { label: '3d', color: rallyCompletionColors.threeDay },
  { label: '7d', color: rallyCompletionColors.sevenDay },
  { label: '30d', color: rallyCompletionColors.thirtyDay },
  { label: '90d', color: rallyCompletionColors.ninetyDay },
] as const;

const styles = StyleSheet.create({
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rallySpacing.md,
  },
  detailHeaderCopy: {
    flex: 1,
    gap: rallySpacing.xxs,
  },
  todayActions: {
    gap: rallySpacing.xs,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rallySpacing.xs,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rallySpacing.sm,
  },
  heatmap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rallySpacing.xs,
  },
  weekdayLabels: {
    gap: 3,
  },
  weekdayLabel: {
    width: 10,
    height: 15,
    lineHeight: 15,
    textAlign: 'center',
  },
  completionGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  weekColumn: {
    flex: 1,
    maxWidth: 15,
    gap: 3,
  },
  gridCell: {
    width: '100%',
    maxWidth: 15,
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgInput,
  },
  streakLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: rallySpacing.sm,
  },
  streakLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rallySpacing.xxs,
  },
  streakLegendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  gridCellToday: {
    borderWidth: 2,
    borderColor: rallyColors.textSecondary,
  },
  recentDates: {
    gap: rallySpacing.xxs,
  },
  managementActions: {
    gap: rallySpacing.sm,
    borderRadius: rallyRadius.card,
    padding: rallySpacing.md,
  },
});
