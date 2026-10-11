-- ============================================================================
-- CONQR · Migration 0028 · Pre-debit notice schedule (F6.5)
-- ----------------------------------------------------------------------------
-- The scope calls for a daily job. This runs every 15 minutes instead,
-- deliberately: process_check_ins already issues notices inline the moment
-- it creates fines, so this is the safety net for anything that slipped —
-- a fine created by a manual replay, or one whose inline issuance errored.
-- A daily net would leave such a fine uncollectable for up to a day on top
-- of its mandatory 24h wait. Every 15 minutes costs nothing when there is
-- nothing to do.
-- ============================================================================

do $$ begin perform cron.unschedule('conqr-pre-debit-notices'); exception when others then null; end $$;

select cron.schedule(
  'conqr-pre-debit-notices',
  '*/15 * * * *',
  $$select public.issue_pre_debit_notices()$$
);
