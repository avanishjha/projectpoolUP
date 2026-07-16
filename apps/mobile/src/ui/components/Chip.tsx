import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale, type PressableScaleProps } from '../foundation/PressableScale';
import { fonts, radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export interface ChipProps extends Omit<PressableScaleProps, 'children'> {
  label: string;
  emoji?: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Selectable pill — challenge types, filters, durations. */
export function Chip({ label, emoji, selected = false, style, ...press }: ChipProps) {
  const theme = useTheme();
  const selectedBg = theme.scheme === 'dark' ? 'rgba(217,91,63,0.12)' : 'rgba(185,74,47,0.08)';
  const selectedBorder = theme.scheme === 'dark' ? 'rgba(217,91,63,0.45)' : 'rgba(185,74,47,0.45)';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hapticKind="select"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 36,
          paddingHorizontal: space.md,
          borderRadius: radii.pill,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: selected ? selectedBg : theme.glassSurface,
          borderColor: selected ? selectedBorder : theme.glassBorder,
        },
        style,
      ]}
      {...press}
    >
      {emoji ? <Text style={{ fontSize: 14, lineHeight: 18 }}>{emoji}</Text> : null}
      <Text
        color={selected ? 'ember' : 'secondary'}
        style={{ fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 17 }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
