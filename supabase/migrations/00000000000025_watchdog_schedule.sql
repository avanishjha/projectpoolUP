-- ============================================================================
-- CONQR · Migration 0025 · Watchdog schedule (F6.7)
-- ----------------------------------------------------------------------------
-- The watchdog runs every 5 minutes, which is tighter than any grace window
-- so an overdue job is caught on the first sweep after it lapses.
--
-- charge-fines is re-pointed at the heartbeat wrapper. The wrapper only adds
-- the outbound ping; the charger itself is untouched and still callable
-- directly for tests and manual replay.
-- ============================================================================

do $$ begin perform cron.unschedule('conqr-cron-watchdog'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('conqr-charge-fines'); exception when others then null; end $$;

select cron.schedule(
  'conqr-cron-watchdog',
  '*/5 * * * *',
  $$select public.cron_watchdog()$$
);

select cron.schedule(
  'conqr-charge-fines',
  '*/10 * * * *',
  $$select public.charge_fines_with_heartbeat()$$
);
