/**
 * The CONQR surface: quiet glass from layered translucency — a faint diagonal
 * fade, hairline border, 1px light-catch sheen. Real blur is reserved for
 * overlays. Adapts to theme (white-based glass on dark, ink-based on light).
 */
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, space, type RadiusToken } from '../tokens';
import { useTheme } from '../theme/ThemeContext';

export interface GlassCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  radius?: RadiusToken;
  /** Stronger fill for cards sitting directly on the canvas. */
  strong?: boolean;
  /** Crimson-tinted danger surface (Wall of Shame cards). */
  tone?: 'default' | 'shame';
  padded?: boolean;
}

export function GlassCard({
  children,
  style,
  radius = 'lg',
  strong = false,
  tone = 'default',
  padded = true,
}: GlassCardProps) {
  const theme = useTheme();
  const borderRadius = radii[radius];
  const fill = tone === 'shame' ? theme.shameSurface : theme.gradients.glassSheen;

  // Shadow lives on the OUTER layer (iOS clips shadows under overflow:hidden);
  // the gradient/sheen clip to the radius on an inner layer.
  return (
    <View
      style={[
        {
          borderRadius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tone === 'shame' ? theme.shameBorder : theme.glassBorder,
          backgroundColor: strong ? theme.glassSurfaceStrong : theme.glassSurface,
        },
        theme.cardShadow,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
      >
        <LinearGradient
          colors={fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* 1px top sheen — the light catching the glass edge (dark scheme only) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: borderRadius,
            right: borderRadius,
            height: 1,
            backgroundColor: tone === 'shame' ? theme.shameBorder : theme.glassSheen,
          }}
        />
      </View>
      <View style={padded ? { padding: space.md } : undefined}>{children}</View>
    </View>
  );
}
