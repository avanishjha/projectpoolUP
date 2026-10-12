-- ============================================================================
-- CONQR · Migration 0031 · Notification schedules (F6.3 / F8.1)
-- ----------------------------------------------------------------------------
--   send-reminders          hourly on the half hour, so the T-3h and T-1h
--                           windows are sampled close to their centre for a
--                           23:30 deadline (20:30 and 22:30 IST).
--   dispatch-notifications  every 2 minutes. A notification about money that
--                           arrives ten minutes late has lost most of its
--                           point, and an empty run costs nothing.
-- ============================================================================

do $$ begin perform cron.unschedule('conqr-send-reminders'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('conqr-dispatch-notifications'); exception when others then null; end $$;

select cron.schedule('conqr-send-reminders', '30 * * * *',
  $$select public.send_due_reminders()$$);

select cron.schedule('conqr-dispatch-notifications', '*/2 * * * *',
  $$select public.dispatch_notifications()$$);
