/** Home — pool dashboard. Lists the pools you created and joined. */
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Plus, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_CLEARANCE } from '../../src/app-shell/FloatingDock';
import { usePools } from '../../src/features/pools/usePools';
import { EmptyState, haptic, PoolCard, screenX, Skeleton, space, Text, useTheme } from '../../src/ui';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: pools, isPending, isRefetching, refetch } = usePools();

  const openCreate = () => {
    haptic.tap();
    router.push('/create-pool');
  };

  const hasPools = (pools?.length ?? 0) > 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View
        style={{
          paddingHorizontal: screenX,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.md,
        }}
      >
        <Text variant="title1">CONQR</Text>
        {hasPools && (
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Pressable
              onPress={() => {
                haptic.tap();
                router.push('/join-pool');
              }}
              accessibilityRole="button"
              accessibilityLabel="Join a pool"
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.glassSurfaceStrong,
                borderWidth: 1,
                borderColor: theme.glassBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ticket size={20} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel="Create a pool"
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.glassSurfaceStrong,
                borderWidth: 1,
                borderColor: theme.glassBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={22} color={theme.ember} strokeWidth={2.4} />
            </Pressable>
          </View>
        )}
      </View>

      {isPending ? (
        <View style={{ paddingHorizontal: screenX, gap: space.sm }}>
          <Skeleton height={116} radius="xl" />
          <Skeleton height={116} radius="xl" />
        </View>
      ) : hasPools ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: screenX,
            paddingBottom: DOCK_CLEARANCE,
            gap: space.sm,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.textMuted} />
          }
        >
          {pools!.map((pool) => (
            <PoolCard key={pool.id} pool={pool} onPress={() => router.push(`/pool/${pool.id}`)} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: DOCK_CLEARANCE }}>
          <EmptyState
            emoji="🏆"
            title="No pools yet"
            body="Start a challenge with your friends — daily proof, real stakes, winner takes the pot."
            action={{ label: 'Create a Pool', onPress: openCreate }}
            secondaryAction={{
              label: 'Join with invite code',
              onPress: () => router.push('/join-pool'),
            }}
          />
        </View>
      )}
    </View>
  );
}
