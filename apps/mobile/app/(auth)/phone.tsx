/** The front door: phone number entry (UC-01/UC-02 — one screen for both). */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeIndianPhone } from '../../src/features/auth/phone';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, haptic, Input, screenX, space, Text, useTheme } from '../../src/ui';

export default function PhoneScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const requestOtp = useAuthStore((s) => s.requestOtp);

  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const parsed = normalizeIndianPhone(digits);
    if (!parsed.ok) {
      haptic.error();
      setError(parsed.error);
      return;
    }
    setError(null);
    setSending(true);
    const { error: sendError } = await requestOtp(parsed.e164);
    setSending(false);
    if (sendError) {
      haptic.error();
      setError(sendError);
      return;
    }
    haptic.success();
    router.push({ pathname: '/otp', params: { phone: parsed.e164 } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <LinearGradient
        colors={
          theme.scheme === 'dark'
            ? ['rgba(214,85,58,0.08)', 'rgba(0,0,0,0)']
            : ['rgba(185,74,47,0.05)', 'rgba(0,0,0,0)']
        }
        style={{ position: 'absolute', top: -120, left: -80, width: 400, height: 400, borderRadius: 400, pointerEvents: 'none' }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: screenX,
            paddingTop: insets.top + space.massive,
            paddingBottom: insets.bottom + space.xl,
          }}
        >
          <Text variant="display">CONQR</Text>
          <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
            Paisa lagao, discipline dikhao.
          </Text>

          <View style={{ marginTop: space.huge, gap: space.md }}>
            <Input
              label="Mobile number"
              prefix="+91"
              value={digits}
              onChangeText={(t) => {
                setDigits(t.replace(/\D/g, '').slice(0, 10));
                if (error) setError(null);
              }}
              error={error}
              placeholder="98765 43210"
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={10}
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="go"
              accessibilityLabel="Mobile number"
            />
            <Button
              label="Send OTP"
              fullWidth
              loading={sending}
              disabled={digits.length !== 10}
              onPress={submit}
            />
          </View>

          <View style={{ flex: 1 }} />
          <Text variant="footnote" color="muted" style={{ textAlign: 'center' }}>
            18+ only. By continuing you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
