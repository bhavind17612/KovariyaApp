import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { borderRadius, colors } from '../theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Neutral fill for placeholder blocks. */
const SKELETON_BASE = colors.surfaceMuted;
/** Pure-white sheen fades in/out so it reads over any neutral block. */
const SHEEN_COLORS = [
  'rgba(255, 255, 255, 0)',
  'rgba(255, 255, 255, 0.55)',
  'rgba(255, 255, 255, 0)',
] as const;
const SHIMMER_DURATION_MS = 1300;

export type SkeletonBoxProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A single static placeholder block. Pair one <SkeletonShimmer/> per card to
 * animate every block at once (cheapest, smoothest approach).
 */
export function SkeletonBox({
  width = '100%',
  height = 14,
  radius = borderRadius.small,
  style,
}: SkeletonBoxProps) {
  return (
    <View style={[{ width, height, borderRadius: radius, backgroundColor: SKELETON_BASE }, style]} />
  );
}

/**
 * One animated sheen that sweeps horizontally across its parent card, overlaying
 * all SkeletonBox children. Drop a single instance as the last child of an
 * overflow-hidden card. The animation runs entirely on the UI thread (Reanimated),
 * so there are no per-frame JS re-renders.
 */
export function SkeletonShimmer() {
  const containerWidth = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const sweepStyle = useAnimatedStyle(() => ({
    // Hidden until measured to avoid a static sheen flash on first frame.
    opacity: containerWidth.value > 0 ? 1 : 0,
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-containerWidth.value, containerWidth.value]
        ),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(e) => {
        containerWidth.value = e.nativeEvent.layout.width;
      }}
      style={StyleSheet.absoluteFill}
    >
      <AnimatedLinearGradient
        colors={SHEEN_COLORS}
        locations={[0.35, 0.5, 0.65]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, sweepStyle]}
      />
    </Animated.View>
  );
}
