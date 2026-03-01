import { MD3DarkTheme } from 'react-native-paper';
import { colors, CATEGORY_COLORS } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography } from './typography';
import { elevation } from './elevation';

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryContainer,
    onPrimary: colors.onPrimary,
    onPrimaryContainer: colors.onPrimaryContainer,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryContainer,
    onSecondary: colors.onSecondary,
    onSecondaryContainer: colors.onSecondaryContainer,
    tertiary: colors.tertiary,
    tertiaryContainer: colors.tertiaryContainer,
    error: colors.error,
    errorContainer: colors.errorContainer,
    onError: colors.onError,
    onErrorContainer: colors.onErrorContainer,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    surfaceDisabled: colors.outlineVariant,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    onSurfaceDisabled: colors.textTertiary,
    onBackground: colors.text,
    inverseSurface: colors.text,
    inverseOnSurface: colors.background,
    inversePrimary: colors.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: colors.surfaceElevated,
      level4: colors.surfaceElevated,
      level5: colors.surfaceElevated,
    },
  },
  roundness: radius.md,
};

export { colors, CATEGORY_COLORS, spacing, radius, typography, elevation };

export const THEME = colors;
