-- ============================================================================
-- CONQR · Migration 0023 · Charger schedules (F5.4 / F6.2)
-- ----------------------------------------------------------------------------
-- Separate from the engine, same as 0016, so the workers stay testable and
-- replayable independently of when they fire.
--
--   charge-fines    every 10 min — picks up fines the 23:30 run queued, so
--                   collection follows the verdict within minutes rather
--                   than waiting a day.
--   process-retries every 6 hours — the shortest rung of the 6h/24h/72h
--                   ladder, so no retry waits materially past its slot.
-- ============================================================================

do $$ begin perform cron.unschedule('conqr-charge-fines'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('conqr-process-retries'); exception when others then null; end $$;

select cron.schedule(
  'conqr-charge-fines',
  '*/10 * * * *',
  $$select public.charge_pending_fines()$$
);

select cron.schedule(
  'conqr-process-retries',
  '7 */6 * * *',
  $$select public.process_retries()$$
);
