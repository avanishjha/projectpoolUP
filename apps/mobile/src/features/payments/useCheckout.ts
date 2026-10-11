/**
 * Payment hooks (F5.1). Provider-agnostic by design: the client asks the
 * server to open a checkout and then hands control to a provider surface.
 * Today that surface is the simulator sheet; with Razorpay it becomes the
 * Checkout SDK and nothing else in this file changes.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type PaymentStatus =
  | 'none'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'retry_scheduled'
  | 'written_off';

export interface PoolPayment {
  status: PaymentStatus;
  amount?: number;
  order_id?: string;
  transaction_id?: string;
  failure_reason?: string | null;
  retry_count?: number;
}

export interface Checkout {
  ok: boolean;
  error?: string;
  free?: boolean;
  already_paid?: boolean;
  resumed?: boolean;
  transaction_id?: string;
  order_id?: string;
  amount?: number;
  provider?: string;
}

/** Where this member stands on their buy-in for one pool. */
export function usePoolPayment(poolId: string | undefined) {
  return useQuery({
    queryKey: ['poolPayment', poolId],
    enabled: !!poolId,
    queryFn: async (): Promise<PoolPayment> => {
      const { data, error } = await supabase.rpc('my_pool_payment', { p_pool_id: poolId });
      if (error) throw error;
      return (data as PoolPayment) ?? { status: 'none' };
    },
  });
}

/** Opens (or resumes) a checkout. Safe to call twice — the server dedupes. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (poolId: string): Promise<Checkout> => {
      const { data, error } = await supabase.rpc('start_checkout', { p_pool_id: poolId });
      if (error) throw error;
      const result = data as Checkout;
      if (!result.ok) throw new Error(result.error ?? 'checkout_failed');
      return result;
    },
  });
}

/**
 * Drives the simulated provider. This is the ONLY call that disappears when
 * Razorpay lands — its webhook will hit the same server-side state machine.
 */
export function useSimulatePayment(poolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { orderId: string; outcome: 'success' | 'fail' }) => {
      const { data, error } = await supabase.rpc('simulate_payment', {
        p_order_id: args.orderId,
        p_outcome: args.outcome,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; outcome?: string };
      if (!result.ok) throw new Error(result.error ?? 'payment_failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poolPayment', poolId] });
      queryClient.invalidateQueries({ queryKey: ['poolDetail', poolId] });
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    },
  });
}

export function checkoutErrorCopy(code: string): string {
  switch (code) {
    case 'not_a_member':
      return 'Join the pool before paying the buy-in.';
    case 'pool_not_found':
      return 'That pool no longer exists.';
    case 'not_authenticated':
      return 'Your session expired. Sign in again.';
    case 'insufficient_funds':
      return 'The payment was declined. We’ll retry in 6 hours.';
    case 'simulator_disabled_in_live':
      return 'Test payments are turned off.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
