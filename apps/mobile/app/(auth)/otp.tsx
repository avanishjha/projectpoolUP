/**
 * OTP verification (FRS §1.1): 6 boxes over a hidden input, auto-submit on
 * the 6th digit, 30s resend cooldown (max 3), 3 wrong = 5-minute lock,
 * wrong-code shake.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../src/lib/nav';
import { OtpBoxes } from '../../src/features/auth/OtpBoxes';
import { formatNational } from '../../src/features/auth/phone';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, haptic, screenX, space, Text, useTheme } from '../../src/ui';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_S = 30;
const MAX_RESENDS = 3;
const MAX_WRONG = 3;
const LOCK_MINUTES = 5;

export default function OtpScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // One ticker drives both the resend cooldown and the lockout countdown.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const locked = lockedUntil !== null && now < lockedUntil;
  const lockSecondsLeft = locked ? Math.ceil((lockedUntil - now) / 1000) : 0;

  useEffect(() => {
    if (lockedUntil !== null && !locked) {
      setLockedUntil(null);
      setWrongCount(0);
      setError(null);
    }
  }, [locked, lockedUntil]);

  const submit = async (value: string) => {
    if (!phone || verifying || locked) return;
    setVerifying(true);
    const { error: verifyError } = await verifyOtp(phone, value);
    setVerifying(false);

    if (verifyError) {
      haptic.error();
      setCode('');
      const wrong = wrongCount + 1;
      setWrongCount(wrong);
      if (wrong >= MAX_WRONG) {
        setLockedUntil(Date.now() + LOCK_MINUTES * 60_000);
        setError(`Too many wrong codes. Locked for ${LOCK_MINUTES} minutes.`);
      } else {
        setError(`${verifyError} (${MAX_WRONG - wrong} attempts left)`);
      }
      return;
    }
    haptic.success();
    // Session lands via onAuthStateChange; the root guard routes to tabs.
  };

  const onChange = (clean: string) => {
    if (locked) return;
    setCode(clean);
    if (error && !locked) setError(null);
    if (clean.length === OTP_LENGTH) void submit(clean);
  };

  const resend = async () => {
    if (!phone || cooldown > 0 || resendsLeft <= 0 || locked) return;
    setResendsLeft((r) => r - 1);
    setCooldown(RESEND_COOLDOWN_S);
    const { error: sendError } = await requestOtp(phone);
    if (sendError) {
      haptic.error();
      setError(sendError);
    } else {
      haptic.tap();
    }
  };

  const national = phone?.replace('+91', '') ?? '';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        paddingHorizontal: screenX,
        paddingTop: insets.top + space.massive,
      }}
    >
      <Text variant="title1">Enter the code</Text>
      <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
        Sent to +91 {formatNational(national)} ·{' '}
        <Text variant="body" color="ember" onPress={() => goBack('/phone')}>
          change
        </Text>
      </Text>

      <View style={{ marginTop: space.huge }}>
        <OtpBoxes value={code} onChange={onChange} error={!!error && !locked} disabled={locked} />
      </View>

      {error ? (
        <Text variant="footnote" color="blood" style={{ marginTop: space.sm }}>
          {locked
            ? `Too many wrong codes. Try again in ${Math.floor(lockSecondsLeft / 60)}:${String(lockSecondsLeft % 60).padStart(2, '0')}`
            : error}
        </Text>
      ) : null}

      <View style={{ marginTop: space.xl, alignItems: 'flex-start' }}>
        {resendsLeft > 0 ? (
          <Button
            label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            variant="ghost"
            size="md"
            disabled={cooldown > 0 || locked}
            loading={verifying}
            onPress={resend}
          />
        ) : (
          <Text variant="footnote" color="muted">
            Resend limit reached. Go back and re-enter your number.
          </Text>
        )}
      </View>
    </View>
  );
}
