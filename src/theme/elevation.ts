import { Platform, ViewStyle } from 'react-native';

function makeElevation(level: number): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: level };
  }
  if (level === 0) return {};
  const offset = Math.min(level, 8);
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Math.ceil(offset / 2) },
    shadowOpacity: 0.08 + level * 0.02,
    shadowRadius: offset,
  };
}

export const elevation = {
  none: makeElevation(0),
  sm: makeElevation(1),
  md: makeElevation(2),
  lg: makeElevation(4),
  xl: makeElevation(8),
} as const;

export type AppElevation = typeof elevation;
