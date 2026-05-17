import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

/** Pass to `useFonts` from `expo-font`. */
export const interFontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} as const;

/** Use in `StyleSheet` / `Text` where Paper typescale is not applied. */
export const interFontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

/**
 * Overrides for react-native-paper MD3 `configureFonts`.
 * Per-face families avoid Android `fontWeight` + custom font conflicts.
 */
export const interPaperFontConfig = {
  displayLarge: {
    fontFamily: interFontFamily.extraBold,
    fontWeight: '800' as const,
  },
  displayMedium: {
    fontFamily: interFontFamily.extraBold,
    fontWeight: '800' as const,
  },
  displaySmall: {
    fontFamily: interFontFamily.bold,
    fontWeight: '700' as const,
  },
  headlineLarge: {
    fontFamily: interFontFamily.bold,
    fontWeight: '700' as const,
  },
  headlineMedium: {
    fontFamily: interFontFamily.bold,
    fontWeight: '700' as const,
  },
  headlineSmall: {
    fontFamily: interFontFamily.bold,
    fontWeight: '700' as const,
  },
  titleLarge: {
    fontFamily: interFontFamily.bold,
    fontWeight: '700' as const,
  },
  titleMedium: {
    fontFamily: interFontFamily.semiBold,
    fontWeight: '600' as const,
  },
  titleSmall: {
    fontFamily: interFontFamily.semiBold,
    fontWeight: '600' as const,
  },
  labelLarge: {
    fontFamily: interFontFamily.semiBold,
    fontWeight: '600' as const,
  },
  labelMedium: {
    fontFamily: interFontFamily.semiBold,
    fontWeight: '600' as const,
  },
  labelSmall: {
    fontFamily: interFontFamily.semiBold,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontFamily: interFontFamily.regular,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: interFontFamily.regular,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: interFontFamily.regular,
    fontWeight: '400' as const,
  },
  default: {
    fontFamily: interFontFamily.regular,
    fontWeight: '400' as const,
  },
} as const;
