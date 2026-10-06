import { View } from 'react-native';
import { Chip, Input, SegmentedControl, space, Text, useTheme } from '../../../ui';
import { PressableScale } from '../../../ui';
import { STAKE_TIERS, type PoolDraft } from '../draft';

export function StepStakes({
  draft,
  update,
}: {
  draft: PoolDraft;
  update: (patch: Partial<PoolDraft>) => void;
}) {
  const theme = useTheme();
  const matchedTier = STAKE_TIERS.find((t) => t.buyIn === draft.buyIn && t.fine === draft.fine);

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Stakes
        </Text>
        <View style={{ gap: space.xs }}>
          {STAKE_TIERS.map((tier) => {
            const selected = matchedTier?.key === tier.key;
            return (
              <PressableScale
                key={tier.key}
                hapticKind="select"
                onPress={() => update({ buyIn: tier.buyIn, fine: tier.fine })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: 16,
                  backgroundColor: selected
                    ? theme.scheme === 'dark'
                      ? 'rgba(217,91,63,0.12)'
                      : 'rgba(185,74,47,0.07)'
                    : theme.glassSurface,
                  borderWidth: 1,
                  borderColor: selected ? theme.ember : theme.glassBorder,
                }}
              >
                <Text style={{ fontSize: 22, lineHeight: 28 }}>{tier.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={selected ? 'ember' : 'primary'}>
                    {tier.label}
                  </Text>
                  <Text variant="footnote" color="secondary">
                    ₹{tier.buyIn} buy-in · ₹{tier.fine}/miss
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Input
          label="Buy-in ₹"
          value={String(draft.buyIn)}
          onChangeText={(t) => update({ buyIn: Number(t.replace(/\D/g, '')) || 0 })}
          keyboardType="number-pad"
          maxLength={4}
          prefix="₹"
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="Fine / miss ₹"
          value={String(draft.fine)}
          onChangeText={(t) => update({ fine: Number(t.replace(/\D/g, '')) || 0 })}
          keyboardType="number-pad"
          maxLength={3}
          prefix="₹"
          error={draft.fine > draft.buyIn ? 'Must be ≤ buy-in' : null}
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Payout rule
        </Text>
        <SegmentedControl
          options={[
            { value: 'winner_takes_all', label: 'Winner', sublabel: 'Takes all' },
            { value: 'top_3_split', label: 'Top 3', sublabel: '50/30/20' },
            { value: 'proportional', label: 'Split', sublabel: 'By streak' },
          ]}
          value={draft.payoutRule}
          onChange={(payoutRule) => update({ payoutRule })}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Elimination threshold
        </Text>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          <Chip label="Off" selected={draft.elimination === null} onPress={() => update({ elimination: null })} />
          {[1, 3, 5].map((n) => (
            <Chip
              key={n}
              label={`${n} miss${n > 1 ? 'es' : ''}`}
              selected={draft.elimination === n}
              onPress={() => update({ elimination: n })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Grace tokens per member
        </Text>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          {[0, 1, 2, 3].map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={draft.graceTokens === n}
              onPress={() => update({ graceTokens: n })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
