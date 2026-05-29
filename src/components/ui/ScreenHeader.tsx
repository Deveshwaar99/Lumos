import type { ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const HEADER_SURFACE = 'rgba(13, 15, 22, 0.94)';
const HEADER_SURFACE_SCROLLED = 'rgba(17, 20, 30, 0.98)';

export type ScreenHeaderProps = {
  scrollY: SharedValue<number>;
  children: ReactNode;
  /** Scroll offset before scrim reaches full strength */
  threshold?: number;
  onHeightChange?: (height: number) => void;
};

export function ScreenHeader({
  scrollY,
  children,
  threshold = 72,
  onHeightChange,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const scrimStyle = useAnimatedStyle(() => {
    const tint = interpolate(
      scrollY.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      backgroundColor: tint < 0.5 ? HEADER_SURFACE : HEADER_SURFACE_SCROLLED,
    };
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top }]}
      pointerEvents="box-none"
      onLayout={handleLayout}
    >
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.baseLayer} />
        <AnimatedView style={[StyleSheet.absoluteFill, scrimStyle]} />
      </View>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  baseLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HEADER_SURFACE,
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 6,
  },
});

export default ScreenHeader;
