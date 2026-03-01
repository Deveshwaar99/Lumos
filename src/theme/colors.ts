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

  background: '#2D2B2B',
  surface: '#3A3836',
  surfaceVariant: '#4A4845',
  surfaceElevated: '#4A4845',

  outline: '#5A5855',
  outlineVariant: '#4A4845',

  text: '#E8E4DE',
  textSecondary: '#9E9A94',
  textTertiary: '#7A7672',
  textInverse: '#2D2B2B',

  income: '#4CAF50',
  incomeBg: '#1B5E20',
  expense: '#EF5350',
  expenseBg: '#93000A',
  transfer: '#42A5F5',
  transferBg: '#0D47A1',

  border: '#4A4845',

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
