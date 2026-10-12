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

export interface StartReadiness {
  members: number;
  settled: number;
  needed: number;
  i_have_paid: boolean;
  is_free: boolean;
  starts_at: string;
  will_start: boolean;
}

/**
 * Whether this pool will actually start. A pool with fewer than two settled
 * members is cancelled on its start date, so the UI has to say so out loud.
 */
export function usePoolReadiness(poolId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['poolReadiness', poolId],
    enabled: !!poolId && enabled,
    queryFn: async (): Promise<StartReadiness | null> => {
      const { data, error } = await supabase.rpc('pool_start_readiness', { p_pool_id: poolId });
      if (error) throw error;
      return (data as StartReadiness) ?? null;
    },
  });
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
      queryClient.invalidateQueries({ queryKey: ['poolReadiness', poolId] });
      queryClient.invalidateQueries({ queryKey: ['poolDetail', poolId] });
      queryClient.invalidateQueries({ queryKey: ['poolLeaderboard', poolId] });
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    },
  });
}

export interface OutstandingFine {
  transaction_id: string;
  pool_id: string;
  pool_name: string;
  amount: number;
  status: PaymentStatus;
  failure_reason: string | null;
  retry_count: number;
  next_retry_at: string | null;
  incurred_on: string;
  is_terminal: boolean;
}

/** What this member still owes — the thing that keeps them delinquent. */
export function useOutstandingFines(poolId?: string) {
  return useQuery({
    queryKey: ['outstandingFines', poolId ?? 'all'],
    queryFn: async (): Promise<OutstandingFine[]> => {
      const { data, error } = await supabase.rpc('my_outstanding_fines', {
        p_pool_id: poolId ?? null,
      });
      if (error) throw error;
      return (data as OutstandingFine[]) ?? [];
    },
  });
}

/**
 * Opens a checkout for a fine the user owes. Deliberately NOT subject to the
 * RBI pre-debit gate — that governs auto-debits pulled without the customer
 * present, not a payment they are making themselves.
 */
export function useStartFinePayment() {
  return useMutation({
    mutationFn: async (transactionId: string): Promise<Checkout> => {
      const { data, error } = await supabase.rpc('start_fine_payment', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
      const result = data as Checkout;
      if (!result.ok) throw new Error(result.error ?? 'checkout_failed');
      return result;
    },
  });
}

/** Why a fine is outstanding, in words the person who owes it will understand. */
export function fineReasonCopy(fine: OutstandingFine): string {
  if (fine.status === 'failed') {
    return fine.failure_reason === 'no_mandate'
      ? 'We couldn’t auto-collect this — pay it here to get back in.'
      : fine.failure_reason === 'exceeds_mandate'
        ? 'This was above your auto-pay limit, so it needs paying by hand.'
        : `Collection failed after ${fine.retry_count} attempts. Pay it to clear your account.`;
  }
  if (fine.status === 'retry_scheduled') {
    return 'We’ll try again automatically — or clear it now.';
  }
  return 'Scheduled for collection.';
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
