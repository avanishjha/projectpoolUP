/**
 * Join a pool (F2.3, UC-04): enter or deep-link a 6-char code → live preview →
 * rules + consent → join. Full validation lives in the join_pool RPC; this
 * surfaces each rejection precisely. Payment (mandate + buy-in) arrives in F5 —
 * for now joining creates a 'pending' membership.
 */
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../src/lib/nav';
import {
  JOIN_ERROR_COPY,
  normalizeCode,
  useJoinPool,
  usePoolPreview,
  type JoinError,
} from '../src/features/pools/joinPool';
import { toast } from '../src/stores/toastStore';
import {
  Button,
  fonts,
  GlassCard,
  haptic,
  Input,
  MoneyText,
  screenX,
  Skeleton,
  space,
  Text,
  useTheme,
} from '../src/ui';

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function JoinPoolScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState(normalizeCode(params.code ?? ''));
  const preview = usePoolPreview(code);
  const join = useJoinPool();

  const complete = normalizeCode(code).length === 6;

  // Deep-linked code arriving after mount.
  useEffect(() => {
    if (params.code) setCode(normalizeCode(params.code));
  }, [params.code]);

  const pool = preview.data;
  const canJoin =
    !!pool && pool.status === 'pending' && !pool.already_member && pool.member_count < pool.max_members;

  const submit = () => {
    join.mutate(code, {
      onSuccess: ({ poolName }) => {
        haptic.success();
        toast.success('You’re in! 🔥', `Welcome to ${poolName}`);
        router.replace('/');
      },
      onError: (err) => {
        haptic.error();
        const key = (err as Error).message as JoinError;
        toast.error('Couldn’t join', JOIN_ERROR_COPY[key] ?? 'Please try again.');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenX,
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.xl,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>

        <Text variant="title1">Join a pool</Text>
        <Text variant="body" color="secondary" style={{ marginTop: space.xxs }}>
          Enter the 6-character invite code your friend shared.
        </Text>

        <Input
          value={code}
          onChangeText={(t) => setCode(normalizeCode(t))}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          autoFocus={!params.code}
          containerStyle={{ marginTop: space.xl }}
          style={{
            fontFamily: fonts.displayBold,
            fontSize: 26,
            letterSpacing: 8,
            textAlign: 'center',
          }}
        />

        {/* Preview */}
        {complete && (
          <View style={{ marginTop: space.lg }}>
            {preview.isPending ? (
              <GlassCard strong radius="xl">
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <Skeleton width={46} height={46} radius="md" />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                  </View>
                </View>
              </GlassCard>
            ) : pool ? (
              <GlassCard strong radius="xl">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: theme.glassSurfaceStrong,
                      borderWidth: 1,
                      borderColor: theme.glassBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24, lineHeight: 30 }}>{pool.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline" numberOfLines={1}>
                      {pool.name}
                    </Text>
                    <Text variant="footnote" color="secondary">
                      {pool.member_count}/{pool.max_members} joined ·{' '}
                      {pool.status === 'pending' ? `starts in ${daysUntil(pool.start_date)}d` : pool.status}
                    </Text>
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
                    marginTop: space.sm,
                    paddingTop: space.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.glassBorder,
                    gap: space.xl,
                  }}
                >
                  <View style={{ gap: 2 }}>
                    <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
                      Buy-in
                    </Text>
                    <MoneyText amount={pool.buy_in_amount} />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
                      Fine / miss
                    </Text>
                    <MoneyText amount={pool.fine_amount} color="blood" />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
                      Duration
                    </Text>
                    <Text style={{ fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 24, color: theme.textPrimary }}>
                      {pool.duration_days}d
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ) : (
              <GlassCard tone="shame">
                <Text variant="bodyMedium">No pool found for “{code}”. Check the code and try again.</Text>
              </GlassCard>
            )}
          </View>
        )}

        {pool && !canJoin && !preview.isPending && (
          <Text variant="footnote" color="blood" style={{ marginTop: space.sm }}>
            {pool.already_member
              ? 'You’re already in this pool.'
              : pool.status !== 'pending'
                ? 'This pool has already started.'
                : 'This pool is full.'}
          </Text>
        )}

        <View style={{ flex: 1 }} />

        {canJoin && (
          <Text variant="footnote" color="muted" style={{ textAlign: 'center', marginBottom: space.sm }}>
            By joining you commit to daily check-ins. Missing a day adds{' '}
            {`₹${pool.fine_amount}`} to the pot. Payment is set up when the pool goes live.
          </Text>
        )}
        <Button
          label={pool?.already_member ? 'Already joined' : 'Join Pool'}
          fullWidth
          loading={join.isPending}
          disabled={!canJoin}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
