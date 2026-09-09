export const rallyColors = {
  bgApp: '#111827',
  bgSurface: '#1B2537',
  bgElevated: '#273651',
  bgInput: '#1B2537',
  borderDefault: '#354157',
  borderInput: '#78879E',
  textPrimary: '#F2F5FA',
  textSecondary: '#AAB6C9',
  textMuted: '#AAB6C9',
  actionPrimary: '#91ABFF',
  actionPressed: '#7D97EB',
  actionSoft: '#273651',
  statusSuccess: '#7CD6AF',
  successSurface: '#18362E',
  successBorder: '#426454',
  statusDanger: '#FFADB9',
  dangerSurface: '#432733',
  scrim: 'rgba(0, 0, 0, 0.32)',
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
  card: 18,
  control: 12,
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
