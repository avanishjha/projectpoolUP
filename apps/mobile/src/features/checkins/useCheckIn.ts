/** Check-in submission + today's state (migration 0014). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { checkInPath } from './image';

export interface TodayCheckIn {
  checked_in: boolean;
  check_in_id: string | null;
  image_path: string | null;
  caption: string | null;
  created_at: string | null;
}

export function useTodayCheckIn(poolId: string | undefined) {
  return useQuery({
    queryKey: ['checkInToday', poolId],
    enabled: !!poolId,
    queryFn: async (): Promise<TodayCheckIn | null> => {
      const { data, error } = await supabase.rpc('my_check_in_today', { p_pool_id: poolId });
      if (error) throw error;
      return (data as TodayCheckIn) ?? null;
    },
  });
}

export interface SubmitArgs {
  poolId: string;
  userId: string;
  base64: string;
  caption: string;
  livenessPrompt: string | null;
  blurScore: number | null;
  capturedAt: Date;
}

export interface SubmitResult {
  checkInId: string;
  replaced: boolean;
  currentStreak: number;
  poolName: string;
}

const SUBMIT_ERROR_COPY: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  pool_not_found: 'This pool no longer exists.',
  pool_not_active: 'This pool isn’t running yet.',
  not_a_member: 'You’re not a member of this pool.',
  membership_eliminated: 'You’ve been eliminated from this pool.',
  membership_pending: 'Your membership isn’t active yet.',
  membership_delinquent: 'Clear your pending fines to check in.',
  window_not_open: 'The check-in window hasn’t opened yet today.',
  buy_in_unpaid: 'Pay your buy-in first — you’re not in the pot yet.',
  not_started: 'This pool hasn’t started yet.',
  pool_ended: 'This pool has finished.',
};

export function submitErrorCopy(code: string): string {
  return SUBMIT_ERROR_COPY[code] ?? 'Could not post your check-in. Please try again.';
}

export function useSubmitCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: SubmitArgs): Promise<SubmitResult> => {
      const path = checkInPath(args.poolId, args.userId);

      // Upload bytes (base64 → Uint8Array; RN's Blob path uploads 0 bytes).
      const bytes = Uint8Array.from(atob(args.base64), (c) => c.charCodeAt(0));
      if (bytes.byteLength === 0) throw new Error('empty_image');
      const { error: upErr } = await supabase.storage
        .from('check-ins')
        .upload(path, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data, error } = await supabase.rpc('submit_check_in', {
        p_pool_id: args.poolId,
        p_image_path: path,
        p_caption: args.caption.trim() || null,
        p_liveness_prompt: args.livenessPrompt,
        p_blur_score: args.blurScore,
        p_client_captured_at: args.capturedAt.toISOString(),
      });
      if (error) throw new Error(error.message);

      const result = data as {
        ok: boolean;
        error?: string;
        check_in_id?: string;
        replaced?: boolean;
        current_streak?: number;
        pool_name?: string;
      };
      if (!result.ok) throw new Error(result.error ?? 'unknown');

      return {
        checkInId: result.check_in_id!,
        replaced: !!result.replaced,
        currentStreak: result.current_streak ?? 0,
        poolName: result.pool_name ?? '',
      };
    },
    onSuccess: (_r, args) => {
      queryClient.invalidateQueries({ queryKey: ['checkInToday', args.poolId] });
      queryClient.invalidateQueries({ queryKey: ['poolDetail', args.poolId] });
      queryClient.invalidateQueries({ queryKey: ['poolLeaderboard', args.poolId] });
    },
  });
}
