/**
 * Buy-in checkout (F5.1, simulated provider).
 *
 * This sheet stands in for the Razorpay Checkout surface. The two outcome
 * buttons are the only thing here that is fake — everything around them
 * (opening the order, the server state machine, the pot recalculation) is
 * the real path a live payment will take.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  fonts,
  formatINR,
  haptic,
  screenX,
  space,
  Text,
  useTheme,
} from '../../ui';
import { toast } from '../../stores/toastStore';
import {
  checkoutErrorCopy,
  useSimulatePayment,
  useStartCheckout,
  type Checkout,
} from './useCheckout';

export function BuyInSheet({
  poolId,
  poolName,
  amount,
  visible,
  onClose,
  onPaid,
}: {
  poolId: string;
  poolName: string;
  amount: number;
  visible: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const startCheckout = useStartCheckout();
  const simulate = useSimulatePayment(poolId);

  const [order, setOrder] = useState<Checkout | null>(null);

  const open = () => {
    haptic.tap();
    startCheckout.mutate(poolId, {
      onSuccess: (result) => {
        if (result.already_paid) {
          toast.success('Already paid', 'Your buy-in is settled.');
          onPaid();
          return;
        }
        setOrder(result);
      },
      onError: (err) => {
        haptic.error();
        toast.error('Could not start', checkoutErrorCopy((err as Error).message));
      },
    });
  };

  const pay = (outcome: 'success' | 'fail') => {
    if (!order?.order_id) return;
    simulate.mutate(
      { orderId: order.order_id, outcome },
      {
        onSuccess: (result) => {
          if (result.outcome === 'succeeded') {
            haptic.success();
            toast.success('Payment received', `${formatINR(amount)} added to the pot.`);
            setOrder(null);
            onPaid();
          } else {
            haptic.error();
            toast.error('Payment declined', 'We’ll retry automatically in 6 hours.');
            setOrder(null);
            onClose();
          }
        },
        onError: (err) => {
          haptic.error();
          toast.error('Payment failed', checkoutErrorCopy((err as Error).message));
        },
      },
    );
  };

  const busy = startCheckout.isPending || simulate.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.raised,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingBottom: insets.bottom + space.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: screenX,
              paddingTop: space.md,
              paddingBottom: space.sm,
            }}
          >
            <Text variant="headline">Pay your buy-in</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={theme.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: screenX, alignItems: 'center', paddingVertical: space.lg }}>
            <Text variant="caption" color="muted">
              {poolName}
            </Text>
            <Text
              style={{
                fontFamily: fonts.displayBold,
                fontSize: 46,
                lineHeight: 54,
                color: theme.gold,
                marginTop: 2,
              }}
            >
              {formatINR(amount)}
            </Text>
            <Text variant="footnote" color="secondary" style={{ textAlign: 'center', marginTop: space.xxs }}>
              One-time. Goes straight into the pot and is paid out when the pool ends.
            </Text>
          </View>

          <View style={{ paddingHorizontal: screenX, gap: space.xs }}>
            {!order ? (
              <Button
                label={startCheckout.isPending ? 'Opening…' : 'Continue to payment'}
                fullWidth
                loading={startCheckout.isPending}
                onPress={open}
              />
            ) : (
              <>
                <View
                  style={{
                    backgroundColor: theme.glassSurface,
                    borderWidth: 1,
                    borderColor: theme.glassBorder,
                    borderRadius: 14,
                    padding: space.sm,
                    marginBottom: space.xxs,
                  }}
                >
                  <Text variant="caption" color="muted">
                    Test provider · order {order.order_id?.slice(-8)}
                  </Text>
                  <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                    Razorpay Checkout opens here once it’s connected. Pick an outcome to
                    exercise the real server flow.
                  </Text>
                </View>

                {busy ? (
                  <View style={{ paddingVertical: space.md, alignItems: 'center' }}>
                    <ActivityIndicator color={theme.textMuted} />
                  </View>
                ) : (
                  <>
                    <Button label="Simulate success" fullWidth onPress={() => pay('success')} />
                    <Button
                      label="Simulate failure"
                      variant="secondary"
                      size="md"
                      fullWidth
                      onPress={() => pay('fail')}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
