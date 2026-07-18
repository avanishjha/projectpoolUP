/** Profile — the signed-in identity, appearance settings, sign out. */
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../../src/features/auth/useProfile';
import { topRoleBadge } from '../../src/features/auth/roleBadge';
import { useSubject } from '../../src/features/auth/useSubject';
import { useAuthStore } from '../../src/stores/authStore';
import { useUiStore, type ThemePreference } from '../../src/stores/uiStore';
import {
  Avatar,
  Button,
  Chip,
  GlassCard,
  haptic,
  screenX,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../src/ui';

const THEME_OPTIONS: { key: ThemePreference; label: string; emoji: string }[] = [
  { key: 'system', label: 'System', emoji: '📱' },
  { key: 'dark', label: 'Dark', emoji: '🌙' },
  { key: 'light', label: 'Light', emoji: '☀️' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const preference = useUiStore((s) => s.themePreference);
  const setPreference = useUiStore((s) => s.setThemePreference);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile, isPending } = useProfile();
  const subject = useSubject();
  const badge = subject ? topRoleBadge(subject.platformRoles) : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View style={{ paddingHorizontal: screenX, gap: space.lg }}>
        <Text variant="title1">Profile</Text>

        <GlassCard strong radius="xl">
          {isPending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Skeleton width={64} height={64} radius="pill" />
              <View style={{ gap: 8, flex: 1 }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size="lg" />
              <View style={{ gap: 4, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Text variant="headline">{profile?.display_name ?? 'CONQR Member'}</Text>
                  {badge && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: theme.scheme === 'dark' ? 'rgba(217,91,63,0.16)' : 'rgba(185,74,47,0.10)',
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.ember,
                      }}
                    >
                      <Text style={{ fontSize: 10, lineHeight: 14 }}>{badge.emoji}</Text>
                      <Text variant="caption" color="ember" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                        {badge.label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="footnote" color="secondary">
                  @{profile?.username} · Level {profile?.level ?? 1} · {profile?.xp ?? 0} XP
                </Text>
              </View>
            </View>
          )}
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

        <Button
          label="Sign Out"
          variant="danger"
          size="md"
          onPress={() => {
            haptic.warning();
            void signOut();
          }}
        />
      </View>
    </View>
  );
}
