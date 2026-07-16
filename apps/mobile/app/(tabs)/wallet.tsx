/** Wallet — balances, ledger, payout history (F7.x). */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, MoneyText, screenX, space, Text } from '../../src/ui';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.lg }}>
      <View style={{ paddingHorizontal: screenX, gap: space.lg }}>
        <Text variant="title1">Wallet</Text>
        <GlassCard strong radius="xl">
          <Text variant="caption" color="muted">
            Locked in pools
          </Text>
          <MoneyText amount={0} size="lg" />
          <Text variant="footnote" color="secondary" style={{ marginTop: space.xxs }}>
            Buy-ins and fines appear here once you join your first pool.
          </Text>
        </GlassCard>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <GlassCard style={{ flex: 1 }}>
            <Text variant="caption" color="muted">
              Lifetime won
            </Text>
            <MoneyText amount={0} color="mint" />
          </GlassCard>
          <GlassCard style={{ flex: 1 }}>
            <Text variant="caption" color="muted">
              Lifetime fined
            </Text>
            <MoneyText amount={0} color="blood" />
          </GlassCard>
        </View>
      </View>
    </View>
  );
}
