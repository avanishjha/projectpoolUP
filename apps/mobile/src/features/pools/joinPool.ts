/** Pool preview + join by invite code (migration 0011). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { ChallengeType } from './challenges';

export interface PoolPreview {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  challenge_type: ChallengeType;
  buy_in_amount: number;
  fine_amount: number;
  max_members: number;
  member_count: number;
  start_date: string;
  duration_days: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  already_member: boolean;
}

/** Normalise a code: uppercase alnum, ≤6 chars. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/** Live preview once a full 6-char code is entered. */
export function usePoolPreview(code: string) {
  const enabled = normalizeCode(code).length === 6;
  return useQuery({
    queryKey: ['poolPreview', normalizeCode(code)],
    enabled,
    retry: false,
    queryFn: async (): Promise<PoolPreview | null> => {
      const { data, error } = await supabase.rpc('preview_pool_by_code', {
        p_code: normalizeCode(code),
      });
      if (error) throw error;
      const row = (data as PoolPreview[])?.[0];
      return row ?? null;
    },
  });
}

export type JoinError =
  | 'not_authenticated'
  | 'delinquent'
  | 'invalid_code'
  | 'already_started'
  | 'already_member'
  | 'full';

export const JOIN_ERROR_COPY: Record<JoinError, string> = {
  not_authenticated: 'Please sign in again.',
  delinquent: 'Clear your pending fines before joining new pools.',
  invalid_code: 'That invite code doesn’t exist.',
  already_started: 'This pool has already started.',
  already_member: 'You’re already in this pool.',
  full: 'This pool is full.',
};

export function useJoinPool() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<{ poolId: string; poolName: string }> => {
      let { data, error } = await supabase.rpc('join_pool', { p_code: normalizeCode(code) });
      // Stale token → refresh once and retry (same self-heal as pool creation).
      if (error && (error.code === '42501' || /jwt|token|row-level security/i.test(error.message ?? ''))) {
        await supabase.auth.refreshSession();
        ({ data, error } = await supabase.rpc('join_pool', { p_code: normalizeCode(code) }));
      }
      if (error) throw error;
      const result = data as { ok: boolean; error?: JoinError; pool_id?: string; pool_name?: string };
      if (!result.ok) {
        const e = new Error(result.error ?? 'invalid_code');
        e.name = 'JoinError';
        throw e;
      }
      return { poolId: result.pool_id!, poolName: result.pool_name! };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools', userId] });
    },
  });
}
