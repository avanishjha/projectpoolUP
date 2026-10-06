/** Settings — account & legal. Pushed from Profile. */
import { Pressable, ScrollView, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../src/stores/toastStore';
import { GlassCard, haptic, screenX, space, Text, useTheme } from '../src/ui';

function Row({
  label,
  sublabel,
  danger,
  onPress,
}: {
  label: string;
  sublabel?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" color={danger ? 'blood' : 'primary'}>
          {label}
        </Text>
        {sublabel ? (
          <Text variant="footnote" color="secondary">
            {sublabel}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={danger ? theme.blood : theme.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.xl,
        }}
      >
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.lg }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          <Text variant="title2">Settings</Text>
        </Pressable>

        <Text variant="caption" color="muted" style={{ marginBottom: space.xs }}>
          Legal
        </Text>
        <GlassCard style={{ marginBottom: space.lg }}>
          <Row
            label="Terms of Service"
            onPress={() => toast.info('Terms coming soon', 'Legal docs land before launch (Week 9)')}
          />
          <View style={{ height: 1, backgroundColor: theme.glassBorder }} />
          <Row
            label="Privacy Policy"
            onPress={() => toast.info('Privacy Policy coming soon', 'DPDP-compliant, before launch')}
          />
        </GlassCard>

        <Text variant="caption" color="muted" style={{ marginBottom: space.xs }}>
          Account
        </Text>
        <GlassCard>
          <Row
            label="Delete account"
            sublabel="Permanently remove your CONQR account"
            danger
            onPress={() => router.push('/delete-account')}
          />
        </GlassCard>
      </ScrollView>
    </View>
  );
}
