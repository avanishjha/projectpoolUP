/** Profile — identity, stats, settings. Real profile lands with F1.x; theme control lives here. */
import { View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore, type ThemePreference } from '../../src/stores/uiStore';
import { Avatar, Button, Chip, GlassCard, screenX, space, Text } from '../../src/ui';

const THEME_OPTIONS: { key: ThemePreference; label: string; emoji: string }[] = [
  { key: 'system', label: 'System', emoji: '📱' },
  { key: 'dark', label: 'Dark', emoji: '🌙' },
  { key: 'light', label: 'Light', emoji: '☀️' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const preference = useUiStore((s) => s.themePreference);
  const setPreference = useUiStore((s) => s.setThemePreference);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View style={{ paddingHorizontal: screenX, gap: space.lg }}>
        <Text variant="title1">Profile</Text>

        <GlassCard strong radius="xl">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name="CONQR Member" size="lg" />
            <View style={{ gap: 2 }}>
              <Text variant="headline">Sign in to CONQR</Text>
              <Text variant="footnote" color="secondary">
                Phone OTP login lands with F1.1
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <Text variant="caption" color="muted" style={{ marginBottom: space.sm }}>
            Appearance
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {THEME_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                emoji={opt.emoji}
                selected={preference === opt.key}
                onPress={() => setPreference(opt.key)}
              />
            ))}
          </View>
        </GlassCard>

        {__DEV__ && (
          <Link href="/dev/gallery" asChild>
            <Button label="Design Gallery (dev)" variant="secondary" size="md" />
          </Link>
        )}
      </View>
    </View>
  );
}
