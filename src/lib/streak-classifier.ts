import { addDays } from '@/lib/date';

export type CompletionTier = 'default' | 'threeDay' | 'sevenDay' | 'thirtyDay' | 'ninetyDay';

export type ClassifiedCompletion = {
  streakLength: number;
  tier: CompletionTier;
};

export function completionTierForLength(streakLength: number): CompletionTier {
  if (streakLength >= 90) return 'ninetyDay';
  if (streakLength >= 30) return 'thirtyDay';
  if (streakLength >= 7) return 'sevenDay';
  if (streakLength >= 3) return 'threeDay';
  return 'default';
}

export function classifyCompletionStreaks(completionDates: string[]): Record<string, ClassifiedCompletion> {
  const dates = [...new Set(completionDates)].sort();
  const classified: Record<string, ClassifiedCompletion> = {};

  for (let runStart = 0; runStart < dates.length; ) {
    let runEnd = runStart;

    while (runEnd + 1 < dates.length && dates[runEnd + 1] === addDays(dates[runEnd], 1)) {
      runEnd += 1;
    }

    const streakLength = runEnd - runStart + 1;
    const tier = completionTierForLength(streakLength);

    for (let index = runStart; index <= runEnd; index += 1) {
      classified[dates[index]] = { streakLength, tier };
    }

    runStart = runEnd + 1;
  }

  return classified;
}

export function completionTierLabel(tier: CompletionTier) {
  switch (tier) {
    case 'ninetyDay':
      return '90-day tier';
    case 'thirtyDay':
      return '30-day tier';
    case 'sevenDay':
      return '7-day tier';
    case 'threeDay':
      return '3-day tier';
    default:
      return 'default tier';
  }
}
