import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radius, typography } from '../../theme';

export type GradientButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  left?: ReactNode;
};

export function GradientButton({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  left,
}: GradientButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={[...colors.gradientPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        {left}
        <Text style={[styles.label, textStyle]}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
  },
  label: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.45 },
});

export default GradientButton;
