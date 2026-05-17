export const radius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 22,
  xxl: 30,
  capsule: 28,
  full: 9999,
} as const;

export type AppRadius = typeof radius;
