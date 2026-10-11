-- ============================================================================
-- CONQR · Migration 0026 · Lock table grants on the money and ops tables
-- ----------------------------------------------------------------------------
-- Found by the F6.7 test suite: every table added since 0018 carried
-- INSERT/UPDATE/DELETE grants for `authenticated`, and payment_config also
-- carried SELECT. They inherited Supabase's default privileges on new tables
-- in `public`; the tables from 0004 were explicitly locked down and these
-- were not.
--
-- NOT a live leak — RLS is enabled on all of them and none has a write
-- policy, so both a forged insert and a read of the webhook secret are
-- refused today (verified before writing this). But the project's security
-- model is deliberately two-axis — RLS decides WHICH ROWS, grants decide
-- WHETHER AT ALL — and relying on one axis alone means a single careless
-- permissive policy later becomes a breach instead of a bug.
--
-- payment_config is the one that matters most: it holds the webhook secret,
-- and that secret is what lets anyone forge a `payment.captured` event and
-- mark their own transaction succeeded.
-- ============================================================================

-- Service role only, no exceptions: these are written by the engine.
revoke all on public.payment_config      from anon, authenticated;
revoke all on public.payment_events      from anon, authenticated;
revoke all on public.cron_jobs_expected  from anon, authenticated;
revoke all on public.cron_alerts         from anon, authenticated;
revoke all on public.pre_debit_notices   from anon, authenticated;
revoke all on public.payment_customers   from anon, authenticated;
revoke all on public.payment_mandates    from anon, authenticated;

-- Read-only where a user or an ops dashboard legitimately needs visibility.
-- RLS still decides which rows each caller sees.
grant select on public.payment_customers  to authenticated;
grant select on public.payment_mandates   to authenticated;
grant select on public.pre_debit_notices  to authenticated;
grant select on public.cron_jobs_expected to authenticated;
grant select on public.cron_alerts        to authenticated;

-- payment_config and payment_events stay entirely invisible: one holds the
-- signing secret, the other holds raw provider payloads.

comment on table public.payment_config is
  'Webhook signing secrets. Service role ONLY — never granted to anon or authenticated, on either axis.';

-- Stop the next table inheriting the same thing.
alter default privileges in schema public revoke all on tables from anon, authenticated;
