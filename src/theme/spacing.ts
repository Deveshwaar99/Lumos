export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  section: 44,
  cardInset: 16,
} as const;

export type AppSpacing = typeof spacing;
