/**
 * Moderation queue (F11.3) — where a reported check-in is actually judged.
 *
 * Gated twice: `useCan('moderation.queue.view')` decides whether this screen
 * renders anything, and every RPC re-checks the capability server-side. The
 * client gate exists only so a member never sees a court they cannot sit on.
 *
 * The verdict is consequential — upholding resets a streak and queues a fine —
 * so it confirms first and shows all the evidence (photo, that day's liveness
 * prompt, the reasons, and the accused's own account) in one card.
 */
import { useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../src/lib/nav';
import { useCan } from '../../src/features/auth/useCan';
import { useSignedImage } from '../../src/features/feed/useFeed';
import {
  deadlineLabel,
  reasonLabel,
  useModerationQueue,
  useModerationStats,
  useReviewCheckIn,
  useReviewComment,
  type ModerationItem,
  type ModerationKind,
  type Verdict,
} from '../../src/features/moderation/useModeration';
import { toast } from '../../src/stores/toastStore';
import {
  Button,
  Chip,
  ConfirmSheet,
  EmptyState,
  GlassCard,
  haptic,
  screenX,
  SegmentedControl,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../../src/ui';

const FILTERS: { value: ModerationKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'check_in', label: 'Check-ins' },
  { value: 'comment', label: 'Comments' },
];

function Evidence({ path }: { path: string | null }) {
  const theme = useTheme();
  const signed = useSignedImage(path);

  if (!path) return null;
  if (signed.isPending) return <Skeleton height={260} radius="lg" />;
  if (!signed.data) {
    return (
      <View
        style={{
          height: 160,
          borderRadius: 16,
          backgroundColor: theme.glassSurface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="footnote" color="muted">
          Photo unavailable — judge on the reports alone, or skip it.
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: signed.data }}
      style={{ width: '100%', height: 260, borderRadius: 16, backgroundColor: theme.glassSurface }}
      resizeMode="cover"
      accessibilityLabel="The reported check-in photo"
    />
  );
}

function QueueCard({
  item,
  onVerdict,
  busy,
}: {
  item: ModerationItem;
  onVerdict: (item: ModerationItem, verdict: Verdict) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const due = deadlineLabel(item.review_deadline);

  return (
    <GlassCard strong={due.overdue} radius="xl">
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
            {item.author_name ?? item.author_username ?? 'Someone'}
          </Text>
          <Text variant="caption" style={{ color: due.overdue ? theme.blood : theme.textMuted }}>
            {due.text}
          </Text>
        </View>

        <Text variant="caption" color="muted">
          {item.pool_name} · {item.report_count} {item.report_count === 1 ? 'report' : 'reports'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {item.reasons.map((r) => (
            <Chip key={r} label={reasonLabel(r)} />
          ))}
        </View>

        {item.kind === 'check_in' ? (
          <>
            <Evidence path={item.image_path} />
            {item.liveness_prompt ? (
              <Text variant="footnote" color="secondary">
                Prompt that day: {item.liveness_prompt}
              </Text>
            ) : null}
            {item.content ? (
              <Text variant="footnote" color="secondary">
                Caption: {item.content}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={{ padding: space.sm, borderRadius: 12, backgroundColor: theme.glassSurface }}>
            <Text variant="body">{item.content}</Text>
          </View>
        )}

        {item.has_dispute ? (
          <View
            style={{
              padding: space.sm,
              borderRadius: 12,
              backgroundColor: theme.glassSurface,
              borderLeftWidth: 2,
              borderLeftColor: theme.gold,
            }}
          >
            <Text variant="caption" color="muted">
              Their side
            </Text>
            <Text variant="footnote" style={{ marginTop: 2 }}>
              {item.dispute_body ?? 'Disputed, but left no text.'}
            </Text>
          </View>
        ) : item.kind === 'check_in' ? (
          <Text variant="caption" color="muted">
            No dispute filed
            {item.dispute_deadline ? ` · ${deadlineLabel(item.dispute_deadline).text} to file one` : ''}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Clear it"
              variant="secondary"
              disabled={busy}
              onPress={() => onVerdict(item, 'cleared')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Uphold"
              variant="danger"
              disabled={busy}
              onPress={() => onVerdict(item, 'upheld')}
            />
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

export default function ModerationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canView = useCan('moderation.queue.view');
  const [kind, setKind] = useState<ModerationKind>('all');
  const [pending, setPending] = useState<{ item: ModerationItem; verdict: Verdict } | null>(null);

  const queue = useModerationQueue(kind);
  const stats = useModerationStats();
  const reviewCheckIn = useReviewCheckIn();
  const reviewComment = useReviewComment();
  const busy = reviewCheckIn.isPending || reviewComment.isPending;

  const overdue = useMemo(
    () => (queue.data ?? []).filter((i) => deadlineLabel(i.review_deadline).overdue).length,
    [queue.data],
  );

  const ask = (item: ModerationItem, verdict: Verdict) => {
    haptic.warning();
    setPending({ item, verdict });
  };

  const commit = async () => {
    if (!pending) return;
    const { item, verdict } = pending;
    const upheld = verdict === 'upheld';
    try {
      if (item.kind === 'check_in') {
        const r = await reviewCheckIn.mutateAsync({ checkInId: item.id, verdict });
        haptic.success();
        if (upheld) toast.success(r.fined ? 'Upheld. Fine queued.' : 'Upheld.');
        else toast.success('Cleared. Back in the feed.');
      } else {
        await reviewComment.mutateAsync({ commentId: item.id, verdict });
        haptic.success();
        toast.success(upheld ? 'Stays hidden.' : 'Restored.');
      }
      setPending(null);
    } catch (e) {
      haptic.error();
      toast.error('Could not save that verdict', e instanceof Error ? e.message : undefined);
      setPending(null);
    }
  };

  const confirmCopy = (p: { item: ModerationItem; verdict: Verdict }) => {
    const isCheckIn = p.item.kind === 'check_in';
    if (p.verdict === 'upheld') {
      return {
        title: 'Uphold the reports?',
        body: isCheckIn
          ? 'Their streak resets, the day counts as a miss, and a fine is queued. This cannot be undone.'
          : 'The comment stays hidden.',
        confirmLabel: 'Uphold',
      };
    }
    return {
      title: 'Clear this?',
      body: isCheckIn
        ? 'The check-in goes back in the feed. Reporters who were wrong move closer to losing the ability to report.'
        : 'The comment comes back.',
      confirmLabel: 'Clear',
    };
  };

  if (!canView) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.canvas, paddingTop: insets.top + space.xl }}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          emoji="🔒"
          title="Not your queue"
          body="Moderation is for moderators and admins."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.xl,
          gap: space.sm,
        }}
        refreshControl={
          <RefreshControl
            refreshing={queue.isRefetching}
            onRefresh={() => {
              queue.refetch();
              stats.refetch();
            }}
            tintColor={theme.textMuted}
          />
        }
      >
        <Pressable
          onPress={() => {
            haptic.tap();
            goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ marginBottom: space.xs }}
        >
          <ChevronLeft size={24} color={theme.textSecondary} strokeWidth={2} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <ShieldAlert size={22} color={theme.gold} strokeWidth={2} />
          <Text variant="title1">Moderation</Text>
        </View>

        {stats.data ? (
          <Text variant="footnote" color={overdue > 0 ? 'blood' : 'secondary'}>
            {stats.data.open_check_ins + stats.data.open_comments} waiting ·{' '}
            {stats.data.open_disputes} disputed ·{' '}
            {overdue > 0 ? `${overdue} past the 48h window` : 'all inside the 48h window'} ·{' '}
            {stats.data.actions_7d} judged this week
          </Text>
        ) : null}

        <SegmentedControl
          options={FILTERS}
          value={kind}
          onChange={(v) => {
            haptic.select();
            setKind(v);
          }}
        />

        {queue.isPending ? (
          <View style={{ gap: space.sm }}>
            <Skeleton height={320} radius="xl" />
            <Skeleton height={320} radius="xl" />
          </View>
        ) : queue.error ? (
          <EmptyState emoji="⚠️" title="Could not load the queue" body="Pull down to try again." />
        ) : (queue.data?.length ?? 0) === 0 ? (
          <EmptyState
            emoji="✅"
            title="Nothing to judge"
            body="No reported check-ins or comments are waiting. The feed is clean."
          />
        ) : (
          (queue.data ?? []).map((item) => (
            <QueueCard key={`${item.kind}:${item.id}`} item={item} onVerdict={ask} busy={busy} />
          ))
        )}
      </ScrollView>

      {pending ? (
        <ConfirmSheet
          visible
          destructive={pending.verdict === 'upheld'}
          loading={busy}
          onConfirm={commit}
          onCancel={() => setPending(null)}
          {...confirmCopy(pending)}
        />
      ) : null}
    </View>
  );
}
