export const colors = {
  primary: '#6453B8',
  primaryLight: '#8B7DD1',
  primaryDark: '#4A3D8F',
  primaryContainer: '#1E1545',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#C5BFEF',

  secondary: '#5C6BC0',
  secondaryLight: '#7986CB',
  secondaryDark: '#3949AB',
  secondaryContainer: '#1A237E',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#C5CAE9',

  tertiary: '#26A69A',
  tertiaryContainer: '#004D40',

  error: '#EF5350',
  errorDark: '#C62828',
  errorContainer: '#93000A',
  onError: '#FFFFFF',
  onErrorContainer: '#FFCDD2',

  warning: '#FFB300',
  warningDark: '#FF8F00',
  warningContainer: '#3E2723',
  onWarning: '#212121',

  success: '#4CAF50',
  successDark: '#388E3C',
  successContainer: '#1B5E20',
  onSuccess: '#FFFFFF',

  background: '#1A1A2E',
  surface: '#252540',
  surfaceVariant: '#2F2F4A',
  surfaceElevated: '#2F2F4A',

  outline: '#3D3D5C',
  outlineVariant: '#2F2F4A',

  text: '#E8E6F0',
  textSecondary: '#9896A8',
  textTertiary: '#6E6C82',
  textInverse: '#1A1A2E',

  income: '#4CAF50',
  incomeBg: '#1B5E20',
  expense: '#EF5350',
  expenseBg: '#93000A',
  transfer: '#42A5F5',
  transferBg: '#0D47A1',

  border: '#2F2F4A',

  scrim: 'rgba(0, 0, 0, 0.6)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
} as const;

export const CATEGORY_COLORS = [
  '#6453B8',
  '#5C6BC0',
  '#FF7043',
  '#AB47BC',
  '#EC407A',
  '#26C6DA',
  '#8D6E63',
  '#78909C',
  '#9CCC65',
  '#42A5F5',
  '#EF5350',
  '#26A69A',
  '#FFA726',
  '#7E57C2',
  '#D4E157',
  '#29B6F6',
  '#FFCA28',
  '#BDBDBD',
  '#E53935',
] as const;

export type AppColors = typeof colors;
