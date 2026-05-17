import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, elevation } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type GlowFABProps = {
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  bottomInset?: number;
};

export function GlowFAB({
  icon = 'plus',
  onPress,
  style,
  accessibilityLabel,
  bottomInset = 16,
}: GlowFABProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 14, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 280 });
      }}
      onPress={onPress}
      style={[
        styles.wrap,
        { bottom: bottomInset },
        elevation.glow,
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={[...colors.gradientPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.circle}
      >
        <Icon source={icon} size={28} color={colors.onPrimary} />
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    alignSelf: 'flex-end',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlowFAB;
