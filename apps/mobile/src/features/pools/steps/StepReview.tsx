import { View } from 'react-native';
import { GlassCard, SegmentedControl, space, Text, useTheme } from '../../../ui';
import { formatINR } from '../../../ui';
import { templateFor } from '../challenges';
import { DEADLINE_PRESETS, type PoolDraft } from '../draft';

function Line({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: space.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.glassBorder,
      }}
    >
      <Text variant="footnote" color="secondary">
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ textAlign: 'right', flexShrink: 1, marginLeft: space.md }}>
        {value}
      </Text>
    </View>
  );
}

const PAYOUT_LABEL = {
  winner_takes_all: 'Winner takes all',
  top_3_split: 'Top 3 split (50/30/20)',
  proportional: 'Proportional by streak',
} as const;

export function StepReview({
  draft,
  update,
}: {
  draft: PoolDraft;
  update: (patch: Partial<PoolDraft>) => void;
}) {
  const startDate = new Date(Date.now() + draft.startOffsetDays * 86_400_000);
  const deadlineLabel = DEADLINE_PRESETS.find((p) => p.hour === draft.deadlineUtcHour)?.label ?? 'Custom';

  return (
    <View style={{ gap: space.lg }}>
      <GlassCard strong radius="xl">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
          <Text style={{ fontSize: 32, lineHeight: 40 }}>{draft.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="title2" numberOfLines={1}>
              {draft.name || 'Your Pool'}
            </Text>
            <Text variant="footnote" color="secondary">
              {templateFor(draft.challengeType).label}
            </Text>
          </View>
        </View>
        {draft.description ? (
          <Text variant="body" color="secondary" style={{ marginBottom: space.xs }}>
            {draft.description}
          </Text>
        ) : null}
        <Line
          label="Runs"
          value={`${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → ${new Date(
            startDate.getTime() + draft.durationDays * 86_400_000,
          ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        />
        <Line label="Duration" value={`${draft.durationDays} days`} />
        <Line label="Deadline" value={deadlineLabel.replace(/^[^·]*· /, '')} />
        <Line label="Buy-in" value={formatINR(draft.buyIn)} />
        <Line label="Fine / miss" value={formatINR(draft.fine)} />
        <Line label="Payout" value={PAYOUT_LABEL[draft.payoutRule]} />
        <Line label="Elimination" value={draft.elimination ? `${draft.elimination} misses` : 'Off'} />
        <Line label="Grace tokens" value={String(draft.graceTokens)} />
      </GlassCard>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" color="muted">
          Visibility
        </Text>
        <SegmentedControl
          options={[
            { value: 'private', label: 'Private', sublabel: 'Invite only' },
            { value: 'public', label: 'Public', sublabel: 'Discoverable' },
          ]}
          value={draft.visibility}
          onChange={(visibility) => update({ visibility })}
        />
      </View>

      <Text variant="footnote" color="muted" style={{ textAlign: 'center' }}>
        CONQR takes a 5% platform fee from the final pot. Payments are set up when members join.
      </Text>
    </View>
  );
}
