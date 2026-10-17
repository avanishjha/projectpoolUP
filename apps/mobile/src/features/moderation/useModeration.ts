/**
 * Moderation (F11.3) — the appeal court for a disputed check-in.
 *
 * Two audiences in one feature:
 *  - the accused, who gets 24h to explain themselves (`useMyFlagged`,
 *    `useSubmitDispute`), and
 *  - a moderator, who sees the queue and rules on it (`useModerationQueue`,
 *    `useReviewCheckIn`).
 *
 * Every RPC here is capability-gated server-side; `useCan()` only decides
 * whether to render the entry point. A verdict can reset a streak and issue a
 * ₹ fine, so the mutations invalidate the money and pool caches too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type ModerationKind = 'all' | 'check_in' | 'comment';
export type Verdict = 'upheld' | 'cleared';
export type DisputeStatus = 'open' | 'accepted' | 'rejected';

export interface ModerationItem {
  kind: 'check_in' | 'comment';
  id: string;
  pool_id: string;
  pool_name: string;
  author_id: string;
  author_name: string | null;
  author_username: string | null;
  content: string | null;
  image_path: string | null;
  liveness_prompt: string | null;
  blur_score: number | null;
  report_count: number;
  reasons: string[];
  flagged_at: string;
  has_dispute: boolean;
  dispute_body: string | null;
  dispute_deadline: string | null;
  review_deadline: string | null;
}

export interface FlaggedCheckIn {
  check_in_id: string;
  pool_id: string;
  pool_name: string;
  checkin_date: string;
  reported_count: number;
  can_dispute: boolean;
  dispute_deadline: string;
  dispute_status: DisputeStatus | null;
}

export interface ModerationStats {
  open_check_ins: number;
  open_comments: number;
  open_disputes: number;
  overdue: number;
  actions_7d: number;
}

interface RpcResult {
  ok?: boolean;
  error?: string;
  [k: string]: unknown;
}

/** The moderator's queue, oldest first — the overdue ones surface at the top. */
export function useModerationQueue(kind: ModerationKind = 'all') {
  return useQuery({
    queryKey: ['moderationQueue', kind],
    queryFn: async (): Promise<ModerationItem[]> => {
      const { data, error } = await supabase.rpc('moderation_queue', { p_kind: kind });
      if (error) throw error;
      return (data as ModerationItem[]) ?? [];
    },
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['moderationStats'],
    queryFn: async (): Promise<ModerationStats | null> => {
      const { data, error } = await supabase.rpc('moderation_stats');
      if (error) throw error;
      const r = data as RpcResult;
      return r?.error ? null : (data as unknown as ModerationStats);
    },
  });
}

/** Check-ins of *mine* that are hidden pending review. */
export function useMyFlagged() {
  return useQuery({
    queryKey: ['myFlagged'],
    queryFn: async (): Promise<FlaggedCheckIn[]> => {
      const { data, error } = await supabase.rpc('my_flagged_check_ins');
      if (error) throw error;
      return (data as FlaggedCheckIn[]) ?? [];
    },
  });
}

function throwIfRefused(data: unknown) {
  const r = data as RpcResult;
  if (!r?.ok) throw new Error(String(r?.error ?? 'failed'));
  return r;
}

export function useReviewCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { checkInId: string; verdict: Verdict; note?: string }) => {
      const { data, error } = await supabase.rpc('review_check_in', {
        p_check_in_id: v.checkInId,
        p_verdict: v.verdict,
        p_note: v.note ?? null,
      });
      if (error) throw error;
      return throwIfRefused(data);
    },
    onSuccess: () => {
      // A verdict moves money and standings, not just the queue.
      ['moderationQueue', 'moderationStats', 'feed', 'poolDetail', 'walletSummary', 'ledger']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useReviewComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { commentId: string; verdict: Verdict }) => {
      const { data, error } = await supabase.rpc('review_comment', {
        p_comment_id: v.commentId,
        p_verdict: v.verdict,
      });
      if (error) throw error;
      return throwIfRefused(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moderationQueue'] });
      qc.invalidateQueries({ queryKey: ['moderationStats'] });
    },
  });
}

/** One dispute per check-in, minimum 20 characters — enforced server-side. */
export function useSubmitDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { checkInId: string; body: string }) => {
      const { data, error } = await supabase.rpc('submit_dispute', {
        p_check_in_id: v.checkInId,
        p_body: v.body,
      });
      if (error) throw error;
      return throwIfRefused(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myFlagged'] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { userId: string; days: number; note?: string }) => {
      const { data, error } = await supabase.rpc('suspend_user', {
        p_user_id: v.userId,
        p_days: v.days,
        p_note: v.note ?? null,
      });
      if (error) throw error;
      return throwIfRefused(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderationQueue'] }),
  });
}

/** Mirrors the report_reason enum in migration 0003. Keep them in step. */
export const REASON_LABEL: Record<string, string> = {
  not_real_photo: 'Not a real photo',
  reused_photo: 'Reused photo',
  wrong_person: 'Wrong person',
  harassment: 'Harassment',
  spam: 'Spam',
  other: 'Other',
};

export function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ');
}

/** "4h left" / "overdue by 2h" against a review or dispute deadline. */
export function deadlineLabel(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: '', overdue: false };
  const ms = new Date(iso).getTime() - Date.now();
  const overdue = ms < 0;
  const h = Math.floor(Math.abs(ms) / 3_600_000);
  const m = Math.floor((Math.abs(ms) % 3_600_000) / 60_000);
  const span = h >= 24 ? `${Math.floor(h / 24)}d` : h >= 1 ? `${h}h` : `${m}m`;
  return { text: overdue ? `${span} overdue` : `${span} left`, overdue };
}

export const DISPUTE_MIN_LENGTH = 20;
