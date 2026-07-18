/**
 * OTP verification (FRS §1.1): 6 boxes over a hidden input, auto-submit on
 * the 6th digit, 30s resend cooldown (max 3), 3 wrong = 5-minute lock,
 * wrong-code shake. The whole screen is one focus target — tap anywhere on
 * the boxes to summon the keyboard.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { formatNational } from '../../src/features/auth/phone';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, fonts, haptic, radii, screenX, space, Text, useTheme } from '../../src/ui';

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

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

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
      // Lock expired — clean slate.
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
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
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

  const onChange = (t: string) => {
    if (locked) return;
    const clean = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
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
        <Text variant="body" color="ember" onPress={() => router.back()}>
          change
        </Text>
      </Text>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityLabel="OTP code entry"
        style={{ marginTop: space.huge }}
      >
        <Animated.View style={[{ flexDirection: 'row', gap: space.xs }, shakeStyle]}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const filled = i < code.length;
            const active = i === code.length && !locked;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 60,
                  borderRadius: radii.md,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: error && !locked
                    ? theme.blood
                    : active
                      ? theme.ember
                      : theme.glassBorderStrong,
                  backgroundColor: theme.glassSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: locked ? 0.4 : 1,
                }}
              >
                {/* lineHeight must cover fontSize or iOS clips glyph tops */}
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 32, color: theme.textPrimary }}>
                  {filled ? code[i] : ''}
                </Text>
              </View>
            );
          })}
        </Animated.View>
        {/* Hidden real input — one field, six faces. */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          autoFocus
          editable={!locked}
          style={{ position: 'absolute', opacity: 0, height: 60, width: '100%' }}
        />
      </Pressable>

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
