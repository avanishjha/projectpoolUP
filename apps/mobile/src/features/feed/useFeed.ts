/** Pool feed: unified check-ins + CRON events, reactions, comments, reports. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type ReactionType = 'fire' | 'flex' | 'crown' | 'skull' | 'respect';

export type PoolEventType =
  | 'missed_day'
  | 'fine_issued'
  | 'pool_started'
  | 'pool_completed'
  | 'streak_milestone'
  | 'member_eliminated'
  | 'shield_used'
  | 'grace_used';

export interface FeedRow {
  kind: 'check_in' | 'event';
  id: string;
  created_at: string;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  image_path: string | null;
  caption: string | null;
  liveness_prompt: string | null;
  is_verified: boolean | null;
  reported_count: number | null;
  reaction_count: number;
  comment_count: number;
  my_reaction: ReactionType | null;
  current_streak: number | null;
  event_type: PoolEventType | null;
  metadata: Record<string, unknown> | null;
}

export function useFeed(poolId: string | undefined) {
  return useQuery({
    queryKey: ['feed', poolId],
    enabled: !!poolId,
    queryFn: async (): Promise<FeedRow[]> => {
      const { data, error } = await supabase.rpc('pool_feed', {
        p_pool_id: poolId,
        p_limit: 40,
        p_before: null,
      });
      if (error) throw error;
      return (data as FeedRow[]) ?? [];
    },
  });
}

/** Check-in images live in a private bucket — every render needs a signed URL. */
export function useSignedImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signedImage', path],
    enabled: !!path,
    staleTime: 50 * 60_000, // refresh well before the 1h expiry
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from('check-ins')
        .createSignedUrl(path!, 60 * 60);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
}

export function useToggleReaction(poolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { checkInId: string; type: ReactionType }) => {
      const { data, error } = await supabase.rpc('toggle_reaction', {
        p_check_in_id: args.checkInId,
        p_type: args.type,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; my_reaction: ReactionType | null; count: number };
      if (!result.ok) throw new Error(result.error ?? 'failed');
      return result;
    },
    // Optimistic: the tap should feel instant, the server is the truth.
    onMutate: async ({ checkInId, type }) => {
      await queryClient.cancelQueries({ queryKey: ['feed', poolId] });
      const previous = queryClient.getQueryData<FeedRow[]>(['feed', poolId]);
      queryClient.setQueryData<FeedRow[]>(['feed', poolId], (rows) =>
        (rows ?? []).map((r) => {
          if (r.id !== checkInId) return r;
          const had = r.my_reaction;
          const next = had === type ? null : type;
          const delta = had && next ? 0 : had && !next ? -1 : 1;
          return { ...r, my_reaction: next, reaction_count: Math.max(0, r.reaction_count + delta) };
        }),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['feed', poolId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', poolId] });
    },
  });
}

export interface CommentRow {
  id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_mine: boolean;
  is_hidden: boolean;
}

export function useComments(checkInId: string | undefined) {
  return useQuery({
    queryKey: ['comments', checkInId],
    enabled: !!checkInId,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase.rpc('check_in_comments', { p_check_in_id: checkInId });
      if (error) throw error;
      return (data as CommentRow[]) ?? [];
    },
  });
}

export function usePostComment(poolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { checkInId: string; body: string; parentId?: string | null }) => {
      const { data, error } = await supabase.rpc('post_comment', {
        p_check_in_id: args.checkInId,
        p_body: args.body,
        p_parent_id: args.parentId ?? null,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'failed');
      return result;
    },
    onSuccess: (_r, args) => {
      queryClient.invalidateQueries({ queryKey: ['comments', args.checkInId] });
      queryClient.invalidateQueries({ queryKey: ['feed', poolId] });
    },
  });
}

export const REPORT_REASONS = [
  { value: 'not_real_photo', label: 'Not a real photo' },
  { value: 'reused_photo', label: 'Reused / old photo' },
  { value: 'wrong_person', label: 'Wrong person' },
  { value: 'other', label: 'Something else' },
] as const;

export function useReportCheckIn(poolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { checkInId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('report_check_in', {
        p_check_in_id: args.checkInId,
        p_reason: args.reason,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'failed');
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed', poolId] }),
  });
}
