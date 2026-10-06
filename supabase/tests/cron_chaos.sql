-- ============================================================================
-- CRON CHAOS TESTS — the failure modes that actually threaten money.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

-- Fixture: two active pools, one of which we will sabotage.
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at,
  encrypted_password, confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),
  '','','','','','','','','','{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values
  ('d0000000-0000-4000-a000-000000000001'::uuid,'919600000001'),
  ('d0000000-0000-4000-a000-000000000002'::uuid,'919600000002')
) as u(id, phone);

insert into public.pools (id, name, emoji, creator_id, challenge_type, start_date, end_date,
  check_in_deadline_utc, buy_in_amount, fine_amount, status, invite_code, timezone)
values
 ('d0007001-0000-4000-a000-00000000700a','Chaos Healthy','🙂','d0000000-0000-4000-a000-000000000001',
  'custom', now()-interval '2 days', now()+interval '20 days', 18, 500, 100, 'active','CHAOS1','Asia/Kolkata'),
 ('d0007002-0000-4000-a000-00000000700b','Chaos Broken','💥','d0000000-0000-4000-a000-000000000001',
  'custom', now()-interval '2 days', now()+interval '20 days', 18, 500, 100, 'active','CHAOS2','Asia/Kolkata');

insert into public.pool_members (user_id, pool_id, status, grace_tokens)
values
 ('d0000000-0000-4000-a000-000000000001','d0007001-0000-4000-a000-00000000700a','active',0),
 ('d0000000-0000-4000-a000-000000000002','d0007001-0000-4000-a000-00000000700a','active',0),
 ('d0000000-0000-4000-a000-000000000001','d0007002-0000-4000-a000-00000000700b','active',0),
 ('d0000000-0000-4000-a000-000000000002','d0007002-0000-4000-a000-00000000700b','active',0);

\echo '=== TEST 1: a pool that RAISES mid-processing must not abort the run ==='
-- Sabotage: a BEFORE-UPDATE trigger on pool_members that explodes for the
-- broken pool only. This is a genuine mid-loop exception, not a soft error.
create or replace function public.chaos_boom() returns trigger
language plpgsql as $$
begin
  if new.pool_id = 'd0007002-0000-4000-a000-00000000700b' then
    raise exception 'CHAOS: simulated failure inside pool processing';
  end if;
  return new;
end $$;
create trigger chaos_trigger before update on public.pool_members
  for each row execute function public.chaos_boom();

select public.process_check_ins((now() at time zone 'Asia/Kolkata')::date, null) as chaos_run;

drop trigger chaos_trigger on public.pool_members;

do $$
declare v_healthy integer; v_broken integer; v_errors integer; v_status text;
begin
  -- Healthy pool must have been fully processed despite the sibling failing.
  select count(*) into v_healthy from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  select count(*) into v_broken from public.transactions
    where pool_id='d0007002-0000-4000-a000-00000000700b' and transaction_type='fine';
  select jsonb_array_length(errors), status::text into v_errors, v_status
    from public.cron_runs where job_name='process-checkins' order by started_at desc limit 1;

  if v_healthy = 2 then raise notice 'PASS: healthy pool fully processed (2 fines) despite sibling crash';
  else raise exception 'FAIL: healthy pool fines=% (expected 2)', v_healthy; end if;

  if v_broken = 0 then raise notice 'PASS: crashed pool wrote NO partial fines (rolled back cleanly)';
  else raise exception 'FAIL: broken pool wrote % fines', v_broken; end if;

  if v_errors >= 1 and v_status = 'failed' then
    raise notice 'PASS: failure captured in cron_runs (errors=%, status=%) — not silent', v_errors, v_status;
  else raise exception 'FAIL: error not recorded (errors=% status=%)', v_errors, v_status; end if;
end $$;

\echo '=== TEST 2: re-run after the crash must heal the broken pool ==='
select public.process_check_ins((now() at time zone 'Asia/Kolkata')::date,
                                'd0007002-0000-4000-a000-00000000700b') as heal_run;
do $$
declare v_broken integer; v_healthy integer;
begin
  select count(*) into v_broken from public.transactions
    where pool_id='d0007002-0000-4000-a000-00000000700b' and transaction_type='fine';
  select count(*) into v_healthy from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  if v_broken = 2 then raise notice 'PASS: previously-crashed pool processed correctly on retry (2 fines)';
  else raise exception 'FAIL: heal fines=%', v_broken; end if;
  if v_healthy = 2 then raise notice 'PASS: already-processed pool untouched by the retry (still 2)';
  else raise exception 'FAIL: healthy pool now has % fines — double charge!', v_healthy; end if;
end $$;

\echo '=== TEST 3: idempotency key blocks a duplicate fine even if forced ==='
do $$
declare v_before integer; v_after integer; v_key text;
begin
  select count(*) into v_before from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  v_key := 'd0007001-0000-4000-a000-00000000700a:d0000000-0000-4000-a000-000000000001:'
           || (now() at time zone 'Asia/Kolkata')::date::text || ':fine';
  begin
    insert into public.transactions (user_id, pool_id, amount, transaction_type, status, idempotency_key)
    values ('d0000000-0000-4000-a000-000000000001','d0007001-0000-4000-a000-00000000700a',
            100,'fine','pending', v_key);
    raise exception 'FAIL: duplicate fine was accepted — DOUBLE CHARGE POSSIBLE';
  exception when unique_violation then
    raise notice 'PASS: duplicate fine rejected by idempotency_key UNIQUE constraint';
  end;
  select count(*) into v_after from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  if v_before = v_after then raise notice 'PASS: fine count unchanged after duplicate attempt (%)', v_after;
  else raise exception 'FAIL: count changed %→%', v_before, v_after; end if;
end $$;

\echo '=== TEST 4: replaying an OLD day does not re-charge (guard holds) ==='
do $$
declare v_before integer; v_after integer;
begin
  select count(*) into v_before from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  -- Replay yesterday: members' last_processed_date is already today (>= yesterday) → skip.
  perform public.process_check_ins(((now() at time zone 'Asia/Kolkata')::date - 1),
                                   'd0007001-0000-4000-a000-00000000700a');
  select count(*) into v_after from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and transaction_type='fine';
  if v_before = v_after then raise notice 'PASS: replaying an older day charged nothing (%)', v_after;
  else raise exception 'FAIL: replay charged extra: %→%', v_before, v_after; end if;
end $$;

\echo '=== TEST 5: pot stays exact after all that chaos ==='
do $$
declare v_pot numeric; v_sum numeric;
begin
  select total_pot into v_pot from public.pools where id='d0007001-0000-4000-a000-00000000700a';
  select coalesce(sum(amount),0) into v_sum from public.transactions
    where pool_id='d0007001-0000-4000-a000-00000000700a' and status='succeeded'
      and transaction_type in ('deposit','fine');
  if v_pot = v_sum then raise notice 'PASS: pot (%) still equals SUM(succeeded) after chaos', v_pot;
  else raise exception 'FAIL: pot=% sum=%', v_pot, v_sum; end if;
end $$;

\echo '=== TEST 6: fines are PENDING (payment decoupled — F5 charges them) ==='
do $$
declare v_pending integer; v_succeeded integer;
begin
  select count(*) filter (where status='pending'), count(*) filter (where status='succeeded')
    into v_pending, v_succeeded
  from public.transactions where transaction_type='fine'
    and pool_id in ('d0007001-0000-4000-a000-00000000700a','d0007002-0000-4000-a000-00000000700b');
  if v_pending = 4 and v_succeeded = 0 then
    raise notice 'PASS: all 4 fines recorded as pending, awaiting the payment worker';
  else raise exception 'FAIL: pending=% succeeded=%', v_pending, v_succeeded; end if;
end $$;

rollback;
\echo 'CHAOS TESTS COMPLETE — rolled back'
