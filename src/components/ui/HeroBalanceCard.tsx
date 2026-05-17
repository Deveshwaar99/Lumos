import { Canvas, Fill, LinearGradient as SkiaLinearGradient, vec } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';
import AmountText from './AmountText';

const AnimatedView = Animated.createAnimatedComponent(View);

export type HeroBalanceCardProps = {
  income: number;
  expense: number;
  balance: number;
  currencySymbol?: string;
  decimalPlaces?: number;
  periodLabel?: string;
};

export function HeroBalanceCard({
  income,
  expense,
  balance,
  currencySymbol,
  decimalPlaces,
  periodLabel,
}: HeroBalanceCardProps) {
  const [width, setWidth] = useState(0);
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const skiaPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.45,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.outer} onLayout={onLayout}>
      <LinearGradient
        colors={[...colors.gradientHero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {width > 0 ? (
        <AnimatedView style={[styles.skia, skiaPulseStyle]} pointerEvents="none">
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Fill>
              <SkiaLinearGradient
                start={vec(0, 0)}
                end={vec(width, 100)}
                colors={[
                  'rgba(123, 94, 255, 0.55)',
                  'rgba(52, 216, 201, 0.18)',
                  'rgba(11, 11, 18, 0)',
                ]}
                positions={[0, 0.42, 1]}
              />
            </Fill>
          </Canvas>
        </AnimatedView>
      ) : null}

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Expense</Text>
            <AmountText
              cents={expense}
              currencySymbol={currencySymbol}
              decimalPlaces={decimalPlaces}
              tone="expense"
              size="title"
              style={styles.metricValue}
            />
          </View>

          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Income</Text>
            <AmountText
              cents={income}
              currencySymbol={currencySymbol}
              decimalPlaces={decimalPlaces}
              tone="income"
              size="title"
              style={styles.metricValue}
            />
          </View>

          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Balance</Text>
            <AmountText
              cents={balance}
              currencySymbol={currencySymbol}
              decimalPlaces={decimalPlaces}
              tone="default"
              size="title"
              style={styles.metricValue}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
    minHeight: 72,
    justifyContent: 'center',
  },
  skia: {
    ...StyleSheet.absoluteFillObject,
    height: 100,
    top: 0,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  metricBlock: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  metricLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default HeroBalanceCard;
