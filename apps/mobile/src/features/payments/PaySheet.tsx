/**
 * One payment surface for every kind of payment (F5.1 buy-in, F5.6 fines).
 *
 * Stands in for the Razorpay Checkout sheet. The two outcome buttons are the
 * only fake part — opening the order, the server state machine and the pot
 * recalculation are the real path a live payment takes.
 *
 * `onStart` is what makes it reusable: the caller supplies whichever RPC
 * opens the order, and everything after is identical.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, fonts, formatINR, haptic, screenX, space, Text, useTheme } from '../../ui';
import { toast } from '../../stores/toastStore';
import { checkoutErrorCopy, useSimulatePayment, type Checkout } from './useCheckout';

export function PaySheet({
  visible,
  onClose,
  onPaid,
  poolId,
  title,
  subject,
  amount,
  note,
  onStart,
  isStarting,
  failureCopy,
}: {
  visible: boolean;
  onClose: () => void;
  onPaid: () => void;
  /** Which pool's caches to refresh after settlement. */
  poolId: string | undefined;
  title: string;
  subject: string;
  amount: number;
  note: string;
  /** Opens the order. Resolves with the checkout, or throws. */
  onStart: (onSuccess: (c: Checkout) => void, onError: (e: Error) => void) => void;
  isStarting: boolean;
  /** What to say when the simulated payment is declined. */
  failureCopy: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const simulate = useSimulatePayment(poolId);
  const [order, setOrder] = useState<Checkout | null>(null);

  const close = () => {
    setOrder(null);
    onClose();
  };

  const open = () => {
    haptic.tap();
    onStart(
      (result) => {
        if (result.already_paid) {
          toast.success('Already paid', 'This one is settled.');
          setOrder(null);
          onPaid();
          return;
        }
        setOrder(result);
      },
      (err) => {
        haptic.error();
        toast.error('Could not start', checkoutErrorCopy(err.message));
      },
    );
  };

  const pay = (outcome: 'success' | 'fail') => {
    if (!order?.order_id) return;
    simulate.mutate(
      { orderId: order.order_id, outcome },
      {
        onSuccess: (result) => {
          if (result.outcome === 'succeeded') {
            haptic.success();
            toast.success('Payment received', `${formatINR(amount)} settled.`);
            setOrder(null);
            onPaid();
          } else {
            haptic.error();
            toast.error('Payment declined', failureCopy);
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

  const busy = isStarting || simulate.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
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
            <Text variant="headline">{title}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={theme.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: screenX, alignItems: 'center', paddingVertical: space.lg }}>
            <Text variant="caption" color="muted">
              {subject}
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
              {note}
            </Text>
          </View>

          <View style={{ paddingHorizontal: screenX, gap: space.xs }}>
            {!order ? (
              <Button
                label={isStarting ? 'Opening…' : 'Continue to payment'}
                fullWidth
                loading={isStarting}
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
