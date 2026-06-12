import { useMemo } from 'react';

import {
  BackendGapState,
  ErrorState,
  LoadingState,
  MetricCell,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
} from '@/components/rally/ui';
import { addDays, formatPercent } from '@/lib/date';
import { isBackendGap } from '@/lib/rally-api';
import { messageFromError } from '@/lib/forms';
import { useCalendarView, useTodayContext, useWeeklyView } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

export default function ProgressScreen() {
  const session = useAppStore((state) => state.session);
  const today = useTodayContext();
  const weekly = useWeeklyView(
    { local_week_start: today.localWeekStart, timezone: today.timezone },
    Boolean(session),
  );
  const calendarInput = useMemo(
    () => ({
      range_start: addDays(today.localWeekStart, -14),
      range_end: addDays(today.localWeekStart, 34),
      selected_local_date: today.localDate,
      timezone: today.timezone,
    }),
    [today.localDate, today.localWeekStart, today.timezone],
  );
  const calendar = useCalendarView(calendarInput, Boolean(session));

  if (!session) {
    return (
      <RallyScreen title="Progress">
        <StatePanel
          title="Log in to view progress"
          message="Weekly and calendar history is private to your account."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  return (
    <RallyScreen title="Progress" subtitle="Weekly progress and calendar history use backend view models.">
      <Section title="Week">
        {weekly.isLoading ? <LoadingState label="Loading weekly progress" /> : null}
        {weekly.error && isBackendGap(weekly.error) ? <BackendGapState rpcName="get_weekly_view" /> : null}
        {weekly.error && !isBackendGap(weekly.error) ? (
          <ErrorState message={messageFromError(weekly.error)} onRetry={() => weekly.refetch()} />
        ) : null}
        {weekly.data ? (
          <RallyCard>
            <RallyText variant="cardTitle">
              {weekly.data.local_week_start} to {weekly.data.week_end}
            </RallyText>
            {weekly.data.habits.map((row) => (
              <MetricCell
                key={row.membership_id}
                label={row.habit.name}
                value={formatPercent(row.own_progress.capped_percentage)}
                tone={row.habit.privacy === 'shared' ? 'shared' : 'primary'}
              />
            ))}
          </RallyCard>
        ) : null}
      </Section>

      <Section title="Calendar">
        {calendar.isLoading ? <LoadingState label="Loading calendar" /> : null}
        {calendar.error && isBackendGap(calendar.error) ? <BackendGapState rpcName="get_calendar_view" /> : null}
        {calendar.error && !isBackendGap(calendar.error) ? (
          <ErrorState message={messageFromError(calendar.error)} onRetry={() => calendar.refetch()} />
        ) : null}
        {calendar.data ? (
          <RallyCard>
            <RallyText variant="cardTitle">{calendar.data.selected_day?.local_date ?? today.localDate}</RallyText>
            <RallyText variant="supporting">
              {calendar.data.selected_day?.habits.length ?? 0} habit states on the selected day
            </RallyText>
          </RallyCard>
        ) : null}
      </Section>
    </RallyScreen>
  );
}
