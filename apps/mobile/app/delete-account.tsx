/**
 * Account deletion (FRS §1.3): honest warning (active pools continue, money
 * obligations persist, 30-day retention) → OTP re-verification → soft delete
 * → sign out. Deliberately high-friction — this is destructive and involves
 * real money.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpBoxes } from '../src/features/auth/OtpBoxes';
import { fetchActivePoolCount, requestAccountDeletion } from '../src/features/auth/deleteAccount';
import { useAuthStore } from '../src/stores/authStore';
import { toast } from '../src/stores/toastStore';
import { Button, GlassCard, haptic, screenX, space, Text, useTheme } from '../src/ui';

const OTP_LENGTH = 6;

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signOut = useAuthStore((s) => s.signOut);

  const phone = session?.user.phone ? `+${session.user.phone}` : null;

  const [phase, setPhase] = useState<'warn' | 'otp'>('warn');
  const [activePools, setActivePools] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePoolCount()
      .then(setActivePools)
      .catch(() => setActivePools(0));
  }, []);

  const startVerification = async () => {
    if (!phone || sending) return;
    setSending(true);
    const { error: sendError } = await requestOtp(phone);
    setSending(false);
    if (sendError) {
      haptic.error();
      toast.error('Could not send code', sendError);
      return;
    }
    haptic.tap();
    setPhase('otp');
  };

  const onCode = (clean: string) => {
    setCode(clean);
    if (error) setError(null);
    if (clean.length === OTP_LENGTH) void confirmDeletion(clean);
  };

  const confirmDeletion = async (value: string) => {
    if (!phone || verifying) return;
    setVerifying(true);
    const { error: verifyError } = await verifyOtp(phone, value);
    if (verifyError) {
      setVerifying(false);
      setCode('');
      setError('Invalid or expired code. Try again.');
      haptic.error();
      return;
    }
    try {
      await requestAccountDeletion();
      haptic.success();
      toast.info('Account deleted', 'Your data is kept 30 days, then erased. Take care 🫡');
      await signOut(); // root guard routes to the login screen
    } catch {
      setVerifying(false);
      haptic.error();
      toast.error('Deletion failed', 'Something went wrong. Please try again.');
    }
  };

  const national = phone?.replace('+91', '') ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.xl,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.lg }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>

        {phase === 'warn' ? (
          <>
            <Text style={{ fontSize: 44, lineHeight: 52 }}>⚠️</Text>
            <Text variant="title1" style={{ marginTop: space.sm }}>
              Delete your account?
            </Text>
            <Text variant="body" color="secondary" style={{ marginTop: space.xs }}>
              This is permanent. Before you go, know what happens:
            </Text>

            <GlassCard tone="shame" style={{ marginTop: space.lg }}>
              <View style={{ gap: space.sm }}>
                {activePools !== null && activePools > 0 && (
                  <Text variant="bodyMedium">
                    • You have {activePools} active pool{activePools > 1 ? 's' : ''}. They keep
                    running and any fines still apply — deleting doesn't end them.
                  </Text>
                )}
                <Text variant="bodyMedium">
                  • Your money obligations (buy-ins, fines, payouts) stay in place until those
                  pools finish.
                </Text>
                <Text variant="bodyMedium">
                  • Your data is kept for 30 days for reconciliation, then permanently erased.
                </Text>
                <Text variant="bodyMedium">
                  • Your username is released after that. You can't undo this.
                </Text>
              </View>
            </GlassCard>

            <View style={{ flex: 1 }} />
            <Button
              label="Continue to verify"
              variant="danger"
              fullWidth
              loading={sending}
              onPress={startVerification}
              style={{ marginTop: space.xl }}
            />
            <Button
              label="Keep my account"
              variant="ghost"
              size="md"
              onPress={() => goBack()}
              style={{ alignSelf: 'center', marginTop: space.xs }}
            />
          </>
        ) : (
          <>
            <Text variant="title1">Confirm it's you</Text>
            <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
              Enter the code sent to +91 {national} to delete your account.
            </Text>

            <View style={{ marginTop: space.huge }}>
              <OtpBoxes value={code} onChange={onCode} error={!!error} disabled={verifying} />
            </View>
            {error ? (
              <Text variant="footnote" color="blood" style={{ marginTop: space.sm }}>
                {error}
              </Text>
            ) : null}
            {verifying ? (
              <Text variant="footnote" color="muted" style={{ marginTop: space.sm }}>
                Deleting…
              </Text>
            ) : null}

            <View style={{ flex: 1 }} />
            <Button
              label="Cancel"
              variant="ghost"
              size="md"
              onPress={() => goBack()}
              style={{ alignSelf: 'center', marginTop: space.xl }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
