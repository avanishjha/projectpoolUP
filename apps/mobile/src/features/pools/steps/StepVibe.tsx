import { View } from 'react-native';
import { Chip, haptic, Input, space, Text } from '../../../ui';
import { CHALLENGE_TEMPLATES, templateFor } from '../challenges';
import type { PoolDraft } from '../draft';

const EMOJI_CHOICES = ['🔥', '💪', '🏋️', '🏃', '🧘', '🍬', '👟', '🧊', '🕉️', '⏰', '🏆', '⚡'];

export function StepVibe({
  draft,
  update,
}: {
  draft: PoolDraft;
  update: (patch: Partial<PoolDraft>) => void;
}) {
  const applyTemplate = (type: (typeof CHALLENGE_TEMPLATES)[number]['type']) => {
    const t = templateFor(type);
    update({
      challengeType: type,
      emoji: t.emoji,
      durationDays: t.defaultDuration,
      ...(type !== 'custom' && { name: t.nameSuggestion, description: t.description }),
    });
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Challenge type
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {CHALLENGE_TEMPLATES.map((t) => (
            <Chip
              key={t.type}
              label={t.label}
              emoji={t.emoji}
              selected={draft.challengeType === t.type}
              onPress={() => applyTemplate(t.type)}
            />
          ))}
        </View>
      </View>

      <Input
        label="Pool name"
        value={draft.name}
        onChangeText={(name) => update({ name })}
        placeholder="75 Hard Boyz"
        maxLength={40}
        autoCapitalize="words"
      />

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Pool emoji
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {EMOJI_CHOICES.map((e) => (
            <Chip
              key={e}
              label={e}
              selected={draft.emoji === e}
              onPress={() => {
                haptic.select();
                update({ emoji: e });
              }}
            />
          ))}
        </View>
      </View>

      <Input
        label="Description (optional)"
        value={draft.description}
        onChangeText={(description) => update({ description })}
        placeholder="What's the challenge? Set the tone."
        maxLength={200}
        multiline
        containerStyle={{ marginBottom: space.xxl }}
      />
    </View>
  );
}
