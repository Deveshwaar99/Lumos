import { interFontFamily } from './fonts';

const fontFamily = interFontFamily.regular;
const fontSemiBold = interFontFamily.semiBold;
const fontBold = interFontFamily.bold;
const fontExtraBold = interFontFamily.extraBold;

export const typography = {
  displayLarge: {
    fontFamily: fontExtraBold,
    fontSize: 57,
    fontWeight: '800' as const,
    lineHeight: 64,
    letterSpacing: -0.35,
  },
  displayMedium: {
    fontFamily: fontExtraBold,
    fontSize: 45,
    fontWeight: '800' as const,
    lineHeight: 52,
    letterSpacing: -0.2,
  },
  displaySmall: {
    fontFamily: fontBold,
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
    letterSpacing: -0.15,
  },

  headlineLarge: {
    fontFamily: fontExtraBold,
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
  },
  headlineMedium: {
    fontFamily: fontBold,
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  headlineSmall: {
    fontFamily: fontBold,
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
  },

  titleLarge: {
    fontFamily: fontBold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  titleMedium: {
    fontFamily: fontSemiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.12,
  },
  titleSmall: {
    fontFamily: fontSemiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.08,
  },

  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
    letterSpacing: 0.12,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0.22,
  },
  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.35,
  },

  labelLarge: {
    fontFamily: fontSemiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.08,
  },
  labelMedium: {
    fontFamily: fontSemiBold,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.45,
  },
  labelSmall: {
    fontFamily: fontSemiBold,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.45,
  },
} as const;

export type AppTypography = typeof typography;
