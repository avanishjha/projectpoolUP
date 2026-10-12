/**
 * Pool detail (F2.5 + F4): header (pot, status, members) → Feed | Leaderboard
 * tabs → rules → organiser controls. The feed mixes check-ins with the CRON's
 * events (Wall of Shame, milestones). All reads honour RLS via RPCs.
 */
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../src/lib/nav';
import {
  useCancelPool,
  usePoolDetail,
  usePoolLeaderboard,
  type LeaderboardRow,
  type PoolDetail,
} from '../../src/features/pools/usePoolDetail';
import { useTodayCheckIn } from '../../src/features/checkins/useCheckIn';
import {
  fineReasonCopy,
  useOutstandingFines,
  usePoolPayment,
  usePoolReadiness,
  useStartCheckout,
  useStartFinePayment,
  type OutstandingFine,
} from '../../src/features/payments/useCheckout';
import { PaySheet } from '../../src/features/payments/PaySheet';
import { useFeed, useReportCheckIn, useToggleReaction, REPORT_REASONS } from '../../src/features/feed/useFeed';
import { CheckInCard, CheckInCardSkeleton } from '../../src/features/feed/components/CheckInCard';
import { EventCard } from '../../src/features/feed/components/EventCard';
import { CommentSheet } from '../../src/features/feed/components/CommentSheet';
import { toast } from '../../src/stores/toastStore';
import {
  Avatar,
  Button,
  fonts,
  GlassCard,
  haptic,
  MoneyText,
  screenX,
  SegmentedControl,
  Skeleton,
  space,
  Text,
  useTheme,
  formatINR,
} from '../../src/ui';

/** How long until tonight's deadline, in words. */
function deadlineCopy(pool: PoolDetail): string {
  const nowUtcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  let hoursLeft = pool.check_in_deadline_utc - nowUtcHour;
  if (hoursLeft < 0) hoursLeft += 24;
  if (hoursLeft < 1) return `${Math.max(1, Math.round(hoursLeft * 60))} min left — then ${formatINR(pool.fine_amount)}`;
  return `${Math.floor(hoursLeft)}h left — then ${formatINR(pool.fine_amount)}`;
}

/** "6 Oct" — people commit money against dates, not durations. */
function startDateLabel(pool: PoolDetail): string {
  return new Date(pool.start_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function daysLabel(pool: PoolDetail): string {
  const d = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (pool.status === 'pending') {
    const n = Math.max(0, d(pool.start_date));
    return n <= 0 ? 'Starting soon' : n === 1 ? 'Starts tomorrow' : `Starts in ${n} days`;
  }
  if (pool.status === 'active') {
    const n = d(pool.end_date);
    return n <= 0 ? 'Last day' : `${n} days left`;
  }
  return pool.status === 'completed' ? 'Completed' : 'Cancelled';
}

const PAYOUT_LABEL = {
  winner_takes_all: 'Winner takes all',
  top_3_split: 'Top 3 (50/30/20)',
  proportional: 'Proportional',
} as const;

function fireStreak(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥';
  if (streak >= 14) return '🔥🔥';
  if (streak >= 7) return '🔥';
  return '';
}

function MemberRow({ row }: { row: LeaderboardRow }) {
  const theme = useTheme();
  const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null;
  const ring = row.status === 'delinquent' ? 'shame' : row.current_streak >= 7 ? 'ember' : 'none';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
        paddingHorizontal: space.sm,
        borderRadius: 14,
        backgroundColor: row.is_me ? theme.glassSurfaceStrong : 'transparent',
        borderWidth: row.is_me ? 1 : 0,
        borderColor: row.is_me ? theme.glassBorder : 'transparent',
      }}
    >
      <View style={{ width: 24, alignItems: 'center' }}>
        {medal ? (
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{medal}</Text>
        ) : (
          <Text variant="footnote" color="muted">
            {row.rank}
          </Text>
        )}
      </View>
      <Avatar name={row.display_name} uri={row.avatar_url} size="sm" ring={ring} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {row.display_name}
          {row.is_me ? '  ·  You' : ''}
        </Text>
        <Text variant="footnote" color="secondary">
          {row.current_streak}d streak {fireStreak(row.current_streak)}
          {row.fines_paid > 0 ? `  ·  ${formatINR(row.fines_paid)} fined` : ''}
        </Text>
      </View>
      <Text variant="caption" color="muted">
        {row.compliance_pct}%
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.textSemiBold, fontSize: 15, lineHeight: 19 }}>{value}</Text>
    </View>
  );
}

export default function PoolDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = usePoolDetail(id);
  const leaderboard = usePoolLeaderboard(id);
  const today = useTodayCheckIn(id);
  const payment = usePoolPayment(id);
  const readiness = usePoolReadiness(id);
  const [payOpen, setPayOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [payingFine, setPayingFine] = useState<OutstandingFine | null>(null);
  const owed = useOutstandingFines(id);
  const startCheckout = useStartCheckout();
  const startFinePayment = useStartFinePayment();
  const feed = useFeed(id);
  const toggleReaction = useToggleReaction(id);
  const reportCheckIn = useReportCheckIn(id);
  const cancelPool = useCancelPool();
  const pool = detail.data;

  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed');
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  // The daily CTA: only for active members of a running pool.
  const canCheckIn = pool?.status === 'active' && pool.my_status === 'active';

  // Buy-in is owed until a deposit actually settles. Free pools owe nothing.
  const payStatus = payment.data?.status ?? 'none';
  const isFree = (pool?.buy_in_amount ?? 0) <= 0;
  const needsBuyIn = !!pool?.my_status && !isFree && payStatus !== 'succeeded';
  const paymentFailed = payStatus === 'failed' || payStatus === 'retry_scheduled';

  // A pool with fewer than 2 settled members is CANCELLED on its start date.
  // It used to happen silently; now the screen says so.
  const ready = readiness.data;
  const shortOfStart = pool?.status === 'pending' && !!ready && !ready.will_start;
  const stillNeeded = ready ? Math.max(0, ready.needed - ready.settled) : 0;
  const checkedInToday = today.data?.checked_in ?? false;

  const refresh = useCallback(() => {
    detail.refetch();
    leaderboard.refetch();
    today.refetch();
    feed.refetch();
    owed.refetch();
  }, [detail, leaderboard, today, feed]);

  const promptReport = (checkInId: string) => {
    Alert.alert('Report this check-in?', 'Three reports send it for review.', [
      ...REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: () =>
          reportCheckIn.mutate(
            { checkInId, reason: r.value },
            {
              onSuccess: () => toast.success('Reported', 'Thanks — our team will review it.'),
              onError: () => toast.error('Could not report', 'Please try again.'),
            },
          ),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const share = async () => {
    if (!pool) return;
    haptic.tap();
    const deepLink = Linking.createURL('/join-pool', { queryParams: { code: pool.invite_code } });
    try {
      await Share.share({
        message: `Join my CONQR pool "${pool.name}" 🔥\nInvite code: ${pool.invite_code}\n${deepLink}`,
      });
    } catch {
      await Clipboard.setStringAsync(pool.invite_code);
      toast.success('Code copied', pool.invite_code);
    }
  };

  const confirmCancel = () => {
    if (!pool) return;
    Alert.alert('Cancel pool?', 'This ends the pool before it starts. This cannot be undone.', [
      { text: 'Keep pool', style: 'cancel' },
      {
        text: 'Cancel pool',
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          cancelPool.mutate(pool.id, {
            onSuccess: () => {
              toast.success('Pool cancelled', 'Everyone has been notified.');
              refresh();
            },
            onError: () => toast.error('Could not cancel', 'Please try again.'),
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: screenX }}>
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screenX, paddingBottom: insets.bottom + space.xl, gap: space.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={detail.isRefetching} onRefresh={refresh} tintColor={theme.textMuted} />
        }
      >
        {detail.isPending || !pool ? (
          <Skeleton height={150} radius="xl" />
        ) : (
          <>
            {/* Header */}
            <GlassCard strong radius="xl">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text style={{ fontSize: 34, lineHeight: 42 }}>{pool.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="title2" numberOfLines={1}>
                    {pool.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          pool.status === 'pending'
                            ? theme.gold
                            : pool.status === 'active'
                              ? theme.mint
                              : pool.status === 'cancelled'
                                ? theme.blood
                                : theme.textMuted,
                      }}
                    />
                    <Text variant="footnote" color="secondary">
                      {daysLabel(pool)} · {pool.member_count}/{pool.max_members} members
                    </Text>
                  </View>
                </View>
              </View>
              {pool.description ? (
                <Text variant="body" color="secondary" style={{ marginTop: space.sm }}>
                  {pool.description}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginTop: space.md,
                  paddingTop: space.md,
                  borderTopWidth: 1,
                  borderTopColor: theme.glassBorder,
                }}
              >
                <View>
                  <Text variant="caption" color="muted">
                    Total pot
                  </Text>
                  <MoneyText amount={pool.total_pot} size="lg" />
                </View>
                {pool.my_status ? (
                  <View
                    style={{
                      paddingHorizontal: space.sm,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: theme.glassSurfaceStrong,
                      borderWidth: 1,
                      borderColor: theme.glassBorder,
                    }}
                  >
                    <Text variant="caption" color="mint">
                      You're {pool.my_status}
                    </Text>
                  </View>
                ) : null}
              </View>
            </GlassCard>

            {/* ── WHAT YOU CAME TO DO ──────────────────────────────────
                Action sits directly under the pot. Reference material
                (the rules) moved to the bottom behind a disclosure: you
                read it once, you act every day. */}

            {/* Will this pool actually start? Say it before the deadline does. */}
            {shortOfStart && (
              <GlassCard tone={ready && ready.settled >= 1 ? 'default' : 'shame'}>
                <View style={{ gap: space.xxs }}>
                  <Text variant="bodyMedium">
                    {stillNeeded === 1
                      ? '1 more person needed to start'
                      : `${stillNeeded} more people needed to start`}
                  </Text>
                  <Text variant="footnote" color="secondary">
                    {ready?.is_free
                      ? `${ready.members} in so far. A pool needs 2 to run — if it’s short on ${startDateLabel(pool)}, it’s cancelled automatically.`
                      : `${ready?.settled ?? 0} of ${ready?.members ?? 0} have paid in. A pool needs 2 paid members to run — if it’s short on ${startDateLabel(pool)}, it’s cancelled and everyone is refunded.`}
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* Buy-in. Until it settles you are not in the pot and cannot check in. */}
            {needsBuyIn && (
              <GlassCard tone={paymentFailed ? 'shame' : 'default'}>
                <View style={{ gap: space.sm }}>
                  <View>
                    <Text variant="bodyMedium">
                      {paymentFailed ? 'Buy-in payment failed' : 'Pay your buy-in'}
                    </Text>
                    <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                      {paymentFailed
                        ? `${formatINR(pool.buy_in_amount)} couldn’t be collected${
                            payment.data?.retry_count
                              ? ` (attempt ${payment.data.retry_count} of 3)`
                              : ''
                          }. We retry automatically — or pay now to get back in.`
                        : `${formatINR(pool.buy_in_amount)} into the pot. Until it clears you can’t check in and you don’t count toward starting the pool.`}
                    </Text>
                  </View>
                  <Button
                    label={`Pay ${formatINR(pool.buy_in_amount)}`}
                    size="md"
                    fullWidth
                    onPress={() => {
                      haptic.tap();
                      setPayOpen(true);
                    }}
                  />
                </View>
              </GlassCard>
            )}

            {/* Outstanding fines — the way out of delinquency (F5.6) */}
            {(owed.data?.length ?? 0) > 0 && (
              <GlassCard tone={owed.data?.some((f) => f.is_terminal) ? 'shame' : 'default'}>
                <View style={{ gap: space.sm }}>
                  <View>
                    <Text variant="bodyMedium">
                      {pool.my_status === 'delinquent'
                        ? 'You’re locked out until this is paid'
                        : `You owe ${formatINR(
                            (owed.data ?? []).reduce((sum, f) => sum + f.amount, 0),
                          )}`}
                    </Text>
                    <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                      {pool.my_status === 'delinquent'
                        ? 'Clearing it unblocks check-ins straight away.'
                        : 'From days you missed.'}
                    </Text>
                  </View>

                  {(owed.data ?? []).map((fine) => (
                    <View
                      key={fine.transaction_id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.sm,
                        paddingTop: space.xs,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.glassBorder,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="footnote">{formatINR(fine.amount)} · {fine.incurred_on}</Text>
                        <Text variant="caption" color="muted" style={{ marginTop: 1 }}>
                          {fineReasonCopy(fine)}
                        </Text>
                      </View>
                      <Button
                        label="Pay now"
                        size="md"
                        onPress={() => {
                          haptic.tap();
                          setPayingFine(fine);
                        }}
                      />
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}

            {/* The daily action */}
            {canCheckIn && needsBuyIn && (
              <Text variant="footnote" color="secondary" style={{ textAlign: 'center' }}>
                Check-in unlocks once your buy-in clears.
              </Text>
            )}
            {canCheckIn && !needsBuyIn && (
              <View style={{ gap: space.xxs }}>
                <Button
                  label={checkedInToday ? 'Replace today’s check-in' : 'Check In Now'}
                  variant={checkedInToday ? 'secondary' : 'primary'}
                  fullWidth
                  onPress={() => {
                    haptic.tap();
                    router.push(`/checkin/${pool.id}`);
                  }}
                />
                {checkedInToday ? (
                  <Text variant="footnote" color="mint" style={{ textAlign: 'center' }}>
                    ✓ Done today — you’re safe
                  </Text>
                ) : (
                  <Text variant="footnote" color="secondary" style={{ textAlign: 'center' }}>
                    {deadlineCopy(pool)}
                  </Text>
                )}
              </View>
            )}

            {/* Invite — the other thing a pending pool needs */}
            {pool.status === 'pending' && (
              <Button
                label="Share invite"
                variant={shortOfStart ? 'primary' : 'secondary'}
                size="md"
                fullWidth
                onPress={share}
              />
            )}

            {/* Feed | Leaderboard */}
            <SegmentedControl
              options={[
                { value: 'feed', label: 'Feed' },
                { value: 'leaderboard', label: 'Leaderboard' },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === 'leaderboard' ? (
              <GlassCard>
                {leaderboard.isPending ? (
                  <View style={{ gap: space.sm }}>
                    <Skeleton height={40} />
                    <Skeleton height={40} />
                  </View>
                ) : leaderboard.data && leaderboard.data.length > 0 ? (
                  leaderboard.data.map((row) => <MemberRow key={row.user_id} row={row} />)
                ) : (
                  <Text variant="footnote" color="secondary" style={{ paddingVertical: space.sm }}>
                    Just you so far. Share the invite — a pool needs 2 to run.
                  </Text>
                )}
              </GlassCard>
            ) : feed.isPending ? (
              <View style={{ gap: space.sm }}>
                <CheckInCardSkeleton />
                <CheckInCardSkeleton />
              </View>
            ) : feed.data && feed.data.length > 0 ? (
              <View style={{ gap: space.sm }}>
                {feed.data.map((row) =>
                  row.kind === 'check_in' ? (
                    <CheckInCard
                      key={row.id}
                      row={row}
                      onReact={(type) => toggleReaction.mutate({ checkInId: row.id, type })}
                      onComment={() => setCommentsFor(row.id)}
                      onReport={() => promptReport(row.id)}
                    />
                  ) : (
                    <EventCard key={row.id} row={row} />
                  ),
                )}
              </View>
            ) : (
              <GlassCard>
                <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: space.xxs }}>
                  <Text style={{ fontSize: 30, lineHeight: 38 }}>📸</Text>
                  <Text variant="bodyMedium">No check-ins yet</Text>
                  <Text variant="footnote" color="secondary" style={{ textAlign: 'center' }}>
                    {canCheckIn
                      ? 'Be the first — post today’s proof.'
                      : 'The feed fills up once the pool goes live.'}
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* ── REFERENCE ─────────────────────────────────────────────
                Read once when you join, rarely after. Collapsed so it
                stops pushing the daily action below the fold. */}
            <GlassCard padded={false}>
              <Pressable
                onPress={() => {
                  haptic.tap();
                  setRulesOpen((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: rulesOpen }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: space.md,
                }}
              >
                <Text variant="caption" color="muted">
                  Rules
                </Text>
                <Text variant="footnote" color="secondary">
                  {rulesOpen
                    ? 'Hide'
                    : `${formatINR(pool.buy_in_amount)} in · ${formatINR(pool.fine_amount)} a miss`}
                </Text>
              </Pressable>

              {rulesOpen && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    rowGap: space.md,
                    paddingHorizontal: space.md,
                    paddingBottom: space.md,
                  }}
                >
                  <View style={{ width: '50%' }}>
                    <Stat label="Buy-in" value={formatINR(pool.buy_in_amount)} />
                  </View>
                  <View style={{ width: '50%' }}>
                    <Stat label="Fine / miss" value={formatINR(pool.fine_amount)} />
                  </View>
                  <View style={{ width: '50%' }}>
                    <Stat label="Duration" value={`${pool.duration_days} days`} />
                  </View>
                  <View style={{ width: '50%' }}>
                    <Stat label="Payout" value={PAYOUT_LABEL[pool.payout_rule]} />
                  </View>
                  <View style={{ width: '50%' }}>
                    <Stat label="Grace tokens" value={String(pool.grace_tokens_per_member)} />
                  </View>
                  <View style={{ width: '50%' }}>
                    <Stat
                      label="Elimination"
                      value={pool.elimination_threshold ? `${pool.elimination_threshold} misses` : 'Off'}
                    />
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Organiser-only destructive control, last and quiet */}
            {pool.is_organiser && pool.status === 'pending' && (
              <Button
                label="Cancel pool"
                variant="danger"
                size="md"
                loading={cancelPool.isPending}
                onPress={confirmCancel}
                style={{ alignSelf: 'center' }}
              />
            )}
            {pool.status === 'active' && (
              <Button label="Share invite" variant="ghost" size="md" onPress={share} style={{ alignSelf: 'center' }} />
            )}
          </>
        )}
      </ScrollView>

      <CommentSheet
        poolId={id}
        checkInId={commentsFor}
        visible={commentsFor !== null}
        onClose={() => setCommentsFor(null)}
      />

      {/* Buy-in */}
      {pool ? (
        <PaySheet
          poolId={pool.id}
          title="Pay your buy-in"
          subject={pool.name}
          amount={pool.buy_in_amount}
          note="One-time. Goes straight into the pot and is paid out when the pool ends."
          failureCopy="We’ll retry automatically in 6 hours."
          isStarting={startCheckout.isPending}
          onStart={(ok, fail) =>
            startCheckout.mutate(pool.id, { onSuccess: ok, onError: (e) => fail(e as Error) })
          }
          visible={payOpen}
          onClose={() => setPayOpen(false)}
          onPaid={() => {
            setPayOpen(false);
            refresh();
          }}
        />
      ) : null}

      {/* Settling an outstanding fine (F5.6) */}
      {pool && payingFine ? (
        <PaySheet
          poolId={pool.id}
          title="Clear this fine"
          subject={`${payingFine.pool_name} · ${payingFine.incurred_on}`}
          amount={payingFine.amount}
          note="Paying this settles your account and unblocks check-ins straight away."
          failureCopy="That didn’t go through. Try again, or use a different method."
          isStarting={startFinePayment.isPending}
          onStart={(ok, fail) =>
            startFinePayment.mutate(payingFine.transaction_id, {
              onSuccess: ok,
              onError: (e) => fail(e as Error),
            })
          }
          visible={!!payingFine}
          onClose={() => setPayingFine(null)}
          onPaid={() => {
            setPayingFine(null);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
}
