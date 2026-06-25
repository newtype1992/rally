import { expect, test } from '@playwright/test';

import { addDays } from '../src/lib/date';
import { classifyCompletionStreaks } from '../src/lib/streak-classifier';

function dateRun(start: string, length: number) {
  return Array.from({ length }, (_item, index) => addDays(start, index));
}

test('one- and two-day runs remain in the default tier', () => {
  const oneDay = classifyCompletionStreaks(['2026-01-01']);
  const twoDays = classifyCompletionStreaks(dateRun('2026-02-01', 2));

  expect(oneDay['2026-01-01']).toEqual({ streakLength: 1, tier: 'default' });
  expect(twoDays['2026-02-02']).toEqual({ streakLength: 2, tier: 'default' });
});

for (const [length, tier] of [
  [3, 'threeDay'],
  [7, 'sevenDay'],
  [30, 'thirtyDay'],
  [90, 'ninetyDay'],
] as const) {
  test(`an exact ${length}-day run assigns ${tier} to the entire run`, () => {
    const dates = dateRun('2025-01-01', length);
    const result = classifyCompletionStreaks(dates);

    expect(result[dates[0]]).toEqual({ streakLength: length, tier });
    expect(result[dates[length - 1]]).toEqual({ streakLength: length, tier });
  });
}

test('runs longer than 90 days remain in the 90-day tier', () => {
  const dates = dateRun('2025-01-01', 120);
  const result = classifyCompletionStreaks(dates);

  expect(result[dates[37]]).toEqual({ streakLength: 120, tier: 'ninetyDay' });
});

test('gaps split streaks and unsorted duplicate input is normalized', () => {
  const result = classifyCompletionStreaks([
    '2026-01-06',
    '2026-01-01',
    '2026-01-02',
    '2026-01-02',
    '2026-01-05',
    '2026-01-07',
  ]);

  expect(Object.keys(result)).toEqual([
    '2026-01-01',
    '2026-01-02',
    '2026-01-05',
    '2026-01-06',
    '2026-01-07',
  ]);
  expect(result['2026-01-01']).toEqual({ streakLength: 2, tier: 'default' });
  expect(result['2026-01-05']).toEqual({ streakLength: 3, tier: 'threeDay' });
});

test('a streak beginning before the visible window still classifies visible dates from its full length', () => {
  const allDates = dateRun('2025-01-01', 100);
  const visibleDates = allDates.slice(-84);
  const result = classifyCompletionStreaks(allDates);

  expect(result[visibleDates[0]]).toEqual({ streakLength: 100, tier: 'ninetyDay' });
  expect(result[visibleDates[83]]).toEqual({ streakLength: 100, tier: 'ninetyDay' });
});

test('marking today promotes an entire run and undoing today downgrades it', () => {
  const firstSixDays = dateRun('2026-04-01', 6);
  const promoted = classifyCompletionStreaks([...firstSixDays, '2026-04-07']);
  const downgraded = classifyCompletionStreaks(firstSixDays);

  expect(promoted['2026-04-01']).toEqual({ streakLength: 7, tier: 'sevenDay' });
  expect(promoted['2026-04-07']).toEqual({ streakLength: 7, tier: 'sevenDay' });
  expect(downgraded['2026-04-01']).toEqual({ streakLength: 6, tier: 'threeDay' });
  expect(downgraded['2026-04-06']).toEqual({ streakLength: 6, tier: 'threeDay' });
});
