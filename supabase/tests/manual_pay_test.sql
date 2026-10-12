-- ============================================================================
-- CONQR MANUAL FINE PAYMENT — TESTS (F5.6)
-- The path out of delinquency. All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('d4000000-0000-4000-a000-000000000001'::uuid,'919050000001'),
             ('d4000000-0000-4000-a000-000000000002'::uuid,'919050000002')) as u(id,phone);

insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('d4007001-0000-4000-a000-00000000700a','Debt Pool','💰','d4000000-0000-4000-a000-000000000001',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','DBT001','Asia/Kolkata');
insert into public.pool_members (user_id,pool_id,status,grace_tokens) values
 ('d4000000-0000-4000-a000-000000000001','d4007001-0000-4000-a000-00000000700a','active',0),
 ('d4000000-0000-4000-a000-000000000002','d4007001-0000-4000-a000-00000000700a','active',0);

-- Settle buy-ins so the pool is legitimate.
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 500,'deposit','pending',
       pm.pool_id::text||':'||pm.user_id::text||':deposit','simulator'
from public.pool_members pm where pm.pool_id='d4007001-0000-4000-a000-00000000700a';
update public.transactions set status='succeeded'
 where pool_id='d4007001-0000-4000-a000-00000000700a' and transaction_type='deposit';

-- A fine that went terminal because no mandate could be used.
insert into public.transactions (id,user_id,pool_id,amount,transaction_type,status,idempotency_key,provider,failure_reason)
values ('d4f10001-0000-4000-a000-00000000f001','d4000000-0000-4000-a000-000000000001','d4007001-0000-4000-a000-00000000700a',99,'fine','failed',
        'd4007001:d4000001:2026-10-12:fine','simulator','no_mandate');

\echo '=== TEST 1: a terminal fine makes the member delinquent and stuck ==='
do $$
declare v_status text; r jsonb;
begin
  -- The trigger fires on UPDATE, so nudge the row the way the charger would.
  update public.transactions set updated_at = now()
   where idempotency_key='d4007001:d4000001:2026-10-12:fine';
  perform public.recalc_member_delinquency('d4007001-0000-4000-a000-00000000700a',
                                           'd4000000-0000-4000-a000-000000000001');

  select status::text into v_status from public.pool_members
   where pool_id='d4007001-0000-4000-a000-00000000700a'
     and user_id='d4000000-0000-4000-a000-000000000001';
  if v_status='delinquent' then raise notice 'PASS: member is delinquent';
  else raise exception 'FAIL: status=%', v_status; end if;

  -- And the charger has given up on it, so nothing automatic will ever fix it.
  r := public.charge_pending_fines(10,'success');
  if (r->>'charged')::int = 0 then raise notice 'PASS: the charger will NOT retry a terminal fine — manual is the only way out';
  else raise exception 'FAIL: charger picked it up: %', r; end if;
end $$;

\echo '=== TEST 2: the user can see what they owe and why ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d4000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare n integer; v_amt numeric; v_reason text; v_term boolean; d jsonb;
begin
  select count(*), max(amount), max(failure_reason), bool_or(is_terminal)
    into n, v_amt, v_reason, v_term
    from public.my_outstanding_fines('d4007001-0000-4000-a000-00000000700a');
  if n=1 and v_amt=99 and v_reason='no_mandate' and v_term
    then raise notice 'PASS: one outstanding fine, ₹99, reason "%", flagged terminal', v_reason;
    else raise exception 'FAIL: n=% amt=% reason=% term=%', n, v_amt, v_reason, v_term; end if;

  d := public.my_debt_summary();
  if (d->>'total')::numeric = 99 and (d->>'blocking')::numeric = 99 and (d->>'is_delinquent')::boolean
    then raise notice 'PASS: debt summary says ₹99 owed, ₹99 blocking, delinquent true';
    else raise exception 'FAIL: %', d; end if;
end $$;

\echo '=== TEST 3: you cannot pay someone ELSE''s fine ==='
select set_config('request.jwt.claims','{"sub":"d4000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$
declare v_txn uuid; r jsonb;
begin
  v_txn := 'd4f10001-0000-4000-a000-00000000f001';
  r := public.start_fine_payment(v_txn);
  if r->>'error' = 'not_yours' then raise notice 'PASS: paying another member''s fine is refused';
  else raise exception 'FAIL: %', r; end if;
end $$;

\echo '=== TEST 4: and you cannot see it in your own outstanding list ==='
do $$
declare n integer;
begin
  select count(*) into n from public.my_outstanding_fines();
  if n = 0 then raise notice 'PASS: another member''s debt is invisible to you';
  else raise exception 'FAIL: saw % rows', n; end if;
end $$;

\echo '=== TEST 5: paying it settles, lifts delinquency, unblocks check-in ==='
select set_config('request.jwt.claims','{"sub":"d4000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare v_txn uuid; r jsonb; v_status text; v_member text; v_pot numeric; v_fp numeric;
begin
  v_txn := 'd4f10001-0000-4000-a000-00000000f001';

  r := public.start_fine_payment(v_txn);
  if (r->>'ok')::boolean and (r->>'manual')::boolean and (r->>'amount')::numeric = 99
    then raise notice 'PASS: checkout opened for ₹99';
    else raise exception 'FAIL: %', r; end if;

  r := public.simulate_payment(r->>'order_id','success');
  if r->>'outcome' = 'succeeded' then raise notice 'PASS: manual payment settled through the normal state machine';
  else raise exception 'FAIL: %', r; end if;

  select status::text into v_status from public.transactions where id = v_txn;
  if v_status='succeeded' then raise notice 'PASS: the fine is settled';
  else raise exception 'FAIL: %', v_status; end if;

  select status::text into v_member from public.pool_members
   where pool_id='d4007001-0000-4000-a000-00000000700a'
     and user_id='d4000000-0000-4000-a000-000000000001';
  if v_member='active' then raise notice 'PASS: delinquency lifted automatically — member active again';
  else raise exception 'FAIL: member still %', v_member; end if;

  select fines_paid into v_fp from public.pool_members
   where pool_id='d4007001-0000-4000-a000-00000000700a'
     and user_id='d4000000-0000-4000-a000-000000000001';
  if v_fp = 99 then raise notice 'PASS: fines_paid recorded ₹99';
  else raise exception 'FAIL: fines_paid=%', v_fp; end if;

  r := public.submit_check_in('d4007001-0000-4000-a000-00000000700a','p/u/unblocked.jpg');
  if (r->>'ok')::boolean then raise notice 'PASS: check-in works again — the user is fully unblocked';
  else raise exception 'FAIL: still blocked: %', r; end if;
end $$;

\echo '=== TEST 6: the debt summary is clear afterwards ==='
do $$
declare d jsonb; n integer;
begin
  d := public.my_debt_summary();
  if (d->>'total')::numeric = 0 and not (d->>'is_delinquent')::boolean
    then raise notice 'PASS: nothing owed, not delinquent';
    else raise exception 'FAIL: %', d; end if;

  select count(*) into n from public.my_outstanding_fines();
  if n = 0 then raise notice 'PASS: the outstanding list is empty';
  else raise exception 'FAIL: % rows', n; end if;
end $$;

\echo '=== TEST 7: paying twice does not double-charge ==='
do $$
declare v_txn uuid; r jsonb; v_pot_before numeric; v_pot_after numeric;
begin
  v_txn := 'd4f10001-0000-4000-a000-00000000f001';
  select total_pot into v_pot_before from public.pools where id='d4007001-0000-4000-a000-00000000700a';

  r := public.start_fine_payment(v_txn);
  if (r->>'already_paid')::boolean then raise notice 'PASS: a settled fine reports already_paid instead of reopening';
  else raise exception 'FAIL: %', r; end if;

  select total_pot into v_pot_after from public.pools where id='d4007001-0000-4000-a000-00000000700a';
  if v_pot_before = v_pot_after then raise notice 'PASS: pot unchanged at ₹%', v_pot_after;
  else raise exception 'FAIL: pot % -> %', v_pot_before, v_pot_after; end if;
end $$;

\echo '=== TEST 8: a fine still mid-ladder can be paid early, and leaves the queue ==='
reset role;
insert into public.transactions (id,user_id,pool_id,amount,transaction_type,status,idempotency_key,provider,
                                 failure_reason, retry_count, next_retry_at)
values ('d4f10002-0000-4000-a000-00000000f002','d4000000-0000-4000-a000-000000000002','d4007001-0000-4000-a000-00000000700a',99,'fine','retry_scheduled',
        'd4007001:d4000002:2026-10-12:fine','simulator','insufficient_funds',1, now() - interval '1 minute');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d4000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$
declare v_txn uuid; r jsonb;
begin
  v_txn := 'd4f10002-0000-4000-a000-00000000f002';
  r := public.start_fine_payment(v_txn);
  r := public.simulate_payment(r->>'order_id','success');
  if r->>'outcome'='succeeded' then raise notice 'PASS: a retry-scheduled fine can be settled early by hand';
  else raise exception 'FAIL: %', r; end if;
end $$;

reset role;
do $$
declare r jsonb; n integer;
begin
  r := public.charge_pending_fines(50,'success');
  select count(*) into n from public.transactions
   where idempotency_key='d4007001:d4000002:2026-10-12:fine' and status='succeeded';
  if (r->>'charged')::int = 0 and n = 1
    then raise notice 'PASS: the charger no longer sees it — paying by hand removes it from the retry queue';
    else raise exception 'FAIL: charged=% settled=%', r->>'charged', n; end if;
end $$;

\echo '=== TEST 9: manual payment does NOT require a pre-debit notice ==='
update public.payment_config set is_live = false, requires_pre_debit_notice = true where provider='simulator';
insert into public.transactions (id,user_id,pool_id,amount,transaction_type,status,idempotency_key,provider,failure_reason)
values ('d4f10003-0000-4000-a000-00000000f003','d4000000-0000-4000-a000-000000000001','d4007001-0000-4000-a000-00000000700a',99,'fine','failed',
        'd4007001:d4000001:2026-10-13:fine','simulator','no_mandate');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d4000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare v_txn uuid; r jsonb; v_status text; n integer;
begin
  v_txn := 'd4f10003-0000-4000-a000-00000000f003';

  select count(*) into n from public.pre_debit_notices where transaction_id = v_txn;
  if n = 0 then raise notice 'PASS: no pre-debit notice exists for this fine';
  else raise exception 'FAIL: a notice already exists'; end if;

  r := public.start_fine_payment(v_txn);
  r := public.simulate_payment(r->>'order_id','success');
  select status::text into v_status from public.transactions where id = v_txn;
  if v_status='succeeded'
    then raise notice 'PASS: customer-initiated payment settles with the auto-debit gate ON and no notice';
    else raise exception 'FAIL: %', v_status; end if;
end $$;
reset role;
update public.payment_config set requires_pre_debit_notice = false where provider='simulator';

rollback;
\echo 'MANUAL PAY TESTS COMPLETE — rolled back'
