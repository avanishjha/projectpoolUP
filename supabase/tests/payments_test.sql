-- ============================================================================
-- CONQR PAYMENT FOUNDATION — ADVERSARIAL TESTS (F5.1)
-- Money code. Every assertion here protects against a real failure mode.
-- All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

-- ── Fixture: a pool with a ₹500 buy-in and one member ──────────────────────
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at,
  encrypted_password, confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated','authenticated', u.phone, now(),
  '','','','','','','','','','{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values
  ('e0000000-0000-4000-a000-000000000001'::uuid,'919500000001'),
  ('e0000000-0000-4000-a000-000000000002'::uuid,'919500000002')
) as u(id, phone);

insert into public.pools (id, name, emoji, creator_id, challenge_type, start_date, end_date,
  check_in_deadline_utc, buy_in_amount, fine_amount, status, invite_code, timezone)
values ('e0007001-0000-4000-a000-00000000700a','Pay Test','💳','e0000000-0000-4000-a000-000000000001',
  'custom', now() + interval '1 day', now() + interval '30 days', 18, 500, 99, 'pending','PAY001','Asia/Kolkata');

insert into public.pool_members (user_id, pool_id, status)
values ('e0000000-0000-4000-a000-000000000001','e0007001-0000-4000-a000-00000000700a','pending'),
       ('e0000000-0000-4000-a000-000000000002','e0007001-0000-4000-a000-00000000700a','pending');

\echo '=== TEST 1: signature verification ==='
do $$
declare v_body text := '{"id":"evt_1","event":"payment.captured"}'; v_sig text;
begin
  v_sig := encode(extensions.hmac(v_body, 'conqr_sim_whsec_local_dev_only', 'sha256'), 'hex');
  if public.verify_payment_signature(v_body, v_sig, 'simulator') then
    raise notice 'PASS: a correctly signed body verifies';
  else raise exception 'FAIL: valid signature rejected'; end if;

  if not public.verify_payment_signature(v_body, 'deadbeef', 'simulator') then
    raise notice 'PASS: a forged signature is rejected';
  else raise exception 'FAIL: forged signature accepted'; end if;

  -- One byte changed in the body must invalidate the signature.
  if not public.verify_payment_signature(v_body || ' ', v_sig, 'simulator') then
    raise notice 'PASS: tampered body is rejected (signature covers the body)';
  else raise exception 'FAIL: tampered body accepted'; end if;

  if not public.verify_payment_signature(v_body, null, 'simulator') then
    raise notice 'PASS: a missing signature is rejected';
  else raise exception 'FAIL: null signature accepted'; end if;
end $$;

\echo '=== TEST 2: unsigned events never reach the state machine ==='
do $$
declare v_res jsonb;
begin
  v_res := public.apply_payment_event('{"id":"evt_x","event":"payment.captured","payload":{"order_id":"whatever"}}', 'notasignature', 'simulator');
  if v_res->>'error' = 'bad_signature' then raise notice 'PASS: unsigned event refused before parsing';
  else raise exception 'FAIL: %', v_res; end if;

  if (select count(*) from public.payment_events) = 0 then
    raise notice 'PASS: refused event was not even logged as processed';
  else raise exception 'FAIL: unsigned event was logged'; end if;
end $$;

\echo '=== TEST 3: checkout creates exactly one pending transaction ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e0000000-0000-4000-a000-000000000001","role":"authenticated"}',true);

do $$
declare v_a jsonb; v_b jsonb; v_cnt integer;
begin
  v_a := public.start_checkout('e0007001-0000-4000-a000-00000000700a');
  if not (v_a->>'ok')::boolean then raise exception 'FAIL checkout: %', v_a; end if;
  if (v_a->>'amount')::numeric = 500 then raise notice 'PASS: checkout opened for the pool buy-in (₹500)';
  else raise exception 'FAIL amount: %', v_a; end if;

  -- Double-tap the pay button: must resume, never mint a second order.
  v_b := public.start_checkout('e0007001-0000-4000-a000-00000000700a');
  if (v_b->>'resumed')::boolean and (v_b->>'transaction_id') = (v_a->>'transaction_id') then
    raise notice 'PASS: second checkout resumes the same transaction';
  else raise exception 'FAIL: checkout created a duplicate: % vs %', v_a, v_b; end if;

  select count(*) into v_cnt from public.transactions
    where pool_id = 'e0007001-0000-4000-a000-00000000700a' and transaction_type = 'deposit';
  if v_cnt = 1 then raise notice 'PASS: exactly 1 deposit row exists';
  else raise exception 'FAIL: % deposit rows', v_cnt; end if;

  select count(*) into v_cnt from public.payment_customers
    where user_id = 'e0000000-0000-4000-a000-000000000001';
  if v_cnt = 1 then raise notice 'PASS: payment customer created once on checkout';
  else raise exception 'FAIL: % customers', v_cnt; end if;
end $$;

\echo '=== TEST 4: a successful payment settles and moves the pot ==='
do $$
declare v_order text; v_res jsonb; v_status text; v_pot numeric;
begin
  select provider_order_id into v_order from public.transactions
    where pool_id = 'e0007001-0000-4000-a000-00000000700a' and user_id = 'e0000000-0000-4000-a000-000000000001';

  v_res := public.simulate_payment(v_order, 'success');
  if v_res->>'outcome' = 'succeeded' then raise notice 'PASS: simulated capture succeeded through the real state machine';
  else raise exception 'FAIL: %', v_res; end if;

  select status into v_status from public.transactions where provider_order_id = v_order;
  if v_status = 'succeeded' then raise notice 'PASS: transaction is succeeded';
  else raise exception 'FAIL status=%', v_status; end if;

  select total_pot into v_pot from public.pools where id = 'e0007001-0000-4000-a000-00000000700a';
  if v_pot = 500 then raise notice 'PASS: pot recalculated to ₹500';
  else raise exception 'FAIL pot=%', v_pot; end if;
end $$;

\echo '=== TEST 5: REPLAY — the same webhook twice must not double-charge ==='
-- A webhook arrives as the service role, never as a signed-in client.
-- (That authenticated cannot reach apply_payment_event at all is TEST 9.)
reset role;
do $$
declare v_order text; v_body text; v_sig text; v_eid text; v_r1 jsonb; v_r2 jsonb; v_pot numeric; v_cnt integer;
begin
  select provider_order_id into v_order from public.transactions
    where pool_id = 'e0007001-0000-4000-a000-00000000700a' and user_id = 'e0000000-0000-4000-a000-000000000001';

  v_eid := 'evt_replay_test';
  v_body := (jsonb_build_object('id', v_eid, 'event','payment.captured',
             'payload', jsonb_build_object('order_id', v_order, 'payment_id','pay_dupe')))::text;
  v_sig := encode(extensions.hmac(v_body, 'conqr_sim_whsec_local_dev_only', 'sha256'), 'hex');

  v_r1 := public.apply_payment_event(v_body, v_sig, 'simulator');
  v_r2 := public.apply_payment_event(v_body, v_sig, 'simulator');

  if (v_r2->>'duplicate')::boolean then raise notice 'PASS: replayed event short-circuits as duplicate';
  else raise exception 'FAIL: replay not detected: %', v_r2; end if;

  select count(*) into v_cnt from public.payment_events where provider_event_id = v_eid;
  if v_cnt = 1 then raise notice 'PASS: only one event row for a replayed delivery';
  else raise exception 'FAIL: % event rows', v_cnt; end if;

  select total_pot into v_pot from public.pools where id = 'e0007001-0000-4000-a000-00000000700a';
  if v_pot = 500 then raise notice 'PASS: pot unchanged after replay (₹500, not ₹1000)';
  else raise exception 'FAIL: pot moved to % on replay', v_pot; end if;
end $$;

\echo '=== TEST 6: a late failure cannot un-succeed a settled payment ==='
do $$
declare v_order text; v_res jsonb; v_status text;
begin
  select provider_order_id into v_order from public.transactions
    where pool_id = 'e0007001-0000-4000-a000-00000000700a' and user_id = 'e0000000-0000-4000-a000-000000000001';

  v_res := public.simulate_payment(v_order, 'fail', 'late_arriving_failure');
  if v_res->>'ignored' = 'already_terminal' then raise notice 'PASS: late failure ignored on a succeeded payment';
  else raise exception 'FAIL: %', v_res; end if;

  select status into v_status from public.transactions where provider_order_id = v_order;
  if v_status = 'succeeded' then raise notice 'PASS: transaction is still succeeded';
  else raise exception 'FAIL: status reverted to %', v_status; end if;
end $$;

\echo '=== TEST 7: failures schedule retries on the 6h/24h/72h ladder ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e0000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$
declare v_order text; v_c jsonb; v_status text; v_retry integer; v_next timestamptz; v_gap interval;
begin
  v_c := public.start_checkout('e0007001-0000-4000-a000-00000000700a');
  v_order := v_c->>'order_id';

  perform public.simulate_payment(v_order, 'fail', 'insufficient_funds');
  select status, retry_count, next_retry_at into v_status, v_retry, v_next
    from public.transactions where provider_order_id = v_order;
  v_gap := v_next - now();
  if v_status = 'retry_scheduled' and v_retry = 1 and v_gap > interval '5 hours' and v_gap < interval '7 hours' then
    raise notice 'PASS: 1st failure → retry_scheduled, +6h';
  else raise exception 'FAIL 1st: status=% retry=% gap=%', v_status, v_retry, v_gap; end if;

  perform public.simulate_payment(v_order, 'fail', 'insufficient_funds');
  select retry_count, next_retry_at into v_retry, v_next from public.transactions where provider_order_id = v_order;
  v_gap := v_next - now();
  if v_retry = 2 and v_gap > interval '23 hours' and v_gap < interval '25 hours' then
    raise notice 'PASS: 2nd failure → +24h';
  else raise exception 'FAIL 2nd: retry=% gap=%', v_retry, v_gap; end if;

  perform public.simulate_payment(v_order, 'fail', 'insufficient_funds');
  select retry_count into v_retry from public.transactions where provider_order_id = v_order;
  if v_retry = 3 then raise notice 'PASS: 3rd failure → +72h, retry_count 3';
  else raise exception 'FAIL 3rd: retry=%', v_retry; end if;

  perform public.simulate_payment(v_order, 'fail', 'insufficient_funds');
  select status, retry_count into v_status, v_retry from public.transactions where provider_order_id = v_order;
  if v_status = 'failed' and v_retry = 3 then raise notice 'PASS: 4th failure → terminal failed, retry_count capped at 3';
  else raise exception 'FAIL 4th: status=% retry=%', v_status, v_retry; end if;
end $$;

\echo '=== TEST 8: a failed payment contributes NOTHING to the pot ==='
-- Reset to an unrestricted role: under `authenticated`, RLS correctly hides
-- other members' transactions, so SUM() would only see this user's rows.
reset role;
do $$
declare v_pot numeric; v_sum numeric;
begin
  select total_pot into v_pot from public.pools where id = 'e0007001-0000-4000-a000-00000000700a';
  select coalesce(sum(amount),0) into v_sum from public.transactions
    where pool_id = 'e0007001-0000-4000-a000-00000000700a' and status = 'succeeded'
      and transaction_type in ('deposit','fine');
  if v_pot = 500 and v_sum = 500 then raise notice 'PASS: pot still ₹500 — only the settled buy-in counts';
  else raise exception 'FAIL: pot=% sum=%', v_pot, v_sum; end if;
end $$;

\echo '=== TEST 9: a client cannot mark its own payment succeeded ==='
do $$
declare v_has boolean;
begin
  select has_function_privilege('authenticated', 'public.apply_payment_event(text,text,text)', 'execute') into v_has;
  if not v_has then raise notice 'PASS: apply_payment_event is not executable by authenticated';
  else raise exception 'FAIL: clients can call the state machine directly'; end if;

  select has_function_privilege('authenticated', 'public.verify_payment_signature(text,text,text)', 'execute') into v_has;
  if not v_has then raise notice 'PASS: signature helper is not exposed to clients';
  else raise exception 'FAIL: signature helper exposed'; end if;
end $$;

\echo '=== TEST 10: a non-member cannot open a checkout ==='
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-4000-a000-000000000007","role":"authenticated"}',true);
do $$
declare v_res jsonb;
begin
  v_res := public.start_checkout('e0007001-0000-4000-a000-00000000700a');
  if v_res->>'error' = 'not_a_member' then raise notice 'PASS: non-member checkout refused';
  else raise exception 'FAIL: %', v_res; end if;
end $$;

\echo '=== TEST 11: unknown order is refused, and the live guard works ==='
reset role;
do $$
declare v_res jsonb;
begin
  v_res := public.simulate_payment('order_that_does_not_exist', 'success');
  if v_res->>'error' = 'unknown_order' then raise notice 'PASS: event for an unknown order refused';
  else raise exception 'FAIL: %', v_res; end if;

  update public.payment_config set is_live = true where provider = 'simulator';
  v_res := public.simulate_payment('anything', 'success');
  if v_res->>'error' = 'simulator_disabled_in_live' then raise notice 'PASS: simulator refuses to run once the provider is live';
  else raise exception 'FAIL: simulator ran in live mode: %', v_res; end if;
  update public.payment_config set is_live = false where provider = 'simulator';
end $$;

\echo '=== TEST 12: free pools need no payment at all ==='
insert into public.pools (id, name, emoji, creator_id, challenge_type, start_date, end_date,
  check_in_deadline_utc, buy_in_amount, fine_amount, status, invite_code, timezone)
values ('e0007002-0000-4000-a000-00000000700b','Free Pool','🆓','e0000000-0000-4000-a000-000000000001',
  'custom', now() + interval '1 day', now() + interval '30 days', 18, 0, 0, 'pending','FREE01','Asia/Kolkata');
insert into public.pool_members (user_id, pool_id, status)
values ('e0000000-0000-4000-a000-000000000001','e0007002-0000-4000-a000-00000000700b','pending');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e0000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare v_res jsonb; v_cnt integer;
begin
  v_res := public.start_checkout('e0007002-0000-4000-a000-00000000700b');
  if (v_res->>'free')::boolean then raise notice 'PASS: ₹0 pool short-circuits with no transaction';
  else raise exception 'FAIL: %', v_res; end if;
  select count(*) into v_cnt from public.transactions where pool_id = 'e0007002-0000-4000-a000-00000000700b';
  if v_cnt = 0 then raise notice 'PASS: no transaction row created for a free pool';
  else raise exception 'FAIL: % rows', v_cnt; end if;
end $$;

rollback;
\echo 'PAYMENT TESTS COMPLETE — rolled back'
