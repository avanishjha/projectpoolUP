/**
 * The tactile base of every touchable in CONQR: spring scale-down on press,
 * optional haptic, no opacity flicker. Compose — don't rebuild press
 * behaviour anywhere else.
 */
import { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { pressScale, springs } from '../tokens';
import { haptic, type HapticKind } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Semantic haptic fired on press-in. Pass null to disable. */
  hapticKind?: HapticKind | null;
  /** Override how far the element shrinks (defaults to token). */
  scaleTo?: number;
  /** Fade the element when disabled. Turn off when the caller styles its own disabled look. */
  dimWhenDisabled?: boolean;
}

export function PressableScale({
  style,
  hapticKind = 'tap',
  scaleTo = pressScale,
  dimWhenDisabled = true,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      scale.value = withSpring(scaleTo, springs.snappy);
      if (hapticKind) haptic[hapticKind]();
      onPressIn?.(e);
    },
    [scale, scaleTo, hapticKind, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      scale.value = withSpring(1, springs.snappy);
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, disabled && dimWhenDisabled && { opacity: 0.4 }, style]}
    />
  );
}
