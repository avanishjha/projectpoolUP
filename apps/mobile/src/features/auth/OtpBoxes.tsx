/**
 * Reusable 6-box OTP input: N faces over one hidden field, shake-on-error.
 * Shared by the login OTP screen and the account-deletion re-verify. Screen
 * logic (resend, lockout, submit) stays with the caller.
 */
import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { fonts, radii, space, Text, useTheme } from '../../ui';

export interface OtpBoxesProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  /** Renders boxes in the error colour and shakes on each new error. */
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpBoxes({
  value,
  onChange,
  length = 6,
  error = false,
  disabled = false,
  autoFocus = true,
}: OtpBoxesProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  // Shake once each time we enter an error state.
  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shakeX]);

  const handleChange = (t: string) => {
    if (disabled) return;
    onChange(t.replace(/\D/g, '').slice(0, length));
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel="OTP code entry"
    >
      <Animated.View style={[{ flexDirection: 'row', gap: space.xs }, shakeStyle]}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const active = i === value.length && !disabled;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 60,
                borderRadius: radii.md,
                borderWidth: active ? 1.5 : 1,
                borderColor: error && !disabled
                  ? theme.blood
                  : active
                    ? theme.ember
                    : theme.glassBorderStrong,
                backgroundColor: theme.glassSurface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {/* lineHeight must cover fontSize or iOS clips glyph tops */}
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 32, color: theme.textPrimary }}>
                {filled ? value[i] : ''}
              </Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        style={{ position: 'absolute', opacity: 0, height: 60, width: '100%' }}
      />
    </Pressable>
  );
}
