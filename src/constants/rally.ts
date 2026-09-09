export const rallyColors = {
  bgApp: '#101210',
  bgSurface: '#1B1E1A',
  bgElevated: '#252922',
  bgInput: '#20241F',
  borderDefault: '#3E453B',
  borderInput: '#788171',
  textPrimary: '#F6F3EA',
  textSecondary: '#B9BEB1',
  textMuted: '#A0A895',
  actionPrimary: '#F5BC63',
  actionPressed: '#D97706',
  actionSoft: '#FCD34D',
  statusSuccess: '#A5D6A0',
  statusDanger: '#FF9F97',
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
  card: 20,
  control: 14,
  sheet: 28,
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
