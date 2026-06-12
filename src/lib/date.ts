import { weekdayOptions } from '@/constants/rally';
import type { LocalDate, SundayWeekStart, Weekday } from '@/types/rally';

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isoDateInTimeZone(date = new Date(), timeZone = getDeviceTimeZone()): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '01';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDays(localDate: LocalDate, dayCount: number): LocalDate {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

export function weekdayForDate(localDate: LocalDate): Weekday {
  return new Date(`${localDate}T00:00:00.000Z`).getUTCDay() as Weekday;
}

export function sundayWeekStart(localDate: LocalDate): SundayWeekStart {
  return addDays(localDate, -weekdayForDate(localDate));
}

export function weekDates(localWeekStart: SundayWeekStart) {
  return weekdayOptions.map((option) => ({
    ...option,
    localDate: addDays(localWeekStart, option.value),
  }));
}

export function displayWeekdays(days: Weekday[]) {
  if (days.length === 7) {
    return 'Every day';
  }
  return weekdayOptions
    .filter((option) => days.includes(option.value))
    .map((option) => option.longLabel.slice(0, 3))
    .join(', ');
}

export function makeClientRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}
