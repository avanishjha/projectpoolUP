/** Pool summary card for the home dashboard and lists. */
import { View } from 'react-native';
import { PressableScale } from '../foundation/PressableScale';
import { fonts, radii, space } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { formatINR } from '../utils/formatINR';
import { GlassCard } from './GlassCard';
import { MoneyText } from './MoneyText';
import { Text } from './Text';

type PoolStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface PoolCardData {
  id: string;
  name: string;
  emoji: string;
  status: PoolStatus;
  start_date: string;
  end_date: string;
  buy_in_amount: number;
  fine_amount: number;
  total_pot: number;
}

const STATUS_META: Record<PoolStatus, { label: string; role: 'mint' | 'gold' | 'muted' | 'blood' }> = {
  pending: { label: 'Pending', role: 'gold' },
  active: { label: 'Live', role: 'mint' },
  completed: { label: 'Completed', role: 'muted' },
  cancelled: { label: 'Cancelled', role: 'blood' },
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function scheduleLabel(pool: PoolCardData): string {
  if (pool.status === 'pending') {
    const d = daysUntil(pool.start_date);
    if (d <= 0) return 'Starting soon';
    return d === 1 ? 'Starts tomorrow' : `Starts in ${d} days`;
  }
  if (pool.status === 'active') {
    const d = daysUntil(pool.end_date);
    return d <= 0 ? 'Last day' : `${d} days left`;
  }
  return STATUS_META[pool.status].label;
}

export interface PoolCardProps {
  pool: PoolCardData;
  onPress?: () => void;
}

export function PoolCard({ pool, onPress }: PoolCardProps) {
  const theme = useTheme();
  const meta = STATUS_META[pool.status];
  const accent = theme[meta.role === 'muted' ? 'textMuted' : meta.role];

  return (
    <PressableScale onPress={onPress} hapticKind={onPress ? 'tap' : null} scaleTo={0.98}>
      <GlassCard strong radius="xl">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: radii.md,
              backgroundColor: theme.glassSurfaceStrong,
              borderWidth: 1,
              borderColor: theme.glassBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, lineHeight: 30 }}>{pool.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="headline" numberOfLines={1}>
              {pool.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
              <Text variant="footnote" color="secondary">
                {scheduleLabel(pool)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <MoneyText amount={pool.total_pot} />
            <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
              POT
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginTop: space.sm,
            paddingTop: space.sm,
            borderTopWidth: 1,
            borderTopColor: theme.glassBorder,
            gap: space.lg,
          }}
        >
          <Meta label="Buy-in" value={formatINR(pool.buy_in_amount)} />
          <Meta label="Fine/miss" value={formatINR(pool.fine_amount)} />
        </View>
      </GlassCard>
    </PressableScale>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.textSemiBold, fontSize: 14, lineHeight: 18 }}>{value}</Text>
    </View>
  );
}
