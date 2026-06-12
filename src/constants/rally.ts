export const rallyColors = {
  bgApp: '#07080D',
  bgSurface: '#0D1018',
  bgElevated: '#121624',
  bgInput: '#1B2030',
  borderDefault: '#2A3144',
  textPrimary: '#F4F7FB',
  textSecondary: '#B8C2D8',
  textMuted: '#75819A',
  actionPrimary: '#19D8FF',
  actionSecondary: '#9B5CFF',
  socialShared: '#FF3DF2',
  statusPrivate: '#29F2C6',
  statusSuccess: '#A7FF3F',
  statusWarning: '#FFB000',
  statusDanger: '#FF5C7A',
  scrim: 'rgba(7, 8, 13, 0.72)',
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
  sheet: 20,
} as const;

export const rallyLayout = {
  maxWidth: 480,
  minTouchTarget: 44,
  bottomTabHeight: 72,
} as const;

export const weekdayOptions = [
  { label: 'S', longLabel: 'Sunday', value: 0 },
  { label: 'M', longLabel: 'Monday', value: 1 },
  { label: 'T', longLabel: 'Tuesday', value: 2 },
  { label: 'W', longLabel: 'Wednesday', value: 3 },
  { label: 'T', longLabel: 'Thursday', value: 4 },
  { label: 'F', longLabel: 'Friday', value: 5 },
  { label: 'S', longLabel: 'Saturday', value: 6 },
] as const;

export const habitExampleName = 'Gym';
