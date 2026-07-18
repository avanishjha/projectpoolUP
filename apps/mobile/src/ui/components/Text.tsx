import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type TypeVariant, type as typeScale } from '../tokens';
import { roleColor, type ThemeColorRole } from '../theme/themes';
import { useTheme } from '../theme/ThemeContext';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ThemeColorRole;
}

/**
 * The only way text is rendered in CONQR. Variants from the type scale,
 * colors from theme roles.
 *
 * RULE: if a style override changes fontSize, it MUST also set a lineHeight
 * ≥ fontSize — otherwise the variant's smaller lineHeight wins and iOS clips
 * glyph tops (Android/web silently forgive, so test on iPhone).
 */
export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText {...rest} style={[typeScale[variant], { color: roleColor(theme, color) }, style]} />;
}
