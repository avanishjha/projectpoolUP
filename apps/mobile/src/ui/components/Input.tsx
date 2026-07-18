/**
 * The CONQR text field — glass surface, ember focus ring, inline error.
 * Designed against its first consumer: the phone number screen.
 */
import { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { fonts, radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  /** Fixed lead-in, e.g. the +91 prefix. */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, prefix, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.blood
    : focused
      ? theme.ember
      : theme.glassBorderStrong;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="caption" color="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 56,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: theme.glassSurface,
          paddingHorizontal: space.md,
          gap: space.xs,
        }}
      >
        {prefix ? (
          <Text variant="headline" color="secondary" style={{ fontFamily: fonts.textMedium }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.ember}
          style={[
            {
              flex: 1,
              fontFamily: fonts.textMedium,
              fontSize: 17,
              color: theme.textPrimary,
              paddingVertical: 0,
            },
            style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="footnote" color="blood">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
