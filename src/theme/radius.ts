export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
  capsule: 28,
  full: 9999,
} as const;

export type AppRadius = typeof radius;
