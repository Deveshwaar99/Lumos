export const colors = {
  primary: '#7B5EFF',
  primaryLight: '#9B8AFF',
  primaryDark: '#5B3EE6',
  primaryGlow: 'rgba(123, 94, 255, 0.35)',
  primaryContainer: 'rgba(123, 94, 255, 0.18)',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#D4CCFF',

  accent: '#34D8C9',

  secondary: '#6FB7FF',
  secondaryLight: '#8FC4FF',
  secondaryDark: '#4A9AE8',
  secondaryContainer: 'rgba(111, 183, 255, 0.15)',
  onSecondary: '#0B0B12',
  onSecondaryContainer: '#C8E4FF',

  tertiary: '#34D8C9',
  tertiaryContainer: 'rgba(52, 216, 201, 0.12)',

  error: '#FF6B6B',
  errorDark: '#E85555',
  errorContainer: 'rgba(255, 107, 107, 0.15)',
  onError: '#0B0B12',
  onErrorContainer: '#FFD4D4',

  warning: '#FFB84D',
  warningDark: '#E6A040',
  warningContainer: 'rgba(255, 184, 77, 0.12)',
  onWarning: '#0B0B12',

  success: '#5BE49B',
  successDark: '#3DC982',
  successContainer: 'rgba(91, 228, 155, 0.12)',
  onSuccess: '#0B0B12',

  background: '#0B0B12',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceTranslucent: 'rgba(20, 20, 32, 0.55)',
  surfaceVariant: 'rgba(255, 255, 255, 0.07)',
  surfaceElevated: 'rgba(255, 255, 255, 0.07)',

  outline: 'rgba(255, 255, 255, 0.08)',
  outlineVariant: 'rgba(255, 255, 255, 0.04)',
  borderHairline: 'rgba(255, 255, 255, 0.06)',

  text: '#F0EEF8',
  textSecondary: 'rgba(240, 238, 248, 0.62)',
  textTertiary: 'rgba(240, 238, 248, 0.38)',
  textInverse: '#0B0B12',

  income: '#5BE49B',
  incomeBg: 'rgba(91, 228, 155, 0.12)',
  expense: '#FF6B6B',
  expenseBg: 'rgba(255, 107, 107, 0.12)',
  transfer: '#6FB7FF',
  transferBg: 'rgba(111, 183, 255, 0.12)',

  border: 'rgba(255, 255, 255, 0.08)',

  scrim: 'rgba(0, 0, 0, 0.65)',
  backdrop: 'rgba(0, 0, 0, 0.75)',

  gradientPrimary: ['#7B5EFF', '#34D8C9'] as const,
  gradientHero: ['#3B1E8A', '#1A0F4D', '#0B0B12'] as const,
  borderGradient: [
    'rgba(123, 94, 255, 0.6)',
    'rgba(52, 216, 201, 0.4)',
  ] as const,

  /** @deprecated Prefer gradientHero — kept for callers using cardGradient */
  cardGradient: ['#3B1E8A', '#1A0F4D', '#252538'] as const,
} as const;

export const CATEGORY_COLORS = [
  '#7B5EFF',
  '#6FB7FF',
  '#34D8C9',
  '#FF8A65',
  '#CE93D8',
  '#F48FB1',
  '#4DD0E1',
  '#A1887F',
  '#90A4AE',
  '#AED581',
  '#64B5F6',
  '#FF6B6B',
  '#5BE49B',
  '#FFB74D',
  '#9575CD',
  '#DCE775',
  '#4FC3F7',
  '#FFD54F',
  '#B0BEC5',
  '#E57373',
] as const;

export type AppColors = typeof colors;
