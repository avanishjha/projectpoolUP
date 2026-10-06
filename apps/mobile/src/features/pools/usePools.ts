/**
 * The current user's pools. For F2.1 that's pools they created (organiser);
 * membership-based pools join in once the paid join flow exists (F5).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { PayoutRule, Visibility } from './draft';
import type { ChallengeType } from './challenges';

export interface PoolRow {
  id: string;
  name: string;
  emoji: string;
  challenge_type: ChallengeType;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  visibility: Visibility;
  start_date: string;
  end_date: string;
  buy_in_amount: number;
  fine_amount: number;
  total_pot: number;
  max_members: number;
  payout_rule: PayoutRule;
  invite_code: string;
  creator_id: string;
  created_at: string;
}

const POOL_COLUMNS =
  'id, name, emoji, challenge_type, status, visibility, start_date, end_date, buy_in_amount, fine_amount, total_pot, max_members, payout_rule, invite_code, creator_id, created_at';

/** Every pool the user takes part in: ones they created + ones they joined. */
export function usePools() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['pools', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PoolRow[]> => {
      const [created, joined] = await Promise.all([
        supabase.from('pools').select(POOL_COLUMNS).eq('creator_id', userId!),
        supabase.from('pool_members').select(`pool:pools(${POOL_COLUMNS})`).eq('user_id', userId!),
      ]);
      if (created.error) throw created.error;
      if (joined.error) throw joined.error;

      const byId = new Map<string, PoolRow>();
      for (const p of (created.data ?? []) as PoolRow[]) byId.set(p.id, p);
      // PostgREST embeds a to-one relation as either an object or a 1-element
      // array depending on inference — normalise both.
      for (const row of (joined.data ?? []) as unknown as { pool: PoolRow | PoolRow[] | null }[]) {
        const p = Array.isArray(row.pool) ? row.pool[0] : row.pool;
        if (p) byId.set(p.id, p);
      }
      return [...byId.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });
}
