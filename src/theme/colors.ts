export const colors = {
  primary: '#FC4C02',
  primaryLight: '#FF7A3D',
  primaryDark: '#C63A00',
  primaryContainer: '#3D1200',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFB899',

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

  background: '#000000',
  surface: '#1A1A1A',
  surfaceVariant: '#2A2A2A',
  surfaceElevated: '#2A2A2A',

  outline: '#3A3A3C',
  outlineVariant: '#2A2A2A',

  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  textInverse: '#000000',

  income: '#4CAF50',
  incomeBg: '#1B5E20',
  expense: '#EF5350',
  expenseBg: '#93000A',
  transfer: '#42A5F5',
  transferBg: '#0D47A1',

  border: '#2A2A2A',

  scrim: 'rgba(0, 0, 0, 0.6)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
} as const;

export const CATEGORY_COLORS = [
  '#FC4C02',
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
