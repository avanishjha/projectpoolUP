/** Glass segmented control — payout rule, visibility, window, etc. */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from '../foundation/PressableScale';
import { fonts, radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  sublabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const selectedBg = theme.scheme === 'dark' ? 'rgba(217,91,63,0.16)' : 'rgba(185,74,47,0.09)';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          padding: 4,
          borderRadius: radii.md,
          backgroundColor: theme.glassSurface,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          gap: 4,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            hapticKind="select"
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              paddingVertical: space.sm,
              paddingHorizontal: space.xs,
              borderRadius: radii.sm,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              backgroundColor: selected ? selectedBg : 'transparent',
              borderWidth: 1,
              borderColor: selected ? theme.ember : 'transparent',
            }}
          >
            <Text
              color={selected ? 'ember' : 'secondary'}
              style={{ fontFamily: fonts.textSemiBold, fontSize: 13, lineHeight: 17, textAlign: 'center' }}
            >
              {opt.label}
            </Text>
            {opt.sublabel ? (
              <Text color="muted" style={{ fontSize: 10, lineHeight: 13, textAlign: 'center' }}>
                {opt.sublabel}
              </Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}
