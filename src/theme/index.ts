import { configureFonts, MD3DarkTheme } from 'react-native-paper';
import { CATEGORY_COLORS, colors } from './colors';
import { elevation } from './elevation';
import { interFontAssets, interFontFamily, interPaperFontConfig } from './fonts';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

const fonts = configureFonts({
  isV3: true,
  config: interPaperFontConfig,
});

export const paperTheme = {
  ...MD3DarkTheme,
  fonts,
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

export {
  colors,
  CATEGORY_COLORS,
  spacing,
  radius,
  typography,
  elevation,
  interFontAssets,
  interFontFamily,
  interPaperFontConfig,
};

export const THEME = colors;
