import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  displayLarge: {
    fontFamily,
    fontSize: 57,
    fontWeight: '800' as const,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily,
    fontSize: 45,
    fontWeight: '700' as const,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily,
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
  },

  headlineLarge: {
    fontFamily,
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
  },
  headlineMedium: {
    fontFamily,
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  headlineSmall: {
    fontFamily,
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
  },

  titleLarge: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  titleMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.4,
  },

  labelLarge: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
} as const;

export type AppTypography = typeof typography;
