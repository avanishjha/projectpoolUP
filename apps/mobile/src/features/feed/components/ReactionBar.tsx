/** Fire / Flex / Crown / Skull / Respect — one per user per check-in. */
import { View } from 'react-native';
import { PressableScale, space, Text, useTheme } from '../../../ui';
import type { ReactionType } from '../useFeed';

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'flex', emoji: '💪', label: 'Flex' },
  { type: 'crown', emoji: '👑', label: 'Crown' },
  { type: 'skull', emoji: '💀', label: 'Skull' },
  { type: 'respect', emoji: '🙏', label: 'Respect' },
];

export function ReactionBar({
  mine,
  count,
  onReact,
}: {
  mine: ReactionType | null;
  count: number;
  onReact: (type: ReactionType) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {REACTIONS.map((r) => {
        const selected = mine === r.type;
        return (
          <PressableScale
            key={r.type}
            hapticKind="tap"
            scaleTo={0.86}
            onPress={() => onReact(r.type)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            accessibilityState={{ selected }}
            style={{
              width: 36,
              height: 32,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? theme.glassSurfaceStrong : 'transparent',
              borderWidth: 1,
              borderColor: selected ? theme.ember : 'transparent',
            }}
          >
            <Text style={{ fontSize: 16, lineHeight: 21, opacity: selected ? 1 : 0.55 }}>{r.emoji}</Text>
          </PressableScale>
        );
      })}
      {count > 0 ? (
        <Text variant="footnote" color="secondary" style={{ marginLeft: space.xxs }}>
          {count}
        </Text>
      ) : null}
    </View>
  );
}
