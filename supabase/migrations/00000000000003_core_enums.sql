-- ============================================================================
-- CONQR · Migration 0003 · Core enums
-- ----------------------------------------------------------------------------
-- Every closed vocabulary in the product, from LLD §1.1 plus the supporting
-- enums the LLD delegates to the Extended Spec (notifications, reports,
-- disputes, subscriptions, badges, power-up lifecycle, cron runs).
-- Enums are cheap to extend (ALTER TYPE ... ADD VALUE) but impossible to
-- shrink — anything likely to churn (notification types) stays TEXT + CHECK.
-- ============================================================================

-- ── Pool domain (LLD §1.1) ──────────────────────────────────────────────────
create type public.pool_status as enum ('pending', 'active', 'completed', 'cancelled');
create type public.member_status as enum ('pending', 'active', 'eliminated', 'completed', 'delinquent');
create type public.check_in_type as enum ('photo', 'video', 'health_sync', 'strava');
create type public.visibility as enum ('private', 'friends', 'public');
create type public.payout_rule as enum ('winner_takes_all', 'top_3_split', 'proportional');
create type public.challenge_type as enum (
  '75_hard', 'gym_streak', 'run', 'surya_namaskar', 'no_sugar',
  'steps', 'meditation', 'cold_plunge', 'custom'
);

-- ── Money domain (LLD §1.1) ─────────────────────────────────────────────────
create type public.txn_type as enum (
  'deposit', 'fine', 'payout', 'refund', 'power_up', 'subscription', 'platform_fee'
);
create type public.txn_status as enum (
  'pending', 'succeeded', 'failed', 'retry_scheduled', 'written_off'
);

-- ── Feed & social (LLD §1.1) ────────────────────────────────────────────────
create type public.event_type as enum (
  'missed_day', 'fine_issued', 'pool_started', 'pool_completed',
  'streak_milestone', 'member_eliminated', 'shield_used', 'grace_used'
);
create type public.reaction_type as enum ('fire', 'flex', 'crown', 'skull', 'respect');

-- ── Gamification ────────────────────────────────────────────────────────────
create type public.power_up_type as enum (
  'shield', 'double_down', 'spotlight', 'alarm_bomb', 'streak_freeze', 'ghost_mode'
);
create type public.power_up_status as enum ('available', 'active', 'consumed', 'expired');
create type public.badge_rarity as enum (
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'seasonal'
);

-- ── Trust & safety ──────────────────────────────────────────────────────────
create type public.report_reason as enum (
  'not_real_photo', 'reused_photo', 'wrong_person', 'harassment', 'spam', 'other'
);
create type public.report_status as enum ('open', 'cleared', 'upheld');
create type public.dispute_status as enum ('open', 'accepted', 'rejected');

-- ── Notifications ───────────────────────────────────────────────────────────
create type public.notification_channel as enum ('push', 'whatsapp', 'in_app');
create type public.notification_status as enum ('queued', 'sent', 'failed');

-- ── Subscriptions (CONQR Pro) ───────────────────────────────────────────────
create type public.pro_plan as enum ('monthly', 'yearly');
create type public.subscription_status as enum ('created', 'active', 'halted', 'cancelled', 'expired');

-- ── Operations ──────────────────────────────────────────────────────────────
create type public.cron_run_status as enum ('running', 'succeeded', 'failed');
