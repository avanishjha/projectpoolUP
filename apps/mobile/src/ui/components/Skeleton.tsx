/** Loading placeholder — slow luminance breathing, never a spinner. */
import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { radii, type RadiusToken } from '../tokens';
import { useTheme } from '../theme/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: RadiusToken;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.4,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        {
          width,
          height,
          borderRadius: radii[radius],
          backgroundColor: theme.skeleton,
        },
        animated,
        style,
      ]}
    />
  );
}
