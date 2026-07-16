import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, type PressableScaleProps } from '../foundation/PressableScale';
import { fonts, radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColorRole } from '../theme/themes';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableScaleProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<Size, number> = { md: 48, lg: 56 };

/**
 * Primary: ember gradient with a restrained glow — THE call to action, one
 * per screen. Secondary: glass. Ghost: bare text. Danger: crimson-tinted
 * glass for destructive confirms.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...press
}: ButtonProps) {
  const theme = useTheme();
  const height = HEIGHT[size];
  const isDisabled = disabled || loading;
  // Loading keeps its full look (just not interactive); a truly disabled
  // primary drops the gradient for flat glass — dimming a gradient reads as mud.
  const showGradient = variant === 'primary' && !(disabled && !loading);

  const labelColor: ThemeColorRole =
    variant === 'primary' ? (showGradient ? 'onAccent' : 'muted')
    : variant === 'danger' ? 'blood'
    : variant === 'ghost' ? 'secondary'
    : 'primary';

  const container: ViewStyle = {
    height,
    borderRadius: size === 'lg' ? radii.lg : radii.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    ...(fullWidth ? { alignSelf: 'stretch' as const } : { alignSelf: 'flex-start' as const }),
    ...(variant === 'secondary' && {
      backgroundColor: theme.glassSurfaceStrong,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.glassBorderStrong,
    }),
    ...(variant === 'primary' && !showGradient && {
      backgroundColor: theme.glassSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.glassBorder,
    }),
    ...(variant === 'danger' && {
      backgroundColor: theme.scheme === 'dark' ? 'rgba(201,87,98,0.10)' : 'rgba(176,71,81,0.08)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.shameBorder,
    }),
    ...(disabled && !loading && variant !== 'primary' && { opacity: 0.4 }),
  };

  const glow = showGradient && !loading ? theme.glowEmber : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      dimWhenDisabled={false}
      hapticKind={variant === 'danger' ? 'warning' : 'tap'}
      style={[container, glow, style]}
      {...press}
    >
      {showGradient && (
        <LinearGradient
          colors={theme.gradients.ember}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
      )}
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.textOnAccent : theme.textSecondary} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Text
            color={labelColor}
            style={{ fontFamily: fonts.textSemiBold, fontSize: size === 'lg' ? 16 : 15, letterSpacing: -0.2 }}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
