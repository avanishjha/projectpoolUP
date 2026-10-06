/**
 * The in-progress pool being created, and the mapping from this UI-friendly
 * draft to the `pools` insert payload.
 */
import type { ChallengeType } from './challenges';

export type PayoutRule = 'winner_takes_all' | 'top_3_split' | 'proportional';
export type Visibility = 'private' | 'public';
export type CheckInWindow = 'full_day' | 'morning';

export interface PoolDraft {
  name: string;
  emoji: string;
  challengeType: ChallengeType;
  description: string;
  durationDays: number;
  /** Days from today the pool starts (1–14). */
  startOffsetDays: number;
  /** UTC hour of the check-in deadline (0–23). 18 ≈ 11:30 PM IST. */
  deadlineUtcHour: number;
  window: CheckInWindow;
  buyIn: number;
  fine: number;
  /** null = no elimination. */
  elimination: number | null;
  payoutRule: PayoutRule;
  graceTokens: number;
  visibility: Visibility;
}

export const DEFAULT_DRAFT: PoolDraft = {
  name: '',
  emoji: '🔥',
  challengeType: 'custom',
  description: '',
  durationDays: 30,
  startOffsetDays: 1,
  deadlineUtcHour: 18,
  window: 'full_day',
  buyIn: 499,
  fine: 99,
  elimination: null,
  payoutRule: 'winner_takes_all',
  graceTokens: 1,
  visibility: 'private',
};

/** India-priced stake tiers (India Edition §3.2). */
export const STAKE_TIERS = [
  { key: 'casual', label: 'Casual', emoji: '🎮', buyIn: 99, fine: 25 },
  { key: 'serious', label: 'Serious', emoji: '💪', buyIn: 499, fine: 99 },
  { key: 'hardcore', label: 'Hardcore', emoji: '🔥', buyIn: 1999, fine: 249 },
  { key: 'elite', label: 'Elite', emoji: '👑', buyIn: 4999, fine: 499 },
] as const;

export const DEADLINE_PRESETS = [
  { label: 'Late night · 11:30 PM', hour: 18 },
  { label: 'Evening · 8:30 PM', hour: 15 },
  { label: 'Morning · 7:30 AM', hour: 2 },
] as const;

export const DURATION_PRESETS = [21, 30, 60, 75] as const;

// ── Validation ───────────────────────────────────────────────────────────────

export function validateVibe(d: PoolDraft): string | null {
  if (d.name.trim().length < 3) return 'Pool name needs at least 3 characters';
  if (d.name.trim().length > 40) return 'Pool name is too long (max 40)';
  if (d.description.length > 200) return 'Description is too long (max 200)';
  return null;
}

export function validateSchedule(d: PoolDraft): string | null {
  if (d.durationDays < 7 || d.durationDays > 365) return 'Duration must be 7–365 days';
  if (d.startOffsetDays < 1 || d.startOffsetDays > 14) return 'Start date must be within 14 days';
  return null;
}

export function validateStakes(d: PoolDraft): string | null {
  if (d.buyIn < 99 || d.buyIn > 5000) return 'Buy-in must be ₹99–₹5,000';
  if (d.fine < 25 || d.fine > 500) return 'Fine must be ₹25–₹500';
  if (d.fine > d.buyIn) return 'Fine cannot exceed the buy-in';
  if (d.graceTokens < 0 || d.graceTokens > 3) return 'Grace tokens must be 0–3';
  return null;
}

// ── Mapping to the DB insert ─────────────────────────────────────────────────

export interface PoolInsert {
  name: string;
  description: string | null;
  emoji: string;
  creator_id: string;
  challenge_type: ChallengeType;
  start_date: string;
  end_date: string;
  check_in_deadline_utc: number;
  check_in_window_start: number | null;
  buy_in_amount: number;
  fine_amount: number;
  visibility: Visibility;
  elimination_threshold: number | null;
  grace_tokens_per_member: number;
  payout_rule: PayoutRule;
}

/** Start-of-day (IST) for `today + offset`, as a UTC ISO string. */
function startDateISO(offsetDays: number): string {
  const now = new Date();
  // Shift to IST, zero the clock, add the offset, shift back to UTC.
  const istMs = now.getTime() + 5.5 * 3600_000;
  const ist = new Date(istMs);
  ist.setUTCHours(0, 0, 0, 0);
  const startIstMs = ist.getTime() + offsetDays * 86_400_000;
  return new Date(startIstMs - 5.5 * 3600_000).toISOString();
}

export function draftToInsert(d: PoolDraft, creatorId: string): PoolInsert {
  const start = startDateISO(d.startOffsetDays);
  const end = new Date(new Date(start).getTime() + d.durationDays * 86_400_000).toISOString();
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    emoji: d.emoji,
    creator_id: creatorId,
    challenge_type: d.challengeType,
    start_date: start,
    end_date: end,
    check_in_deadline_utc: d.deadlineUtcHour,
    check_in_window_start: d.window === 'morning' ? 0 : null, // 5:30 AM IST ≈ 0 UTC
    buy_in_amount: d.buyIn,
    fine_amount: d.fine,
    visibility: d.visibility,
    elimination_threshold: d.elimination,
    grace_tokens_per_member: d.graceTokens,
    payout_rule: d.payoutRule,
  };
}
