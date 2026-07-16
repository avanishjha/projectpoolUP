import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type TypeVariant, type as typeScale } from '../tokens';
import { roleColor, type ThemeColorRole } from '../theme/themes';
import { useTheme } from '../theme/ThemeContext';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ThemeColorRole;
}

/** The only way text is rendered in CONQR. Variants from the type scale, colors from theme roles. */
export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText {...rest} style={[typeScale[variant], { color: roleColor(theme, color) }, style]} />;
}
