/**
 * Renders the global toast queue — glass cards dropping in from the top
 * with a spring, auto-dismissing. Mount ONCE in the root layout.
 */
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useToastStore, type ToastItem } from '../../stores/toastStore';
import { radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

const KIND_META = {
  success: { emoji: '✓', role: 'mint' },
  error: { emoji: '!', role: 'blood' },
  info: { emoji: 'i', role: 'violet' },
} as const;

function ToastCard({ item }: { item: ToastItem }) {
  const theme = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);
  const meta = KIND_META[item.kind];
  const accent = theme[meta.role];

  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(160)}>
      <Pressable onPress={() => dismiss(item.id)} accessibilityRole="alert">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: theme.raised,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: theme.glassBorderStrong,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            shadowColor: '#000',
            shadowOpacity: theme.scheme === 'dark' ? 0.5 : 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" color="onAccent" style={{ fontSize: 12, letterSpacing: 0 }}>
              {meta.emoji}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{item.title}</Text>
            {item.message ? (
              <Text variant="footnote" color="secondary">
                {item.message}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + space.xs,
        left: space.md,
        right: space.md,
        gap: space.xs,
        zIndex: 1000,
      }}
      pointerEvents="box-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </View>
  );
}
