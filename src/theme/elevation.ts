import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

function makeElevation(level: number): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: level };
  }
  if (level === 0) return {};
  const offset = Math.min(level, 8);
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Math.ceil(offset / 2) },
    shadowOpacity: 0.12 + level * 0.025,
    shadowRadius: offset,
  };
}

/** Soft colored glow for FAB / hero (iOS shadow; Android uses elevation). */
function makeGlow(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 10 };
  }
  return {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  };
}

export const elevation = {
  none: makeElevation(0),
  sm: makeElevation(1),
  md: makeElevation(2),
  lg: makeElevation(4),
  xl: makeElevation(8),
  glow: makeGlow(),
} as const;

export type AppElevation = typeof elevation;
