/**
 * Wallet data (F7.1 / F7.2).
 *
 * This is a STATEMENT, not a stored-value wallet. CONQR holds no balance —
 * buy-ins and fines are pulled from the user's own bank through the UPI
 * Autopay mandate, and payouts go back out through Razorpay Route. Every
 * figure here is derived from the transaction ledger.
 *
 * There is deliberately no "add money": holding customer funds in India is a
 * Prepaid Payment Instrument and needs an RBI licence.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { PayoutRule } from '../pools/draft';

export interface WalletSummary {
  deposited: number;
  fined: number;
  won: number;
  refunded: number;
  owed: number;
  /** Winnings and refunds back, minus everything that has left. */
  net: number;
  /** Committed to pools that have not finished yet. */
  in_play: number;
  pools_completed: number;
  pools_active: number;
  pools_eliminated: number;
  win_rate: number | null;
}

export interface PoolPosition {
  pool_id: string;
  pool_name: string;
  emoji: string;
  pool_status: 'pending' | 'active' | 'completed' | 'cancelled';
  my_status: string;
  paid_in: number;
  fines_paid: number;
  fines_owed: number;
  total_pot: number;
  my_rank: number | null;
  members: number;
  payout_rule: PayoutRule;
  /** Net of the 5% platform fee and 18% GST on that fee. An estimate. */
  estimated_payout: number;
  ends_at: string;
}

export type LedgerFilter = 'all' | 'money_in' | 'money_out' | 'fines' | 'payouts' | 'pending';

export interface LedgerRow {
  id: string;
  pool_id: string | null;
  pool_name: string | null;
  emoji: string | null;
  amount: number;
  direction: 'in' | 'out';
  transaction_type: 'deposit' | 'fine' | 'payout' | 'refund' | 'power_up' | 'subscription' | 'platform_fee';
  status: 'pending' | 'succeeded' | 'failed' | 'retry_scheduled' | 'written_off';
  failure_reason: string | null;
  retry_count: number;
  provider_payment_id: string | null;
  utr_number: string | null;
  gst_amount: number | null;
  created_at: string;
  settled_at: string | null;
}

export function useWalletSummary() {
  return useQuery({
    queryKey: ['walletSummary'],
    queryFn: async (): Promise<WalletSummary> => {
      const { data, error } = await supabase.rpc('my_wallet_summary');
      if (error) throw error;
      return data as WalletSummary;
    },
  });
}

export function usePoolPositions() {
  return useQuery({
    queryKey: ['poolPositions'],
    queryFn: async (): Promise<PoolPosition[]> => {
      const { data, error } = await supabase.rpc('my_pool_positions');
      if (error) throw error;
      return (data as PoolPosition[]) ?? [];
    },
  });
}

export function useLedger(filter: LedgerFilter = 'all') {
  return useQuery({
    queryKey: ['ledger', filter],
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data, error } = await supabase.rpc('my_ledger', {
        p_filter: filter,
        p_limit: 100,
        p_before: null,
      });
      if (error) throw error;
      return (data as LedgerRow[]) ?? [];
    },
  });
}

/** What a ledger row is, in one phrase. */
export function ledgerLabel(row: LedgerRow): string {
  switch (row.transaction_type) {
    case 'deposit':
      return 'Buy-in';
    case 'fine':
      return 'Missed day';
    case 'payout':
      return 'Winnings';
    case 'refund':
      return 'Refund';
    case 'power_up':
      return 'Power-up';
    case 'subscription':
      return 'CONQR Pro';
    default:
      return 'Platform fee';
  }
}

export function statusLabel(row: LedgerRow): { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } {
  switch (row.status) {
    case 'succeeded':
      return { text: 'Settled', tone: 'ok' };
    case 'pending':
      return { text: 'Scheduled', tone: 'muted' };
    case 'retry_scheduled':
      return { text: `Retrying (${row.retry_count}/3)`, tone: 'warn' };
    case 'failed':
      return { text: 'Needs paying', tone: 'bad' };
    default:
      return { text: 'Written off', tone: 'muted' };
  }
}

export const PAYOUT_RULE_LABEL: Record<PayoutRule, string> = {
  winner_takes_all: 'Winner takes all',
  top_3_split: 'Top 3 split',
  proportional: 'Split by consistency',
};
