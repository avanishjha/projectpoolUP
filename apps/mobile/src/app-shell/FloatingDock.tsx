/**
 * The CONQR dock — a floating glass pill detached from the screen edge.
 * Solves Android edge-to-edge collisions (it floats ABOVE the system nav via
 * safe-area insets) and reads premium on iOS.
 *
 * Material, best-available per platform:
 *   iOS 26+  → Apple's NATIVE Liquid Glass (expo-glass-effect / UIGlassEffect):
 *              real refraction, specular highlights, content reactions.
 *   elsewhere → BlurView + theme tint + sheen (our house glass recipe).
 */
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { haptic } from '../ui/foundation/haptics';
import { useTheme } from '../ui/theme/ThemeContext';
import { fonts, radii, space, springs } from '../ui/tokens';
import { Text } from '../ui/components/Text';

/** Bottom padding tab screens need so scroll content clears the dock. */
export const DOCK_CLEARANCE = 108;

const DOCK_HEIGHT = 64;

function DockItem({
  label,
  focused,
  icon,
  onPress,
}: {
  label: string;
  focused: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springs.snappy);
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: DOCK_HEIGHT }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 3 }, animated]}>
        <View
          style={{
            width: 34,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? theme.glassSurfaceStrong : 'transparent',
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontFamily: focused ? fonts.textSemiBold : fonts.textMedium,
            fontSize: 10,
            lineHeight: 12,
            color: focused ? theme.ember : theme.textMuted,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** True on iPhones running iOS 26+ inside a Liquid-Glass-capable binary. */
const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function FloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';

  const shadow = {
    shadowColor: '#000',
    shadowOpacity: dark ? 0.45 : 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  } as const;

  // Apple's material owns its own edges and highlights — no border, tint or
  // sheen on top of it. Our recipe provides all three everywhere else.
  const Pill = NATIVE_GLASS ? GlassView : View;
  const pillProps = NATIVE_GLASS
    ? ({ glassEffectStyle: 'regular', isInteractive: true } as const)
    : {};

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: space.lg,
        right: space.lg,
        bottom: insets.bottom + space.sm,
      }}
    >
      <Pill
        {...pillProps}
        style={[
          {
            height: DOCK_HEIGHT,
            borderRadius: radii.pill,
            overflow: 'hidden',
          },
          shadow,
          !NATIVE_GLASS && {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.glassBorderStrong,
          },
        ]}
      >
        {!NATIVE_GLASS && (
          <>
            <BlurView
              intensity={40}
              tint={dark ? 'dark' : 'light'}
              {...(Platform.OS === 'android' && {
                experimentalBlurMethod: 'dimezisBlurView' as const,
              })}
              style={StyleSheet.absoluteFill}
            />
            {/* Tint layer: keeps the dock legible over any content, and carries
                the look wherever native blur falls back. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: dark ? 'rgba(17,17,23,0.78)' : 'rgba(252,252,250,0.80)' },
              ]}
            />
            {/* 1px top sheen — same light-catch language as GlassCard */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: radii.pill / 8,
                right: radii.pill / 8,
                height: 1,
                backgroundColor: theme.glassSheen,
              }}
            />
          </>
        )}
        <View style={{ flexDirection: 'row', height: DOCK_HEIGHT }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            const label = options.title ?? route.name;
            const color = focused ? theme.ember : theme.textMuted;
            const icon = options.tabBarIcon?.({ focused, color, size: 21 }) ?? null;

            return (
              <DockItem
                key={route.key}
                label={label}
                focused={focused}
                icon={icon}
                onPress={() => {
                  haptic.select();
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </Pill>
    </View>
  );
}
