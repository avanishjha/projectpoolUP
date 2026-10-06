import { ScrollView, View } from 'react-native';
import { Chip, Input, SegmentedControl, space, Text } from '../../../ui';
import { DEADLINE_PRESETS, DURATION_PRESETS, type PoolDraft } from '../draft';

function startDateLabel(offset: number): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  if (offset === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function StepSchedule({
  draft,
  update,
}: {
  draft: PoolDraft;
  update: (patch: Partial<PoolDraft>) => void;
}) {
  const isCustomDuration = !DURATION_PRESETS.includes(draft.durationDays as (typeof DURATION_PRESETS)[number]);

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Duration
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {DURATION_PRESETS.map((d) => (
            <Chip
              key={d}
              label={`${d} days`}
              selected={draft.durationDays === d}
              onPress={() => update({ durationDays: d })}
            />
          ))}
          <Chip label="Custom" selected={isCustomDuration} onPress={() => update({ durationDays: 45 })} />
        </View>
        {isCustomDuration && (
          <Input
            label="Custom duration (7–365 days)"
            value={String(draft.durationDays)}
            onChangeText={(t) => update({ durationDays: Math.min(365, Number(t.replace(/\D/g, '')) || 0) })}
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={{ marginTop: space.xs }}
          />
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Start date
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {Array.from({ length: 14 }, (_, i) => i + 1).map((offset) => (
              <Chip
                key={offset}
                label={startDateLabel(offset)}
                selected={draft.startOffsetDays === offset}
                onPress={() => update({ startOffsetDays: offset })}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Daily check-in deadline
        </Text>
        <View style={{ gap: space.xs }}>
          {DEADLINE_PRESETS.map((p) => (
            <Chip
              key={p.hour}
              label={p.label}
              selected={draft.deadlineUtcHour === p.hour}
              onPress={() => update({ deadlineUtcHour: p.hour })}
              style={{ alignSelf: 'flex-start' }}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Check-in window
        </Text>
        <SegmentedControl
          options={[
            { value: 'full_day', label: 'Full day', sublabel: 'Anytime' },
            { value: 'morning', label: 'Morning', sublabel: '5 AM – 12 PM' },
          ]}
          value={draft.window}
          onChange={(window) => update({ window })}
        />
      </View>
    </View>
  );
}
