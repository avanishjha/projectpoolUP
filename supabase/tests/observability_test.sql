-- ============================================================================
-- CONQR CRON OBSERVABILITY — TESTS (F6.7)
-- The thing being tested is the detection of ABSENCE, which is the hardest
-- kind of failure to notice and the one that costs real money here.
-- All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

-- Start from a clean slate so the assertions are about what we do here.
delete from public.cron_alerts;
delete from public.cron_runs;

\echo '=== TEST 1: a job that has NEVER run is caught ==='
do $$
declare r jsonb; n integer; d text;
begin
  r := public.cron_watchdog();
  select count(*) into n from public.cron_alerts
    where kind = 'overdue' and cleared_at is null;
  if n >= 4 then raise notice 'PASS: % jobs flagged overdue with no runs on record', n;
  else raise exception 'FAIL: only % overdue alerts', n; end if;

  select detail into d from public.cron_alerts
    where job_name = 'process-checkins' and kind = 'overdue';
  if d = 'has never run' then raise notice 'PASS: the alert says WHY ("%")', d;
  else raise exception 'FAIL detail: %', d; end if;
end $$;

\echo '=== TEST 2: alerts do not duplicate while the condition persists ==='
do $$
declare n1 integer; n2 integer;
begin
  select count(*) into n1 from public.cron_alerts;
  perform public.cron_watchdog();
  perform public.cron_watchdog();
  select count(*) into n2 from public.cron_alerts;
  if n1 = n2 then raise notice 'PASS: three sweeps, still % alerts (one per job, not twelve)', n2;
  else raise exception 'FAIL: alerts grew % -> %', n1, n2; end if;
end $$;

\echo '=== TEST 3: a healthy run clears the alert ==='
do $$
declare v_open integer;
begin
  insert into public.cron_runs (job_name, status, started_at, finished_at)
  values ('process-checkins', 'succeeded', now(), now());

  perform public.cron_watchdog();

  select count(*) into v_open from public.cron_alerts
    where job_name = 'process-checkins' and kind = 'overdue' and cleared_at is null;
  if v_open = 0 then raise notice 'PASS: overdue alert cleared once the job ran';
  else raise exception 'FAIL: still % open', v_open; end if;

  if exists (select 1 from public.cron_alerts
              where job_name='process-checkins' and kind='overdue' and cleared_at is not null)
    then raise notice 'PASS: the cleared alert is retained as history, not deleted';
    else raise exception 'FAIL: alert history lost'; end if;
end $$;

\echo '=== TEST 4: THE REAL ONE — a job that STOPS is detected ==='
do $$
declare v_open integer; d text;
begin
  -- It ran fine until 40 minutes ago, then stopped. process-checkins is
  -- expected every minute with 10 minutes of grace.
  update public.cron_runs
     set started_at = now() - interval '40 minutes',
         finished_at = now() - interval '40 minutes'
   where job_name = 'process-checkins';

  perform public.cron_watchdog();

  select count(*) into v_open from public.cron_alerts
    where job_name='process-checkins' and kind='overdue' and cleared_at is null;
  if v_open = 1 then raise notice 'PASS: a job that silently stopped is flagged overdue';
  else raise exception 'FAIL: % open alerts', v_open; end if;

  select detail into d from public.cron_alerts
    where job_name='process-checkins' and kind='overdue' and cleared_at is null;
  if d like '%40 min ago%' then raise notice 'PASS: the alert reports how long the silence is ("%")', d;
  else raise exception 'FAIL detail: %', d; end if;
end $$;

\echo '=== TEST 5: grace is respected — a job inside its window is fine ==='
do $$
declare v_open integer;
begin
  -- process-retries runs every 360 min with 90 min grace: 200 min is fine.
  insert into public.cron_runs (job_name, status, started_at, finished_at)
  values ('process-retries', 'succeeded', now() - interval '200 minutes', now() - interval '200 minutes');

  perform public.cron_watchdog();

  select count(*) into v_open from public.cron_alerts
    where job_name='process-retries' and kind='overdue' and cleared_at is null;
  if v_open = 0 then raise notice 'PASS: a job well inside its grace window is not flagged';
  else raise exception 'FAIL: flagged early'; end if;
end $$;

\echo '=== TEST 6: three consecutive failures raise a separate alarm ==='
do $$
declare v_open integer;
begin
  delete from public.cron_runs where job_name = 'charge-fines';
  insert into public.cron_runs (job_name, status, started_at, finished_at) values
    ('charge-fines','failed', now() - interval '3 minutes', now() - interval '3 minutes'),
    ('charge-fines','failed', now() - interval '2 minutes', now() - interval '2 minutes'),
    ('charge-fines','failed', now() - interval '1 minutes', now() - interval '1 minutes');

  perform public.cron_watchdog();

  select count(*) into v_open from public.cron_alerts
    where job_name='charge-fines' and kind='failing' and cleared_at is null;
  if v_open = 1 then raise notice 'PASS: 3 consecutive failures raise a "failing" alert';
  else raise exception 'FAIL: % failing alerts', v_open; end if;

  -- And a success clears it.
  insert into public.cron_runs (job_name, status, started_at, finished_at)
  values ('charge-fines','succeeded', now(), now());
  perform public.cron_watchdog();
  select count(*) into v_open from public.cron_alerts
    where job_name='charge-fines' and kind='failing' and cleared_at is null;
  if v_open = 0 then raise notice 'PASS: a successful run clears the failing alert';
  else raise exception 'FAIL: still failing'; end if;
end $$;

\echo '=== TEST 7: the subtle one — green runs while work piles up ==='
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000','b2000000-0000-4000-a000-000000000001','authenticated','authenticated',
  '919200000001', now(),'','','','','','','','','','{"provider":"phone","providers":["phone"]}','{}', now(), now());
insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('b2007001-0000-4000-a000-00000000700a','Stuck','🧱','b2000000-0000-4000-a000-000000000001','custom',
  now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','OBS001','Asia/Kolkata');
insert into public.pool_members (user_id,pool_id,status)
values ('b2000000-0000-4000-a000-000000000001','b2007001-0000-4000-a000-00000000700a','active');

do $$
declare v_open integer; d text;
begin
  -- A fine that has been sitting pending for an hour while the charger
  -- reports success every ten minutes. cron_runs looks perfectly healthy.
  insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider,created_at)
  values ('b2000000-0000-4000-a000-000000000001','b2007001-0000-4000-a000-00000000700a',99,'fine','pending',
          'b2007001:stuck:fine','simulator', now() - interval '60 minutes');

  perform public.cron_watchdog();

  select count(*) into v_open from public.cron_alerts
    where kind='no_progress' and cleared_at is null;
  if v_open = 1 then raise notice 'PASS: a green job with work piling up behind it is still flagged';
  else raise exception 'FAIL: % no_progress alerts', v_open; end if;

  select detail into d from public.cron_alerts where kind='no_progress' and cleared_at is null;
  raise notice 'PASS: detail reads "%"', d;

  -- Collecting it clears the alert.
  update public.transactions set status='succeeded'
    where idempotency_key='b2007001:stuck:fine';
  perform public.cron_watchdog();
  select count(*) into v_open from public.cron_alerts
    where kind='no_progress' and cleared_at is null;
  if v_open = 0 then raise notice 'PASS: draining the queue clears it';
  else raise exception 'FAIL: still open'; end if;
end $$;

\echo '=== TEST 8: cron_health answers "is the engine alive?" in one query ==='
do $$
declare r record; n integer;
begin
  -- Derived, not hardcoded: adding a monitored job should not break this.
  select count(*) into n from public.cron_health;
  if n = (select count(*) from public.cron_jobs_expected where enabled)
    then raise notice 'PASS: cron_health has a row per enabled monitored job (%)', n;
    else raise exception 'FAIL: % health rows vs % expected jobs', n,
      (select count(*) from public.cron_jobs_expected where enabled); end if;

  select * into r from public.cron_health where job_name='process-checkins';
  if r.is_overdue then raise notice 'PASS: is_overdue exposes the silence cron_runs alone cannot show';
  else raise exception 'FAIL: not flagged overdue'; end if;

  if not r.heartbeat_configured then
    raise notice 'PASS: heartbeat_configured is false until a URL is set (correct for dev)';
  else raise exception 'FAIL: claims a heartbeat with no URL'; end if;
end $$;

\echo '=== TEST 9: an unconfigured heartbeat is a silent no-op ==='
do $$
begin
  -- No URL on any job here, so this must do nothing and raise nothing.
  perform public.cron_heartbeat('process-checkins', true);
  perform public.cron_heartbeat('process-checkins', false);
  perform public.cron_heartbeat('does-not-exist', true);
  raise notice 'PASS: heartbeats with no URL configured are harmless no-ops';
end $$;

\echo '=== TEST 10: monitoring is ops-only and never client-writable ==='
do $$
declare v boolean;
begin
  select has_function_privilege('authenticated','public.cron_watchdog()','execute') into v;
  if not v then raise notice 'PASS: cron_watchdog not executable by authenticated';
  else raise exception 'FAIL: clients can run the watchdog'; end if;

  select has_function_privilege('authenticated','public.cron_heartbeat(text,boolean)','execute') into v;
  if not v then raise notice 'PASS: cron_heartbeat not executable by authenticated';
  else raise exception 'FAIL: clients can forge heartbeats'; end if;

  select has_table_privilege('authenticated','public.cron_alerts','insert') into v;
  if not v then raise notice 'PASS: clients cannot write alerts';
  else raise exception 'FAIL: clients can insert alerts'; end if;
end $$;

rollback;
\echo 'OBSERVABILITY TESTS COMPLETE — rolled back'
