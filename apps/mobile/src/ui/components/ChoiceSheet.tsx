import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, screenX, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { haptic } from '../foundation/haptics';
import { Button } from './Button';
import { Text } from './Text';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** One line on what picking this means. */
  note?: string;
}

export interface ChoiceSheetProps<T extends string> {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: readonly ChoiceOption<T>[];
  cancelLabel?: string;
  onSelect: (value: T) => void;
  onCancel: () => void;
}

/**
 * Pick one of several actions — report reasons, and anything else that is a
 * menu rather than a yes/no.
 *
 * Exists for the same reason as [ConfirmSheet]: `Alert.alert` with a button
 * per option is a no-op on react-native-web, so the reason picker never
 * opened in the browser preview.
 */
export function ChoiceSheet<T extends string>({
  visible,
  title,
  subtitle,
  options,
  cancelLabel = 'Cancel',
  onSelect,
  onCancel,
}: ChoiceSheetProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: theme.raised,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: screenX,
            paddingTop: space.lg,
            paddingBottom: insets.bottom + space.lg,
            gap: space.xs,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: radii.pill,
              backgroundColor: theme.glassBorderStrong,
              marginBottom: space.xs,
            }}
          />

          <Text variant="headline">{title}</Text>
          {subtitle ? (
            <Text variant="footnote" color="secondary">
              {subtitle}
            </Text>
          ) : null}

          <View style={{ marginTop: space.sm }}>
            {options.map((opt, i) => (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                onPress={() => {
                  haptic.select();
                  onSelect(opt.value);
                }}
                style={{
                  paddingVertical: space.sm,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.glassBorder,
                }}
              >
                <Text variant="body">{opt.label}</Text>
                {opt.note ? (
                  <Text variant="caption" color="muted" style={{ marginTop: 1 }}>
                    {opt.note}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>

          <Button
            label={cancelLabel}
            variant="secondary"
            onPress={() => {
              haptic.tap();
              onCancel();
            }}
            style={{ marginTop: space.sm }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
