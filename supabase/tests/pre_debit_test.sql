-- ============================================================================
-- CONQR PRE-DEBIT NOTICES — COMPLIANCE TESTS (F5.7 / F6.5)
-- These assertions are the difference between a legal auto-debit and an
-- illegal one. All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('c3000000-0000-4000-a000-000000000001'::uuid,'919100000001'),
             ('c3000000-0000-4000-a000-000000000002'::uuid,'919100000002')) as u(id,phone);

insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('c3007001-0000-4000-a000-00000000700a','Notice Pool','📜','c3000000-0000-4000-a000-000000000001',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','PDN001','Asia/Kolkata');
insert into public.pool_members (user_id,pool_id,status,grace_tokens) values
 ('c3000000-0000-4000-a000-000000000001','c3007001-0000-4000-a000-00000000700a','active',0),
 ('c3000000-0000-4000-a000-000000000002','c3007001-0000-4000-a000-00000000700a','active',0);

-- Settle buy-ins so mandates exist and fines are debitable in principle.
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 500,'deposit','pending',
       pm.pool_id::text||':'||pm.user_id::text||':deposit','simulator'
from public.pool_members pm where pm.pool_id='c3007001-0000-4000-a000-00000000700a';
update public.transactions set status='succeeded'
 where pool_id='c3007001-0000-4000-a000-00000000700a' and transaction_type='deposit';

\echo '=== TEST 1: a live provider CANNOT be configured without the gate ==='
do $$
begin
  begin
    update public.payment_config set is_live = true where provider='simulator';
    raise exception 'FAIL: a live provider was allowed with notices disabled';
  exception when sqlstate '23514' then
    raise notice 'PASS: going live without requires_pre_debit_notice is refused';
  end;
end $$;

\echo '=== TEST 2: the 24h minimum cannot be tuned below the law ==='
do $$
begin
  begin
    update public.payment_config set pre_debit_lead_hours = 2 where provider='simulator';
    raise exception 'FAIL: lead time was allowed below 24h';
  exception when check_violation then
    raise notice 'PASS: a lead time under 24h is refused by the constraint';
  end;
end $$;

\echo '=== TEST 3: a fine gets a notice stating amount and date ==='
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('c3000000-0000-4000-a000-000000000001','c3007001-0000-4000-a000-00000000700a',99,'fine','pending',
        'c3007001:c3000001:2026-10-12:fine','simulator');
do $$
declare r jsonb; v_after timestamptz; v_body text; v_title text; v_gap interval;
begin
  r := public.issue_pre_debit_notices();
  if (r->>'issued')::int = 1 then raise notice 'PASS: 1 notice issued'; else raise exception 'FAIL: %', r; end if;

  select n.debit_after into v_after from public.pre_debit_notices n
    join public.transactions t on t.id = n.transaction_id
   where t.idempotency_key='c3007001:c3000001:2026-10-12:fine';
  v_gap := v_after - now();
  if v_gap between interval '23 hours 50 minutes' and interval '24 hours 10 minutes'
    then raise notice 'PASS: debit_after is 24h out';
    else raise exception 'FAIL: gap is %', v_gap; end if;

  select title, body into v_title, v_body from public.notifications
   where dedup_key like 'pre_debit:%';
  if v_title like '%₹99%' and v_body like '%Notice Pool%' and v_body ~ 'collected on \d{2} \w{3}'
    then raise notice 'PASS: the notice states the amount, the pool and the date';
    else raise exception 'FAIL: title="%" body="%"', v_title, v_body; end if;
end $$;

\echo '=== TEST 4: notices do not duplicate ==='
do $$
declare r jsonb; n1 integer; n2 integer;
begin
  select count(*) into n1 from public.pre_debit_notices;
  r := public.issue_pre_debit_notices();
  r := public.issue_pre_debit_notices();
  select count(*) into n2 from public.pre_debit_notices;
  if n1 = n2 and (r->>'issued')::int = 0 then raise notice 'PASS: re-running issues nothing new (% notices)', n2;
  else raise exception 'FAIL: % -> %, last=%', n1, n2, r; end if;

  select count(*) into n2 from public.notifications where dedup_key like 'pre_debit:%';
  if n2 = 1 then raise notice 'PASS: exactly one customer notification, deduped';
  else raise exception 'FAIL: % notifications', n2; end if;
end $$;

\echo '=== TEST 5: WITH THE GATE ON, the fine is NOT debited before 24h ==='
update public.payment_config set requires_pre_debit_notice = true where provider='simulator';
do $$
declare r jsonb; v_status text;
begin
  r := public.charge_pending_fines(10, 'success');
  select status::text into v_status from public.transactions
   where idempotency_key='c3007001:c3000001:2026-10-12:fine';
  if v_status = 'pending' and (r->>'skipped')::int >= 1
    then raise notice 'PASS: debit refused while the 24h notice period is running';
    else raise exception 'FAIL: status=% r=%', v_status, r; end if;
end $$;

\echo '=== TEST 6: once the notice period elapses, it collects ==='
do $$
declare r jsonb; v_status text;
begin
  update public.pre_debit_notices set debit_after = now() - interval '1 minute';
  r := public.charge_pending_fines(10, 'success');
  select status::text into v_status from public.transactions
   where idempotency_key='c3007001:c3000001:2026-10-12:fine';
  if v_status = 'succeeded' then raise notice 'PASS: after 24h the debit goes through';
  else raise exception 'FAIL: status=% r=%', v_status, r; end if;
end $$;

\echo '=== TEST 7: the verdict issues notices inline, so the clock starts at once ==='
do $$
declare r jsonb; n integer; v_lag interval;
begin
  delete from public.check_ins where pool_id='c3007001-0000-4000-a000-00000000700a';
  r := public.process_check_ins((now() at time zone 'Asia/Kolkata')::date,
                                'c3007001-0000-4000-a000-00000000700a');
  if (r->>'fines_issued')::int >= 1 then raise notice 'PASS: the verdict created % fine(s)', r->>'fines_issued';
  else raise exception 'FAIL: no fines, r=%', r; end if;

  select count(*) into n from public.pre_debit_notices n2
   join public.transactions t on t.id = n2.transaction_id
   where t.pool_id='c3007001-0000-4000-a000-00000000700a' and t.status='pending';
  if n >= 1 then raise notice 'PASS: notices issued in the SAME run, not a sweep later';
  else raise exception 'FAIL: no notice issued inline'; end if;

  select min(n2.notified_at) - min(t.created_at) into v_lag
    from public.pre_debit_notices n2
    join public.transactions t on t.id = n2.transaction_id
   where t.status = 'pending';
  if v_lag < interval '5 seconds' then raise notice 'PASS: notice lands within seconds of the fine';
  else raise exception 'FAIL: lag %', v_lag; end if;
end $$;

\echo '=== TEST 8: nothing is collectable the night it is incurred ==='
do $$
declare r jsonb; n integer;
begin
  r := public.charge_pending_fines(50, 'success');
  select count(*) into n from public.transactions t
   where t.pool_id='c3007001-0000-4000-a000-00000000700a'
     and t.transaction_type='fine' and t.status='pending';
  if n >= 1 and (r->>'charged')::int = 0
    then raise notice 'PASS: same-night collection is impossible with the gate on — % fine(s) wait', n;
    else raise exception 'FAIL: charged=% pending=%', r->>'charged', n; end if;
end $$;

\echo '=== TEST 9: a retry reuses the original notice, no fresh 24h wait ==='
do $$
declare v_txn uuid; v_before integer; v_after integer; v_status text;
begin
  select t.id into v_txn from public.transactions t
   where t.pool_id='c3007001-0000-4000-a000-00000000700a'
     and t.transaction_type='fine' and t.status='pending' limit 1;
  update public.pre_debit_notices set debit_after = now() - interval '1 minute'
   where transaction_id = v_txn;

  select count(*) into v_before from public.pre_debit_notices where transaction_id = v_txn;
  perform public.charge_pending_fines(50, 'fail');       -- now retry_scheduled
  perform public.issue_pre_debit_notices();               -- must NOT add another
  select count(*) into v_after from public.pre_debit_notices where transaction_id = v_txn;

  if v_before = v_after and v_after = 1
    then raise notice 'PASS: a retry reuses its original notice (no second 24h wait)';
    else raise exception 'FAIL: notices % -> %', v_before, v_after; end if;

  update public.transactions set next_retry_at = now() - interval '1 minute' where id = v_txn;
  perform public.charge_pending_fines(50, 'success');
  select status::text into v_status from public.transactions where id = v_txn;
  if v_status = 'succeeded' then raise notice 'PASS: the retry collects immediately when due';
  else raise exception 'FAIL: retry status=%', v_status; end if;
end $$;

\echo '=== TEST 10: with the gate OFF, behaviour is unchanged (dev stays fast) ==='
update public.payment_config set requires_pre_debit_notice = false where provider='simulator';
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('c3000000-0000-4000-a000-000000000002','c3007001-0000-4000-a000-00000000700a',99,'fine','pending',
        'c3007001:c3000002:2026-10-20:fine','simulator');
do $$
declare v_status text;
begin
  perform public.charge_pending_fines(10, 'success');
  select status::text into v_status from public.transactions
   where idempotency_key='c3007001:c3000002:2026-10-20:fine';
  if v_status='succeeded' then raise notice 'PASS: gate off → immediate collection, dev loop stays quick';
  else raise exception 'FAIL: status=%', v_status; end if;
end $$;

\echo '=== TEST 11: the notice job is monitored like every other ==='
do $$
declare n integer; v boolean;
begin
  select count(*) into n from public.cron_jobs_expected where job_name='pre-debit-notices';
  if n = 1 then raise notice 'PASS: pre-debit-notices is in the watchdog''s expectations';
  else raise exception 'FAIL: not monitored'; end if;

  select count(*) into n from public.cron_runs where job_name='pre-debit-notices';
  if n >= 1 then raise notice 'PASS: % run(s) logged', n; else raise exception 'FAIL: no runs logged'; end if;

  select has_function_privilege('authenticated','public.issue_pre_debit_notices(integer)','execute') into v;
  if not v then raise notice 'PASS: clients cannot issue their own notices';
  else raise exception 'FAIL: client-callable'; end if;
end $$;

rollback;
\echo 'PRE-DEBIT TESTS COMPLETE — rolled back'
