import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, screenX, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { haptic } from '../foundation/haptics';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  /** What actually happens if they say yes. Say the consequence, not "are you sure". */
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Irreversible or costs money — renders the confirm in blood. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The app's confirmation surface.
 *
 * Replaces `Alert.alert`, which is a silent no-op on react-native-web: every
 * confirm built on it simply did nothing in the browser preview, so a
 * destructive action looked like a dead button. This is also the only version
 * that looks like CONQR rather than like the operating system.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable
        onPress={loading ? undefined : onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
        }}
      >
        {/* Swallows taps so the sheet itself never dismisses. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: theme.raised,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: screenX,
            paddingTop: space.lg,
            paddingBottom: insets.bottom + space.lg,
            gap: space.sm,
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
          <Text variant="body" color="secondary">
            {body}
          </Text>

          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={cancelLabel}
                variant="secondary"
                disabled={loading}
                onPress={() => {
                  haptic.tap();
                  onCancel();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                loading={loading}
                disabled={loading}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
