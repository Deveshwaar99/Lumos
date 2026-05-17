import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

export type GlassCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** Blur intensity (iOS). Android uses fallback tint only. */
  intensity?: number;
  border?: boolean;
};

export function GlassCard({
  children,
  style,
  intensity = 28,
  border = true,
}: GlassCardProps) {
  return (
    <View style={[styles.outer, border && styles.border, style]}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tint} />
      </View>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceTranslucent,
  },
  border: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 11, 18, 0.35)',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassCard;
