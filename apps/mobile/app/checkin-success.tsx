/**
 * Check-in success (F3.5): the daily dopamine hit. Streak count, milestone
 * callout, and a route back into the pool. Streaks are incremented by the
 * CRON at the deadline (F6) — we show the streak as it stands plus today's
 * pending credit, which is honest without over-promising.
 */
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, fonts, GlassCard, screenX, space, Text, useTheme } from '../src/ui';

const MILESTONES = [7, 14, 21, 30, 50, 75, 100];

export default function CheckInSuccessScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { poolId, streak, replaced, poolName } = useLocalSearchParams<{
    poolId: string;
    streak: string;
    replaced: string;
    poolName: string;
  }>();

  const current = Number(streak ?? 0);
  const projected = current + 1; // today counts once the CRON confirms it
  const wasReplaced = replaced === '1';
  const nextMilestone = MILESTONES.find((m) => m > current);
  const toGo = nextMilestone ? nextMilestone - projected : null;

  const fire = projected >= 30 ? '🔥🔥🔥' : projected >= 14 ? '🔥🔥' : projected >= 7 ? '🔥' : '✅';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        paddingHorizontal: screenX,
        paddingTop: insets.top + space.huge,
        paddingBottom: insets.bottom + space.lg,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 64, lineHeight: 76 }}>{fire}</Text>
      <Text variant="title1" style={{ textAlign: 'center', marginTop: space.sm }}>
        {wasReplaced ? 'Check-in updated' : 'Check-in posted!'}
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center', marginTop: space.xxs }}>
        {poolName ? `${poolName} · ` : ''}Aaj ka kaam done.
      </Text>

      <View style={{ alignSelf: 'stretch', marginTop: space.xxl }}>
        <GlassCard strong radius="xl">
          <View style={{ alignItems: 'center', paddingVertical: space.sm, gap: 2 }}>
            <Text variant="caption" color="muted">
              Streak
            </Text>
            <Text
              style={{
                fontFamily: fonts.displayBold,
                fontSize: 52,
                lineHeight: 62,
                color: theme.textPrimary,
              }}
            >
              {projected}
            </Text>
            <Text variant="footnote" color="secondary">
              {projected === 1 ? 'day' : 'days'} · confirmed at tonight’s deadline
            </Text>
            {nextMilestone && toGo !== null && toGo > 0 ? (
              <Text variant="footnote" color="ember" style={{ marginTop: space.xs }}>
                {toGo} more {toGo === 1 ? 'day' : 'days'} to the {nextMilestone}-day milestone
              </Text>
            ) : null}
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignSelf: 'stretch', gap: space.xs }}>
        <Button
          label="Back to pool"
          fullWidth
          onPress={() => router.replace(poolId ? `/pool/${poolId}` : '/')}
        />
        <Button
          label="Home"
          variant="ghost"
          size="md"
          onPress={() => router.replace('/')}
          style={{ alignSelf: 'center' }}
        />
      </View>
    </View>
  );
}
