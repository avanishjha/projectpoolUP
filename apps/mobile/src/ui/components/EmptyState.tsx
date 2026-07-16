/**
 * Designed empty states — every screen's zero-data moment is a first
 * impression, never a blank void (UX standards: empty state required).
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Button, type ButtonProps } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  body: string;
  /** Primary call to action. */
  action?: Pick<ButtonProps, 'label' | 'onPress' | 'variant'>;
  /** Quieter second option (e.g. "Join with code"). */
  secondaryAction?: Pick<ButtonProps, 'label' | 'onPress'>;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ emoji, title, body, action, secondaryAction, style }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[{ alignItems: 'center', paddingHorizontal: space.xxl, gap: space.xs }, style]}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: theme.glassSurfaceStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.sm,
        }}
      >
        <Text style={{ fontSize: 40, lineHeight: 48 }}>{emoji}</Text>
      </View>
      <Text variant="title2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
        {body}
      </Text>
      {action && (
        <Button
          label={action.label}
          variant={action.variant ?? 'primary'}
          size="lg"
          onPress={action.onPress}
          style={{ marginTop: space.lg, alignSelf: 'center' }}
        />
      )}
      {secondaryAction && (
        <Button
          label={secondaryAction.label}
          variant="ghost"
          size="md"
          onPress={secondaryAction.onPress}
          style={{ alignSelf: 'center' }}
        />
      )}
    </View>
  );
}
