-- ============================================================================
-- CONQR WALLET — TESTS (F7.1 / F7.2)
-- Every figure here is money shown to a user. A wrong one is worse than a
-- missing one. All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('a7000000-0000-4000-a000-000000000001'::uuid,'918800000001'),
             ('a7000000-0000-4000-a000-000000000002'::uuid,'918800000002'),
             ('a7000000-0000-4000-a000-000000000003'::uuid,'918800000003')) as u(id,phone);

-- A winner-takes-all pool, 3 members, ₹500 each, platform fee at the 5% default.
insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone,payout_rule)
values ('a7007001-0000-4000-a000-00000000700a','WTA Pool','🏆','a7000000-0000-4000-a000-000000000001',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','WAL001','Asia/Kolkata','winner_takes_all');

insert into public.pool_members (user_id,pool_id,status,current_streak,compliance_pct,joined_at) values
 ('a7000000-0000-4000-a000-000000000001','a7007001-0000-4000-a000-00000000700a','active',10,100, now()-interval '5 days'),
 ('a7000000-0000-4000-a000-000000000002','a7007001-0000-4000-a000-00000000700a','active', 5, 60, now()-interval '5 days'),
 ('a7000000-0000-4000-a000-000000000003','a7007001-0000-4000-a000-00000000700a','active', 2, 40, now()-interval '5 days');

insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 500,'deposit','succeeded',
       pm.pool_id::text||':'||pm.user_id::text||':deposit','simulator'
from public.pool_members pm where pm.pool_id='a7007001-0000-4000-a000-00000000700a';
select public.recalc_pool_pot('a7007001-0000-4000-a000-00000000700a');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000001","role":"authenticated"}',true);

\echo '=== TEST 1: the summary adds up from the ledger, not a counter ==='
do $$
declare s jsonb;
begin
  s := public.my_wallet_summary();
  if (s->>'deposited')::numeric = 500 and (s->>'fined')::numeric = 0
     and (s->>'won')::numeric = 0 and (s->>'net')::numeric = -500
    then raise notice 'PASS: ₹500 in, nothing back, net −₹500';
    else raise exception 'FAIL: %', s; end if;

  if (s->>'in_play')::numeric = 500
    then raise notice 'PASS: ₹500 shown as in play (pool still running)';
    else raise exception 'FAIL in_play: %', s; end if;
end $$;

\echo '=== TEST 2: winner-takes-all estimate is NET of fee and GST ==='
do $$
declare v_est numeric; v_rank integer; v_pot numeric;
begin
  select estimated_payout, my_rank, total_pot into v_est, v_rank, v_pot
    from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';

  -- Pot ₹1500, rank 1, minus 5% fee and 18% GST on the fee = 1500 * (1 - 0.059)
  if v_rank = 1 and v_pot = 1500 and v_est = round(1500 * (1 - (0.05 + 0.05*0.18)), 2)
    then raise notice 'PASS: rank 1 of a ₹1500 pot estimates ₹% after fee + GST', v_est;
    else raise exception 'FAIL: rank=% pot=% est=%', v_rank, v_pot, v_est; end if;

  if v_est < v_pot then raise notice 'PASS: the estimate is below the gross pot — users are not shown money they will not get';
  else raise exception 'FAIL: estimate >= pot'; end if;
end $$;

\echo '=== TEST 3: a losing member is estimated nothing under winner-takes-all ==='
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
do $$
declare v_est numeric; v_rank integer;
begin
  select estimated_payout, my_rank into v_est, v_rank
    from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';
  if v_rank = 3 and v_est = 0 then raise notice 'PASS: last place estimates ₹0, not a share';
  else raise exception 'FAIL: rank=% est=%', v_rank, v_est; end if;
end $$;

\echo '=== TEST 4: top-3 split pays 50/30/20 ==='
reset role;
update public.pools set payout_rule = 'top_3_split' where id='a7007001-0000-4000-a000-00000000700a';
set local role authenticated;
do $$
declare v1 numeric; v2 numeric; v3 numeric; v_mult numeric := 1 - (0.05 + 0.05*0.18);
begin
  perform set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
  select estimated_payout into v1 from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';
  perform set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
  select estimated_payout into v2 from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';
  perform set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
  select estimated_payout into v3 from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';

  if v1 = round(1500*0.50*v_mult,2) and v2 = round(1500*0.30*v_mult,2) and v3 = round(1500*0.20*v_mult,2)
    then raise notice 'PASS: 50/30/20 → ₹% / ₹% / ₹%', v1, v2, v3;
    else raise exception 'FAIL: % % %', v1, v2, v3; end if;

  if round(v1+v2+v3, 0) = round(1500*v_mult, 0)
    then raise notice 'PASS: the three shares sum to the whole pot after fees';
    else raise exception 'FAIL: shares sum to % not %', v1+v2+v3, 1500*v_mult; end if;
end $$;

\echo '=== TEST 5: proportional splits by compliance ==='
reset role;
update public.pools set payout_rule = 'proportional' where id='a7007001-0000-4000-a000-00000000700a';
set local role authenticated;
do $$
declare v1 numeric; v_mult numeric := 1 - (0.05 + 0.05*0.18);
begin
  perform set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
  select estimated_payout into v1 from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';
  -- compliance 100 of (100+60+40)=200 → half the pot
  if v1 = round(1500 * (100.0/200.0) * v_mult, 2)
    then raise notice 'PASS: 100%% of 200 total compliance → ₹% (half the pot, after fees)', v1;
    else raise exception 'FAIL: %', v1; end if;
end $$;

\echo '=== TEST 6: a settled fine moves BOTH the pot and what you are down ==='
reset role;
update public.pools set payout_rule = 'winner_takes_all' where id='a7007001-0000-4000-a000-00000000700a';
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
values ('a7000000-0000-4000-a000-000000000003','a7007001-0000-4000-a000-00000000700a',99,'fine','succeeded',
        'a7007001:a7000003:fine','simulator');
select public.recalc_pool_pot('a7007001-0000-4000-a000-00000000700a');
select public.recalc_member_fines('a7007001-0000-4000-a000-00000000700a','a7000000-0000-4000-a000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
do $$
declare s jsonb; v_fines numeric; v_pot numeric;
begin
  s := public.my_wallet_summary();
  if (s->>'fined')::numeric = 99 and (s->>'net')::numeric = -599
    then raise notice 'PASS: the fined member is down ₹599 (₹500 buy-in + ₹99 fine)';
    else raise exception 'FAIL: %', s; end if;

  select fines_paid, total_pot into v_fines, v_pot
    from public.my_pool_positions() where pool_id='a7007001-0000-4000-a000-00000000700a';
  if v_fines = 99 and v_pot = 1599
    then raise notice 'PASS: their ₹99 shows against them AND in the ₹1599 pot';
    else raise exception 'FAIL: fines=% pot=%', v_fines, v_pot; end if;
end $$;

\echo '=== TEST 7: an UNPAID fine is owed, not counted as lost ==='
reset role;
insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider,failure_reason)
values ('a7000000-0000-4000-a000-000000000002','a7007001-0000-4000-a000-00000000700a',99,'fine','failed',
        'a7007001:a7000002:fine','simulator','no_mandate');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$
declare s jsonb; v_owed numeric;
begin
  s := public.my_wallet_summary();
  if (s->>'owed')::numeric = 99 and (s->>'fined')::numeric = 0 and (s->>'net')::numeric = -500
    then raise notice 'PASS: ₹99 shown as owed, NOT as money already lost';
    else raise exception 'FAIL: %', s; end if;

  select fines_owed into v_owed from public.my_pool_positions()
   where pool_id='a7007001-0000-4000-a000-00000000700a';
  if v_owed = 99 then raise notice 'PASS: the pool position shows ₹99 outstanding';
  else raise exception 'FAIL owed=%', v_owed; end if;
end $$;

\echo '=== TEST 8: the ledger reads from the USER''s point of view ==='
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
do $$
declare n integer; v_dir text;
begin
  select count(*) into n from public.my_ledger('all');
  if n = 2 then raise notice 'PASS: 2 ledger rows (buy-in + fine)';
  else raise exception 'FAIL: % rows', n; end if;

  select direction into v_dir from public.my_ledger('all') where transaction_type='fine';
  if v_dir = 'out' then raise notice 'PASS: a fine reads as money OUT, not as platform revenue IN';
  else raise exception 'FAIL direction=%', v_dir; end if;

  select count(*) into n from public.my_ledger('fines');
  if n = 1 then raise notice 'PASS: the fines filter works';
  else raise exception 'FAIL: % rows', n; end if;

  select count(*) into n from public.my_ledger('payouts');
  if n = 0 then raise notice 'PASS: payouts filter is empty — correct, F5.8 does not exist yet';
  else raise exception 'FAIL: % payouts', n; end if;
end $$;

\echo '=== TEST 9: you never see another member''s money ==='
do $$
declare n integer; s jsonb;
begin
  select count(*) into n from public.my_ledger('all')
   where id in (select id from public.transactions where user_id <> 'a7000000-0000-4000-a000-000000000003');
  if n = 0 then raise notice 'PASS: no other member''s transactions leak into the ledger';
  else raise exception 'FAIL: % leaked', n; end if;

  select count(*) into n from public.my_pool_positions()
   where pool_id not in (select pool_id from public.pool_members where user_id='a7000000-0000-4000-a000-000000000003');
  if n = 0 then raise notice 'PASS: only pools you are in appear';
  else raise exception 'FAIL: % foreign pools', n; end if;
end $$;

\echo '=== TEST 10: a completed pool leaves "in play" ==='
reset role;
update public.pools set status = 'completed' where id='a7007001-0000-4000-a000-00000000700a';
set local role authenticated;
do $$
declare s jsonb; n integer;
begin
  s := public.my_wallet_summary();
  if (s->>'in_play')::numeric = 0
    then raise notice 'PASS: nothing in play once the pool has finished';
    else raise exception 'FAIL in_play=%', s->>'in_play'; end if;

  select count(*) into n from public.my_pool_positions();
  if n = 0 then raise notice 'PASS: finished pools drop off the active positions list';
  else raise exception 'FAIL: % still listed', n; end if;
end $$;

\echo '=== TEST 11: there is no stored balance to read, by design ==='
reset role;
do $$
declare n integer;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and column_name like '%balance%';
  if n = 0 then raise notice 'PASS: no balance column exists — this is a statement, not a PPI';
  else raise exception 'FAIL: % balance column(s) have appeared', n; end if;
end $$;

rollback;
\echo 'WALLET TESTS COMPLETE — rolled back'
