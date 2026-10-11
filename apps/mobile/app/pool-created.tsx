/**
 * Pool-created reveal (F2.1 tail + F2.2 invite): celebrate, then hand over
 * every way to invite — QR, copyable code, and a native share carrying the
 * deep link. Uninstalled recipients need a universal (https) link — that
 * lands with a real domain later; the code always works manually.
 */
import { Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { toast } from '../src/stores/toastStore';
import { Button, fonts, GlassCard, haptic, screenX, space, Text, useTheme } from '../src/ui';

export default function PoolCreatedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();

  const deepLink = Linking.createURL('/join-pool', { queryParams: { code: code ?? '' } });
  const shareMessage = `Join my CONQR pool "${name}" 🔥\nInvite code: ${code}\n${deepLink}\n\nReal money on the line. Every single day.`;

  const share = async () => {
    haptic.tap();
    try {
      await Share.share({ message: shareMessage });
    } catch {
      toast.info('Invite code', code ?? '');
    }
  };

  const copy = async () => {
    haptic.success();
    await Clipboard.setStringAsync(code ?? '');
    toast.success('Code copied', `${code} is on your clipboard`);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        paddingHorizontal: screenX,
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.lg,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 56, lineHeight: 68, marginTop: space.md }}>🎉</Text>
      <Text variant="title1" style={{ textAlign: 'center', marginTop: space.xs }}>
        Pool created!
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center', marginTop: space.xxs }}>
        Get at least one more person in — a pool needs 2 to run, or it’s
        cancelled on the start date.
      </Text>

      <View style={{ alignSelf: 'stretch', marginTop: space.xl }}>
        <GlassCard strong radius="xl">
          <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
            <View style={{ padding: space.sm, backgroundColor: '#FFFFFF', borderRadius: 16 }}>
              <QRCode value={deepLink} size={148} backgroundColor="#FFFFFF" color="#111111" />
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text variant="caption" color="muted">
                Invite code
              </Text>
              <Text
                style={{
                  fontFamily: fonts.displayBold,
                  fontSize: 36,
                  lineHeight: 44,
                  letterSpacing: 8,
                  color: theme.textPrimary,
                }}
              >
                {code}
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignSelf: 'stretch', gap: space.xs }}>
        <Button label="Share invite" fullWidth onPress={share} />
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          <Button label="Copy code" variant="secondary" size="md" onPress={copy} style={{ flex: 1 }} />
          <Button
            label="Done"
            variant="ghost"
            size="md"
            onPress={() => router.replace('/')}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}
