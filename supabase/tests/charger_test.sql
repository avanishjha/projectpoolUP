-- ============================================================================
-- CONQR FINE CHARGER — ADVERSARIAL TESTS (F5.4 / F5.5 / F6.2)
-- This function moves money out of people's accounts. Everything below is a
-- real failure mode. All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

-- ── Fixture: an active paid pool, two paid-up members ──────────────────────
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('a1000000-0000-4000-a000-000000000001'::uuid,'919300000001'),
             ('a1000000-0000-4000-a000-000000000002'::uuid,'919300000002')) as u(id,phone);

insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('a1007001-0000-4000-a000-00000000700a','Charger Pool','⚡','a1000000-0000-4000-a000-000000000001',
  'custom', now() - interval '5 days', now() + interval '25 days', 18, 500, 99, 'active','CHG001','Asia/Kolkata');

insert into public.pool_members (user_id,pool_id,status) values
 ('a1000000-0000-4000-a000-000000000001','a1007001-0000-4000-a000-00000000700a','active'),
 ('a1000000-0000-4000-a000-000000000002','a1007001-0000-4000-a000-00000000700a','active');

-- Settle both buy-ins THROUGH the normal path so the mandate trigger fires.
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 500, 'deposit', 'pending',
       pm.pool_id::text||':'||pm.user_id::text||':deposit', 'simulator'
from public.pool_members pm where pm.pool_id='a1007001-0000-4000-a000-00000000700a';
update public.transactions set status='succeeded'
  where pool_id='a1007001-0000-4000-a000-00000000700a' and transaction_type='deposit';

\echo '=== TEST 1: a settled buy-in registers a mandate to debit against ==='
do $$
declare n integer;
begin
  select count(*) into n from public.payment_mandates
    where pool_id='a1007001-0000-4000-a000-00000000700a' and status='active';
  if n = 2 then raise notice 'PASS: 2 active mandates created on buy-in settlement';
  else raise exception 'FAIL: % mandates', n; end if;
end $$;

-- Queue a fine for each member, the way process_pool_day does.
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 99, 'fine', 'pending',
       pm.pool_id::text||':'||pm.user_id::text||':2026-10-10:fine', 'simulator'
from public.pool_members pm where pm.pool_id='a1007001-0000-4000-a000-00000000700a';

\echo '=== TEST 2: the charger collects, and the pot follows ==='
do $$
declare r jsonb; v_pot numeric; v_sum numeric;
begin
  r := public.charge_pending_fines(100, 'success');
  if (r->>'charged')::int = 2 and (r->>'collected')::numeric = 198 then
    raise notice 'PASS: 2 fines charged, ₹198 collected';
  else raise exception 'FAIL: %', r; end if;

  select total_pot into v_pot from public.pools where id='a1007001-0000-4000-a000-00000000700a';
  select coalesce(sum(amount),0) into v_sum from public.transactions
    where pool_id='a1007001-0000-4000-a000-00000000700a' and status='succeeded'
      and transaction_type in ('deposit','fine');
  if v_pot = v_sum and v_pot = 1198 then raise notice 'PASS: pot recalculated to ₹1198 (= SUM)';
  else raise exception 'FAIL: pot=% sum=%', v_pot, v_sum; end if;
end $$;

\echo '=== TEST 3: fines_paid is now actually maintained (was always 0) ==='
do $$
declare v numeric;
begin
  select fines_paid into v from public.pool_members
    where pool_id='a1007001-0000-4000-a000-00000000700a'
      and user_id='a1000000-0000-4000-a000-000000000001';
  if v = 99 then raise notice 'PASS: member fines_paid = ₹99, so the leaderboard tiebreak works';
  else raise exception 'FAIL: fines_paid=%', v; end if;
end $$;

\echo '=== TEST 4: RE-RUN must not charge a settled fine twice ==='
do $$
declare r jsonb; v_pot numeric; n integer;
begin
  r := public.charge_pending_fines(100, 'success');
  if (r->>'charged')::int = 0 then raise notice 'PASS: second run found nothing to charge';
  else raise exception 'FAIL: re-charged %', r; end if;

  select total_pot into v_pot from public.pools where id='a1007001-0000-4000-a000-00000000700a';
  if v_pot = 1198 then raise notice 'PASS: pot unchanged at ₹1198 after a re-run';
  else raise exception 'FAIL: pot moved to %', v_pot; end if;

  select count(*) into n from public.transactions
    where pool_id='a1007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  if n = 2 then raise notice 'PASS: still exactly 2 fine rows';
  else raise exception 'FAIL: % fine rows', n; end if;
end $$;

\echo '=== TEST 5: failures walk the 6h/24h/72h ladder, then go terminal ==='
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('a1000000-0000-4000-a000-000000000002','a1007001-0000-4000-a000-00000000700a',99,'fine','pending',
        'a1007001:a1000002:2026-10-11:fine','simulator');
do $$
declare r jsonb; v_status text; v_retry integer; v_gap interval;
begin
  perform public.charge_pending_fines(10, 'fail');
  select status::text, retry_count, next_retry_at - now() into v_status, v_retry, v_gap
    from public.transactions where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  if v_status='retry_scheduled' and v_retry=1 and v_gap between interval '5 hours' and interval '7 hours'
    then raise notice 'PASS: 1st failure → retry_scheduled, +6h';
    else raise exception 'FAIL 1st: % % %', v_status, v_retry, v_gap; end if;

  -- Not yet due: the charger must leave it alone.
  r := public.charge_pending_fines(10, 'success');
  if (r->>'charged')::int = 0 then raise notice 'PASS: a retry that is not due yet is skipped';
  else raise exception 'FAIL: charged early: %', r; end if;

  -- Make it due, then walk the rest of the ladder.
  update public.transactions set next_retry_at = now() - interval '1 minute'
    where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  perform public.charge_pending_fines(10, 'fail');
  update public.transactions set next_retry_at = now() - interval '1 minute'
    where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  perform public.charge_pending_fines(10, 'fail');
  update public.transactions set next_retry_at = now() - interval '1 minute'
    where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  perform public.charge_pending_fines(10, 'fail');

  select status::text, retry_count into v_status, v_retry
    from public.transactions where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  if v_status='failed' and v_retry=3 then raise notice 'PASS: retries exhausted → terminal failed, capped at 3';
  else raise exception 'FAIL terminal: % %', v_status, v_retry; end if;
end $$;

\echo '=== TEST 6: exhausted retries make the member DELINQUENT (was dead code) ==='
do $$
declare v_status text; v_del boolean; r jsonb;
begin
  select status::text into v_status from public.pool_members
    where pool_id='a1007001-0000-4000-a000-00000000700a'
      and user_id='a1000000-0000-4000-a000-000000000002';
  if v_status='delinquent' then raise notice 'PASS: member marked delinquent';
  else raise exception 'FAIL: member status=%', v_status; end if;

  select authz.is_delinquent('a1000000-0000-4000-a000-000000000002') into v_del;
  if v_del then raise notice 'PASS: authz.is_delinquent() now actually fires';
  else raise exception 'FAIL: is_delinquent still false'; end if;
end $$;

\echo '=== TEST 7: a delinquent member cannot check in ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$
declare r jsonb;
begin
  r := public.submit_check_in('a1007001-0000-4000-a000-00000000700a','x/y.jpg');
  if r->>'error' = 'membership_delinquent' then raise notice 'PASS: delinquent member blocked from checking in';
  else raise exception 'FAIL: %', r; end if;
end $$;
reset role;

\echo '=== TEST 8: paying the debt restores the member ==='
do $$
declare v_status text;
begin
  update public.transactions set status='succeeded', settled_at=now()
    where idempotency_key='a1007001:a1000002:2026-10-11:fine';
  select status::text into v_status from public.pool_members
    where pool_id='a1007001-0000-4000-a000-00000000700a'
      and user_id='a1000000-0000-4000-a000-000000000002';
  if v_status='active' then raise notice 'PASS: debt cleared → member active again';
  else raise exception 'FAIL: still %', v_status; end if;
end $$;

\echo '=== TEST 9: no mandate means manual pay, not an infinite retry loop ==='
insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('a1007002-0000-4000-a000-00000000700b','No Mandate','🚫','a1000000-0000-4000-a000-000000000001',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','CHG002','Asia/Kolkata');
insert into public.pool_members (user_id,pool_id,status)
values ('a1000000-0000-4000-a000-000000000001','a1007002-0000-4000-a000-00000000700b','active');
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('a1000000-0000-4000-a000-000000000001','a1007002-0000-4000-a000-00000000700b',99,'fine','pending',
        'a1007002:a1000001:2026-10-11:fine','simulator');
do $$
declare r jsonb; v_status text; v_reason text; v_retry integer;
begin
  r := public.charge_pending_fines(10, 'success');
  select status::text, failure_reason, retry_count into v_status, v_reason, v_retry
    from public.transactions where idempotency_key='a1007002:a1000001:2026-10-11:fine';
  if v_status='failed' and v_reason='no_mandate' and v_retry=0 then
    raise notice 'PASS: no mandate → failed immediately with no retries burned';
  else raise exception 'FAIL: % % %', v_status, v_reason, v_retry; end if;
end $$;

\echo '=== TEST 10: a fine larger than the mandate is refused, not forced ==='
update public.payment_mandates set max_amount = 50
  where pool_id='a1007001-0000-4000-a000-00000000700a'
    and user_id='a1000000-0000-4000-a000-000000000001';
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('a1000000-0000-4000-a000-000000000001','a1007001-0000-4000-a000-00000000700a',99,'fine','pending',
        'a1007001:a1000001:2026-10-12:fine','simulator');
do $$
declare v_status text; v_reason text;
begin
  perform public.charge_pending_fines(10, 'success');
  select status::text, failure_reason into v_status, v_reason
    from public.transactions where idempotency_key='a1007001:a1000001:2026-10-12:fine';
  if v_status='failed' and v_reason='exceeds_mandate' then
    raise notice 'PASS: a debit above the mandate cap is refused';
  else raise exception 'FAIL: % %', v_status, v_reason; end if;
end $$;

\echo '=== TEST 11: the RBI pre-debit gate blocks an unnoticed debit ==='
update public.payment_config set requires_pre_debit_notice = true where provider='simulator';
update public.payment_mandates set max_amount = 1000
  where pool_id='a1007001-0000-4000-a000-00000000700a';
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('a1000000-0000-4000-a000-000000000001','a1007001-0000-4000-a000-00000000700a',99,'fine','pending',
        'a1007001:a1000001:2026-10-13:fine','simulator');
do $$
declare r jsonb; v_status text; v_txn uuid;
begin
  r := public.charge_pending_fines(10, 'success');
  select status::text, id into v_status, v_txn
    from public.transactions where idempotency_key='a1007001:a1000001:2026-10-13:fine';
  if v_status='pending' and (r->>'skipped')::int >= 1 then
    raise notice 'PASS: no pre-debit notice → skipped, left pending, NOT charged';
  else raise exception 'FAIL: status=% r=%', v_status, r; end if;

  -- With a notice on file it goes through.
  insert into public.pre_debit_notices (transaction_id, user_id, amount, debit_after)
  values (v_txn, 'a1000000-0000-4000-a000-000000000001', 99, now() - interval '1 minute');
  perform public.charge_pending_fines(10, 'success');
  select status::text into v_status from public.transactions where id = v_txn;
  if v_status='succeeded' then raise notice 'PASS: with a notice on file, the debit proceeds';
  else raise exception 'FAIL after notice: %', v_status; end if;
end $$;
update public.payment_config set requires_pre_debit_notice = false where provider='simulator';

\echo '=== TEST 12: clients cannot reach the charger ==='
do $$
declare v boolean;
begin
  select has_function_privilege('authenticated','public.charge_pending_fines(integer,text)','execute') into v;
  if not v then raise notice 'PASS: charge_pending_fines not executable by authenticated';
  else raise exception 'FAIL: clients can charge fines'; end if;
  select has_function_privilege('authenticated','public.process_retries(text)','execute') into v;
  if not v then raise notice 'PASS: process_retries not executable by authenticated';
  else raise exception 'FAIL: clients can run retries'; end if;
end $$;

\echo '=== TEST 13: every run is logged ==='
do $$
declare n integer;
begin
  select count(*) into n from public.cron_runs where job_name='charge-fines';
  if n >= 5 then raise notice 'PASS: % charge-fines runs logged', n;
  else raise exception 'FAIL: only % runs logged', n; end if;
end $$;

rollback;
\echo 'CHARGER TESTS COMPLETE — rolled back'
