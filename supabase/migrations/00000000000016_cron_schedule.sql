-- ============================================================================
-- CONQR · Migration 0016 · CRON schedule (pg_cron)
-- ----------------------------------------------------------------------------
-- Scheduling is separated from the engine so the engine can be tested,
-- replayed, and reasoned about independently of when it fires.
--
-- Cadence (LLD §2.2):
--   process-checkins : every minute. It self-selects pools whose deadline
--                      hour has passed, and the member-day guard makes the
--                      other ~1439 runs cheap no-ops. Frequent + idempotent
--                      beats "once a day and pray" — a missed window heals
--                      on the next tick instead of costing someone a fine.
--   activate-pools   : every 10 minutes (pools start on the hour at worst).
--
-- MONITORING: cron_runs + public.cron_health. An external heartbeat
-- (Cronitor/Healthchecks) must watch this in production — NFR-REL-02 makes
-- silent CRON failure the single most dangerous outcome in the system.
-- ============================================================================

create extension if not exists pg_cron;

-- Idempotent (re)scheduling: unschedule first so re-running is safe.
do $$
begin
  perform cron.unschedule('conqr-process-checkins');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('conqr-activate-pools');
exception when others then null;
end $$;

select cron.schedule(
  'conqr-process-checkins',
  '* * * * *',
  $$select public.process_check_ins()$$
);

select cron.schedule(
  'conqr-activate-pools',
  '*/10 * * * *',
  $$select public.activate_pools()$$
);

-- Keep the run log from growing forever; 90 days is plenty for forensics.
do $$
begin
  perform cron.unschedule('conqr-prune-cron-runs');
exception when others then null;
end $$;

select cron.schedule(
  'conqr-prune-cron-runs',
  '17 3 * * *',
  $$delete from public.cron_runs where started_at < now() - interval '90 days'$$
);
