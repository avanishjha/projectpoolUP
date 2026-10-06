/**
 * CRON-generated feed events. The Wall of Shame is the product's social teeth
 * (spec §2.5) — it names the miss and the money, in Hinglish, without being
 * cruel. Milestones are the counterweight: the same feed celebrates.
 */
import { View } from 'react-native';
import { Avatar, formatINR, GlassCard, space, Text, useTheme } from '../../../ui';
import type { FeedRow, PoolEventType } from '../useFeed';

interface EventCopy {
  emoji: string;
  title: (name: string, meta: Record<string, unknown>) => string;
  body?: (name: string, meta: Record<string, unknown>) => string;
  tone: 'shame' | 'default';
}

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);

const EVENT_COPY: Record<PoolEventType, EventCopy> = {
  missed_day: {
    emoji: '🚨',
    tone: 'shame',
    title: (n) => `${n} missed a day`,
    body: (_n, m) => `Miss #${num(m.miss_number, 1)}. Streak reset. Kya hua bhai?`,
  },
  fine_issued: {
    emoji: '💸',
    tone: 'shame',
    title: (n, m) => `${formatINR(num(m.amount))} added to the pot`,
    body: (n) => `${n}'s miss just made everyone else richer.`,
  },
  streak_milestone: {
    emoji: '🔥',
    tone: 'default',
    title: (n, m) => `${n} hit ${num(m.streak)} days`,
    body: () => 'Discipline mode on. Respect.',
  },
  member_eliminated: {
    emoji: '☠️',
    tone: 'shame',
    title: (n) => `${n} has been eliminated`,
    body: (_n, m) => `${num(m.misses)} misses. Their money stays in the pot.`,
  },
  shield_used: {
    emoji: '🛡️',
    tone: 'default',
    title: (n) => `${n} used a Shield`,
    body: () => 'Miss blocked. No fine this time.',
  },
  grace_used: {
    emoji: '🎟️',
    tone: 'default',
    title: (n) => `${n} used a grace token`,
    body: (_n, m) => `${num(m.remaining)} left. Streak safe.`,
  },
  pool_started: {
    emoji: '🚀',
    tone: 'default',
    title: () => 'Pool is LIVE',
    body: (_n, m) => `${num(m.members)} members in. Day 1 shuru — ab koi bahana nahi.`,
  },
  pool_completed: {
    emoji: '🏁',
    tone: 'default',
    title: () => 'Pool complete',
    body: (_n, m) =>
      m.reason === 'last_member_standing'
        ? 'Only one left standing. Pot goes to the survivor.'
        : 'That’s a wrap. Payouts on the way.',
  },
};

export function EventCard({ row }: { row: FeedRow }) {
  const theme = useTheme();
  if (!row.event_type) return null;

  const copy = EVENT_COPY[row.event_type];
  if (!copy) return null;

  const name = row.display_name ?? 'Someone';
  const meta = row.metadata ?? {};
  const shame = copy.tone === 'shame';

  return (
    <GlassCard tone={shame ? 'shame' : 'default'} radius="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {row.user_id ? (
          <Avatar name={name} uri={row.avatar_url} size="sm" ring={shame ? 'shame' : 'none'} />
        ) : (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.glassSurfaceStrong,
            }}
          >
            <Text style={{ fontSize: 15, lineHeight: 20 }}>{copy.emoji}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="bodyMedium" color={shame ? 'blood' : 'primary'}>
            {row.user_id ? `${copy.emoji} ` : ''}
            {copy.title(name, meta)}
          </Text>
          {copy.body ? (
            <Text variant="footnote" color="secondary">
              {copy.body(name, meta)}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}
