/** Pool detail: header + leaderboard + organiser cancel (migration 0013). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { ChallengeType } from './challenges';
import type { PayoutRule, Visibility } from './draft';

export interface PoolDetail {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  challenge_type: ChallengeType;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  visibility: Visibility;
  start_date: string;
  end_date: string;
  duration_days: number;
  buy_in_amount: number;
  fine_amount: number;
  total_pot: number;
  max_members: number;
  payout_rule: PayoutRule;
  elimination_threshold: number | null;
  grace_tokens_per_member: number;
  invite_code: string;
  creator_id: string;
  is_organiser: boolean;
  my_status: 'pending' | 'active' | 'eliminated' | 'completed' | 'delinquent' | null;
  member_count: number;
  spectator_count: number;
  check_in_deadline_utc: number;
  check_in_window_start: number | null;
  timezone: string;
  paid_members: number;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: 'pending' | 'active' | 'eliminated' | 'completed' | 'delinquent';
  current_streak: number;
  longest_streak: number;
  fines_paid: number;
  misses_count: number;
  compliance_pct: number;
  is_me: boolean;
}

export function usePoolDetail(poolId: string | undefined) {
  return useQuery({
    queryKey: ['poolDetail', poolId],
    enabled: !!poolId,
    queryFn: async (): Promise<PoolDetail | null> => {
      const { data, error } = await supabase.rpc('pool_detail', { p_pool_id: poolId });
      if (error) throw error;
      return ((data as PoolDetail[])?.[0] ?? null);
    },
  });
}

export function usePoolLeaderboard(poolId: string | undefined) {
  return useQuery({
    queryKey: ['poolLeaderboard', poolId],
    enabled: !!poolId,
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc('pool_leaderboard', { p_pool_id: poolId });
      if (error) throw error;
      return (data as LeaderboardRow[]) ?? [];
    },
  });
}

export function useCancelPool() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poolId: string): Promise<void> => {
      const { data, error } = await supabase.rpc('cancel_pool', { p_pool_id: poolId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'cancel_failed');
    },
    onSuccess: (_data, poolId) => {
      queryClient.invalidateQueries({ queryKey: ['pools', userId] });
      queryClient.invalidateQueries({ queryKey: ['poolDetail', poolId] });
    },
  });
}
