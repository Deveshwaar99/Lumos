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
    <View
      style={[
        styles.outer,
        border && styles.border,
        style,
        intensity > 32 && styles.outerElevated,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  outerElevated: {
    backgroundColor: colors.surfaceElevated,
  },
  border: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
  },
  inner: {
    position: 'relative',
  },
});

export default GlassCard;
