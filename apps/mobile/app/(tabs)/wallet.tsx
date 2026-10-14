/**
 * Wallet (F7.1 + F7.2) — a STATEMENT, not a stored balance.
 *
 * Leads with "In play" and "Lifetime" rather than a balance, and has no
 * add-money affordance anywhere, because CONQR holds no customer funds.
 * Money moves bank → pot → bank; this screen accounts for it.
 */
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_CLEARANCE } from '../../src/app-shell/FloatingDock';
import {
  ledgerLabel,
  statusLabel,
  useLedger,
  usePoolPositions,
  useWalletSummary,
  PAYOUT_RULE_LABEL,
  type LedgerFilter,
  type LedgerRow,
} from '../../src/features/wallet/useWallet';
import {
  EmptyState,
  fonts,
  formatINR,
  GlassCard,
  haptic,
  PressableScale,
  screenX,
  SegmentedControl,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../src/ui';

const FILTERS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'money_out', label: 'Paid' },
  { value: 'money_in', label: 'Received' },
  { value: 'pending', label: 'Owed' },
];

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'blood' }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMedium" color={tone ?? 'primary'}>
        {value}
      </Text>
    </View>
  );
}

function LedgerItem({ row }: { row: LedgerRow }) {
  const theme = useTheme();
  const status = statusLabel(row);
  const toneColor =
    status.tone === 'ok'
      ? theme.mint
      : status.tone === 'bad'
        ? theme.blood
        : status.tone === 'warn'
          ? theme.gold
          : theme.textMuted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: theme.glassSurfaceStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 20 }}>{row.emoji ?? '₹'}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="body" numberOfLines={1}>
          {ledgerLabel(row)}
          {row.pool_name ? ` · ${row.pool_name}` : ''}
        </Text>
        <Text variant="caption" style={{ color: toneColor, marginTop: 1 }}>
          {status.text}
          {row.utr_number ? ` · UTR ${row.utr_number}` : ''}
        </Text>
      </View>

      <Text
        variant="bodyMedium"
        color={row.direction === 'in' ? 'mint' : 'primary'}
        style={{ opacity: row.status === 'succeeded' ? 1 : 0.6 }}
      >
        {row.direction === 'in' ? '+' : '−'}
        {formatINR(row.amount)}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<LedgerFilter>('all');

  const summary = useWalletSummary();
  const positions = usePoolPositions();
  const ledger = useLedger(filter);

  const s = summary.data;
  const refreshing = summary.isRefetching || positions.isRefetching || ledger.isRefetching;

  const refresh = () => {
    summary.refetch();
    positions.refetch();
    ledger.refetch();
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingHorizontal: screenX,
        paddingBottom: DOCK_CLEARANCE,
        gap: space.sm,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textMuted} />
      }
    >
      <Text variant="title1">Wallet</Text>

      {/* In play — the headline number. Not a balance: money already committed. */}
      {summary.isPending ? (
        <Skeleton height={132} radius="xl" />
      ) : (
        <GlassCard strong radius="xl">
          <View style={{ gap: space.xs }}>
            <Text variant="caption" color="muted">
              In play right now
            </Text>
            <Text
              style={{
                fontFamily: fonts.displayBold,
                fontSize: 42,
                lineHeight: 50,
                color: theme.gold,
              }}
            >
              {formatINR(s?.in_play ?? 0)}
            </Text>
            <Text variant="footnote" color="secondary">
              Committed to {s?.pools_active ?? 0} running{' '}
              {(s?.pools_active ?? 0) === 1 ? 'pool' : 'pools'}. Paid out when they finish.
            </Text>

            {(s?.owed ?? 0) > 0 && (
              <View
                style={{
                  marginTop: space.xs,
                  paddingTop: space.xs,
                  borderTopWidth: 1,
                  borderTopColor: theme.glassBorder,
                }}
              >
                <Text variant="footnote" color="blood">
                  {formatINR(s?.owed ?? 0)} outstanding — settle it from the pool to stay in.
                </Text>
              </View>
            )}
          </View>
        </GlassCard>
      )}

      {/* Lifetime */}
      {!summary.isPending && (
        <GlassCard>
          <Text variant="caption" color="muted" style={{ marginBottom: space.sm }}>
            Lifetime
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md }}>
            <View style={{ width: '50%' }}>
              <Stat label="Paid in" value={formatINR(s?.deposited ?? 0)} />
            </View>
            <View style={{ width: '50%' }}>
              <Stat label="Lost to fines" value={formatINR(s?.fined ?? 0)} />
            </View>
            <View style={{ width: '50%' }}>
              <Stat label="Won" value={formatINR(s?.won ?? 0)} tone="mint" />
            </View>
            <View style={{ width: '50%' }}>
              <Stat
                label="Net"
                value={`${(s?.net ?? 0) >= 0 ? '+' : '−'}${formatINR(Math.abs(s?.net ?? 0))}`}
                tone={(s?.net ?? 0) >= 0 ? 'mint' : 'blood'}
              />
            </View>
            <View style={{ width: '50%' }}>
              <Stat label="Pools finished" value={String(s?.pools_completed ?? 0)} />
            </View>
            <View style={{ width: '50%' }}>
              <Stat
                label="Win rate"
                value={s?.win_rate == null ? '—' : `${s.win_rate}%`}
              />
            </View>
          </View>
        </GlassCard>
      )}

      {/* Positions */}
      {(positions.data?.length ?? 0) > 0 && (
        <>
          <Text variant="caption" color="muted" style={{ marginTop: space.xs }}>
            Where it is
          </Text>
          {(positions.data ?? []).map((p) => (
            <PressableScale
              key={p.pool_id}
              hapticKind="tap"
              onPress={() => router.push(`/pool/${p.pool_id}`)}
            >
              <GlassCard>
                <View style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Text style={{ fontSize: 18, lineHeight: 24 }}>{p.emoji}</Text>
                    <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                      {p.pool_name}
                    </Text>
                    {p.my_rank ? (
                      <Text variant="footnote" color="secondary">
                        #{p.my_rank} of {p.members}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm }}>
                    <View style={{ width: '50%' }}>
                      <Stat label="You've put in" value={formatINR(p.paid_in + p.fines_paid)} />
                    </View>
                    <View style={{ width: '50%' }}>
                      <Stat label="Pot" value={formatINR(p.total_pot)} />
                    </View>
                  </View>

                  <View
                    style={{
                      paddingTop: space.xs,
                      borderTopWidth: 1,
                      borderTopColor: theme.glassBorder,
                    }}
                  >
                    <Text variant="footnote" color={p.estimated_payout > 0 ? 'mint' : 'secondary'}>
                      {p.estimated_payout > 0
                        ? `On today's standing you'd take ${formatINR(p.estimated_payout)}`
                        : `No payout on today's standing`}
                    </Text>
                    <Text variant="caption" color="muted" style={{ marginTop: 1 }}>
                      {PAYOUT_RULE_LABEL[p.payout_rule]} · estimate, after fees · changes nightly
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </PressableScale>
          ))}
        </>
      )}

      {/* Ledger */}
      <Text variant="caption" color="muted" style={{ marginTop: space.xs }}>
        Every rupee
      </Text>
      <SegmentedControl
        options={FILTERS}
        value={filter}
        onChange={(v) => {
          haptic.select();
          setFilter(v);
        }}
      />

      {ledger.isPending ? (
        <View style={{ gap: space.sm }}>
          <Skeleton height={52} />
          <Skeleton height={52} />
        </View>
      ) : (ledger.data?.length ?? 0) > 0 ? (
        <GlassCard>
          {(ledger.data ?? []).map((row, i) => (
            <View
              key={row.id}
              style={
                i === 0
                  ? undefined
                  : { borderTopWidth: 1, borderTopColor: theme.glassBorder }
              }
            >
              <LedgerItem row={row} />
            </View>
          ))}
        </GlassCard>
      ) : (
        <EmptyState
          emoji="🧾"
          title={filter === 'all' ? 'Nothing yet' : 'Nothing here'}
          body={
            filter === 'payouts' || filter === 'money_in'
              ? 'Winnings land here when a pool you’re in finishes.'
              : 'Your buy-ins, fines and winnings will all show up here.'
          }
        />
      )}
    </ScrollView>
  );
}
