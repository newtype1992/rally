export const rallyColors = {
  bgApp: '#0D0F12',
  bgSurface: '#171A1F',
  bgElevated: '#20242B',
  bgInput: '#20242B',
  borderDefault: '#343A44',
  textPrimary: '#F8FAFC',
  textSecondary: '#A7B0BE',
  textMuted: '#6B7280',
  actionPrimary: '#F59E0B',
  actionPressed: '#D97706',
  actionSoft: '#FCD34D',
  statusSuccess: '#22C55E',
  statusDanger: '#EF4444',
  scrim: 'rgba(13, 15, 18, 0.72)',
} as const;

export const rallyCompletionColors = {
  default: '#F59E0B',
  threeDay: '#F97316',
  sevenDay: '#FB7185',
  thirtyDay: '#E879F9',
  ninetyDay: '#A78BFA',
} as const;

export const rallySpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 32,
  xxl: 48,
} as const;

export const rallyRadius = {
  card: 8,
  control: 8,
  sheet: 12,
} as const;

export const rallyLayout = {
  maxWidth: 480,
  minTouchTarget: 44,
  bottomTabHeight: 72,
} as const;

export const weekdayOptions = [
  { label: 'Sun', shortLabel: 'Sun', longLabel: 'Sunday', value: 0 },
  { label: 'Mon', shortLabel: 'Mon', longLabel: 'Monday', value: 1 },
  { label: 'Tue', shortLabel: 'Tue', longLabel: 'Tuesday', value: 2 },
  { label: 'Wed', shortLabel: 'Wed', longLabel: 'Wednesday', value: 3 },
  { label: 'Thu', shortLabel: 'Thu', longLabel: 'Thursday', value: 4 },
  { label: 'Fri', shortLabel: 'Fri', longLabel: 'Friday', value: 5 },
  { label: 'Sat', shortLabel: 'Sat', longLabel: 'Saturday', value: 6 },
] as const;

export const habitExampleName = 'Gym';
