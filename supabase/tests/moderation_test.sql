-- ============================================================================
-- CONQR MODERATION — TESTS (F11.3)
-- These assertions decide whether a cheat keeps a faked streak and whether an
-- honest member is wrongly fined. All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('b8000000-0000-4000-a000-000000000a01'::uuid,'918700000001'),  -- the accused
             ('b8000000-0000-4000-a000-000000000b01'::uuid,'918700000002'),  -- reporter 1
             ('b8000000-0000-4000-a000-000000000c01'::uuid,'918700000003'),  -- reporter 2
             ('b8000000-0000-4000-a000-000000000d01'::uuid,'918700000004')   -- reporter 3
     ) as u(id, phone);

insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('b8007001-0000-4000-a000-00000000700a','Mod Pool','🛡️','b8000000-0000-4000-a000-000000000a01',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','MOD001','Asia/Kolkata');

insert into public.pool_members (user_id,pool_id,status,current_streak,grace_tokens)
select u, 'b8007001-0000-4000-a000-00000000700a', 'active', 7, 0
from (values ('b8000000-0000-4000-a000-000000000a01'::uuid),
             ('b8000000-0000-4000-a000-000000000b01'::uuid),
             ('b8000000-0000-4000-a000-000000000c01'::uuid),
             ('b8000000-0000-4000-a000-000000000d01'::uuid)) as x(u);

insert into public.transactions (user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
select pm.user_id, pm.pool_id, 500,'deposit','succeeded',
       pm.pool_id::text||':'||pm.user_id::text||':deposit','simulator'
from public.pool_members pm where pm.pool_id='b8007001-0000-4000-a000-00000000700a';

insert into public.check_ins (id, user_id, pool_id, image_path, client_captured_at, checkin_date, caption)
values ('b8c10001-0000-4000-a000-0000000c1001','b8000000-0000-4000-a000-000000000a01',
        'b8007001-0000-4000-a000-00000000700a',
        'b8007001/accused/fake.jpg', now(), (now() at time zone 'Asia/Kolkata')::date, 'totally real');

\echo '=== TEST 1: three reports auto-flag it and it lands in the queue ==='
do $$
declare n integer; v_verified boolean;
begin
  insert into public.reports (reporter_id, check_in_id, reason) values
   ('b8000000-0000-4000-a000-000000000b01','b8c10001-0000-4000-a000-0000000c1001','reused_photo'),
   ('b8000000-0000-4000-a000-000000000c01','b8c10001-0000-4000-a000-0000000c1001','not_real_photo'),
   ('b8000000-0000-4000-a000-000000000d01','b8c10001-0000-4000-a000-0000000c1001','reused_photo');

  select is_verified into v_verified from public.check_ins where id='b8c10001-0000-4000-a000-0000000c1001';
  if not v_verified then raise notice 'PASS: the existing trigger flagged it at 3 reports';
  else raise exception 'FAIL: still verified'; end if;
end $$;

\echo '=== TEST 2: a normal member cannot see the queue at all ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b8000000-0000-4000-a000-000000000b01","role":"authenticated"}',true);
do $$
declare n integer; r jsonb;
begin
  select count(*) into n from public.moderation_queue();
  if n = 0 then raise notice 'PASS: a member with no moderation capability sees an empty queue';
  else raise exception 'FAIL: leaked % rows', n; end if;

  r := public.moderation_stats();
  if r ? 'error' then raise notice 'PASS: stats refused for a non-moderator';
  else raise exception 'FAIL: %', r; end if;

  r := public.review_check_in('b8c10001-0000-4000-a000-0000000c1001','cleared');
  if r->>'error' = 'forbidden' then raise notice 'PASS: a member cannot clear a report against themselves or anyone';
  else raise exception 'FAIL: %', r; end if;
end $$;

\echo '=== TEST 3: the admin sees it, with everything needed to judge ==='
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare q record; n integer;
begin
  select count(*) into n from public.moderation_queue() where id='b8c10001-0000-4000-a000-0000000c1001';
  if n = 1 then raise notice 'PASS: the flagged check-in is in the admin queue';
  else raise exception 'FAIL: % rows', n; end if;

  select * into q from public.moderation_queue() where id='b8c10001-0000-4000-a000-0000000c1001';
  if q.report_count = 3 and q.image_path is not null
     and 'reused_photo' = any(q.reasons) and 'not_real_photo' = any(q.reasons)
    then raise notice 'PASS: row carries the photo, 3 reports and both distinct reasons';
    else raise exception 'FAIL: count=% reasons=%', q.report_count, q.reasons; end if;

  if q.dispute_deadline > now() and q.review_deadline > q.dispute_deadline
    then raise notice 'PASS: 24h dispute window and 48h review window both set';
    else raise exception 'FAIL: windows wrong'; end if;
end $$;

\echo '=== TEST 4: the accused can dispute, once, and only their own ==='
select set_config('request.jwt.claims','{"sub":"b8000000-0000-4000-a000-000000000a01","role":"authenticated"}',true);
do $$
declare r jsonb; n integer;
begin
  select count(*) into n from public.my_flagged_check_ins();
  if n = 1 then raise notice 'PASS: the accused can see their own flagged check-in';
  else raise exception 'FAIL: % rows', n; end if;

  r := public.submit_dispute('b8c10001-0000-4000-a000-0000000c1001','short');
  if r->>'error' = 'too_short' then raise notice 'PASS: a one-word dispute is refused';
  else raise exception 'FAIL: %', r; end if;

  r := public.submit_dispute('b8c10001-0000-4000-a000-0000000c1001',
       'That is genuinely my photo, taken in my building car park at 6am.');
  if (r->>'ok')::boolean then raise notice 'PASS: dispute accepted';
  else raise exception 'FAIL: %', r; end if;

  r := public.submit_dispute('b8c10001-0000-4000-a000-0000000c1001','Trying again with another excuse entirely.');
  if r->>'error' = 'already_disputed' then raise notice 'PASS: one dispute per check-in, not an appeal loop';
  else raise exception 'FAIL: %', r; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"b8000000-0000-4000-a000-000000000b01","role":"authenticated"}',true);
do $$
declare r jsonb;
begin
  r := public.submit_dispute('b8c10001-0000-4000-a000-0000000c1001','I want to dispute someone else check-in.');
  if r->>'error' = 'not_yours' then raise notice 'PASS: you cannot dispute someone else''s check-in';
  else raise exception 'FAIL: %', r; end if;
end $$;

\echo '=== TEST 5: the dispute reaches the moderator ==='
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare q record;
begin
  select * into q from public.moderation_queue() where id='b8c10001-0000-4000-a000-0000000c1001';
  if q.has_dispute and q.dispute_body like '%car park%'
    then raise notice 'PASS: the moderator sees the accused''s explanation in the same row';
    else raise exception 'FAIL: dispute not surfaced'; end if;
end $$;

\echo '=== TEST 6: UPHELD — a faked check-in becomes a miss, with a fine ==='
do $$
declare r jsonb; v_streak integer; v_misses integer; n integer;
begin
  r := public.review_check_in('b8c10001-0000-4000-a000-0000000c1001','upheld','Reverse image search matches a 2024 post.');
  if (r->>'ok')::boolean and (r->>'fined')::boolean
    then raise notice 'PASS: upheld, and a fine was issued';
    else raise exception 'FAIL: %', r; end if;

  select current_streak, misses_count into v_streak, v_misses from public.pool_members
   where pool_id='b8007001-0000-4000-a000-00000000700a' and user_id='b8000000-0000-4000-a000-000000000a01';
  if v_streak = 0 and v_misses = 1
    then raise notice 'PASS: the faked streak is gone (7 → 0) and the miss is counted';
    else raise exception 'FAIL: streak=% misses=%', v_streak, v_misses; end if;

  select count(*) into n from public.transactions
   where pool_id='b8007001-0000-4000-a000-00000000700a'
     and user_id='b8000000-0000-4000-a000-000000000a01' and transaction_type='fine';
  if n = 1 then raise notice 'PASS: exactly one ₹99 fine queued';
  else raise exception 'FAIL: % fines', n; end if;

  select count(*) into n from public.reports
   where check_in_id='b8c10001-0000-4000-a000-0000000c1001' and status='upheld';
  if n = 3 then raise notice 'PASS: all 3 reporters vindicated';
  else raise exception 'FAIL: % upheld', n; end if;

  select count(*) into n from public.moderation_queue() where id='b8c10001-0000-4000-a000-0000000c1001';
  if n = 0 then raise notice 'PASS: it leaves the queue';
  else raise exception 'FAIL: still queued'; end if;
end $$;

\echo '=== TEST 7: upholding cannot double-charge alongside the CRON ==='
do $$
declare n integer; r jsonb;
begin
  -- The nightly engine uses the same idempotency key for that member-day.
  r := public.review_check_in('b8c10001-0000-4000-a000-0000000c1001','upheld','second look');
  select count(*) into n from public.transactions
   where pool_id='b8007001-0000-4000-a000-00000000700a'
     and user_id='b8000000-0000-4000-a000-000000000a01' and transaction_type='fine';
  if n = 1 then raise notice 'PASS: reviewing twice still leaves exactly one fine';
  else raise exception 'FAIL: % fines after a second review', n; end if;
end $$;

\echo '=== TEST 8: the accused is told, and it is written down ==='
-- Read this one with RLS off: as the moderator we would (correctly) not be
-- able to see another user's notification row at all.
reset role;
do $$
declare n integer; v_note text; v_critical boolean;
begin
  select count(*) into n from public.notifications
   where user_id='b8000000-0000-4000-a000-000000000a01' and type='moderation_verdict';
  if n >= 1 then raise notice 'PASS: the accused is notified of the verdict';
  else raise exception 'FAIL: no notification'; end if;

  -- And it must be a type that quiet hours and the daily cap cannot swallow:
  -- this verdict costs a streak and a fine, so it is money, not social chatter.
  select is_critical into v_critical from public.notification_types
   where type = 'moderation_verdict';
  if v_critical then raise notice 'PASS: the verdict is critical, so quiet hours cannot eat it';
  else raise exception 'FAIL: a fine notification can be silently dropped'; end if;

  select note into v_note from public.moderation_actions
   where target_id='b8c10001-0000-4000-a000-0000000c1001' order by created_at limit 1;
  if v_note like '%Reverse image search%'
    then raise notice 'PASS: the moderator, the verdict and the reason are on the record';
    else raise exception 'FAIL: note=%', v_note; end if;
end $$;

-- ...and the person it is about can actually read it through their own API.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b8000000-0000-4000-a000-000000000a01","role":"authenticated"}',true);
do $$
declare n integer;
begin
  select count(*) into n from public.my_notifications(50) e
   where e.type = 'moderation_verdict';
  if n >= 1 then raise notice 'PASS: the accused can read the verdict in their own inbox';
  else raise exception 'FAIL: the verdict is invisible to the person it is about'; end if;
end $$;

\echo '=== TEST 9: CLEARED — restored, and false reporters start paying ==='
reset role;
insert into public.check_ins (id, user_id, pool_id, image_path, client_captured_at, checkin_date)
values ('b8c10002-0000-4000-a000-0000000c1002','b8000000-0000-4000-a000-000000000b01',
        'b8007001-0000-4000-a000-00000000700a',
        'b8007001/r/real.jpg', now(), (now() at time zone 'Asia/Kolkata')::date - 1);
-- Four earlier wrong reports by this person, so this clearing is their fifth.
-- They have to be four DIFFERENT check-ins: reports_checkin_once already stops
-- anyone reporting the same check-in twice.
insert into public.check_ins (id, user_id, pool_id, image_path, client_captured_at, checkin_date)
select ('b8c1100' || i || '-0000-4000-a000-0000000c110' || i)::uuid,
       'b8000000-0000-4000-a000-000000000b01',
       'b8007001-0000-4000-a000-00000000700a',
       'b8007001/r/old' || i || '.jpg', now(),
       (now() at time zone 'Asia/Kolkata')::date - (5 + i)
from generate_series(1,4) i;

insert into public.reports (reporter_id, check_in_id, reason, status, resolved_at)
select 'b8000000-0000-4000-a000-000000000c01',
       ('b8c1100' || i || '-0000-4000-a000-0000000c110' || i)::uuid,
       'spam', 'cleared', now()
from generate_series(1,4) i;
insert into public.reports (reporter_id, check_in_id, reason) values
 ('b8000000-0000-4000-a000-000000000c01','b8c10002-0000-4000-a000-0000000c1002','not_real_photo');
update public.check_ins set is_verified = false where id='b8c10002-0000-4000-a000-0000000c1002';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare r jsonb; v_verified boolean; v_susp timestamptz;
begin
  r := public.review_check_in('b8c10002-0000-4000-a000-0000000c1002','cleared','Photo is clearly original.');
  if (r->>'ok')::boolean then raise notice 'PASS: cleared';
  else raise exception 'FAIL: %', r; end if;

  select is_verified into v_verified from public.check_ins where id='b8c10002-0000-4000-a000-0000000c1002';
  if v_verified then raise notice 'PASS: the check-in is restored';
  else raise exception 'FAIL: still hidden'; end if;

  select reporting_suspended_until into v_susp from public.users
   where id='b8000000-0000-4000-a000-000000000c01';
  if v_susp > now() + interval '29 days'
    then raise notice 'PASS: 5 wrong reports → reporting suspended for 30 days';
    else raise exception 'FAIL: suspension=%', v_susp; end if;

  if not authz.reporting_allowed('b8000000-0000-4000-a000-000000000c01')
    then raise notice 'PASS: authz.reporting_allowed() finally fires — it had never been written to';
    else raise exception 'FAIL: still allowed to report'; end if;
end $$;

\echo '=== TEST 10: suspending a user, and never yourself ==='
do $$
declare r jsonb; v_until timestamptz;
begin
  r := public.suspend_user('5eed0000-0000-4000-a000-000000000001', 7);
  if r->>'error' = 'cannot_suspend_self' then raise notice 'PASS: an admin cannot suspend themselves';
  else raise exception 'FAIL: %', r; end if;

  r := public.suspend_user('b8000000-0000-4000-a000-000000000a01', 7, 'repeat faking');
  if (r->>'ok')::boolean then raise notice 'PASS: the cheat is suspended for 7 days';
  else raise exception 'FAIL: %', r; end if;

  select suspended_until into v_until from public.users where id='b8000000-0000-4000-a000-000000000a01';
  if v_until > now() + interval '6 days' then raise notice 'PASS: suspension recorded on the user';
  else raise exception 'FAIL: %', v_until; end if;
end $$;

\echo '=== TEST 11: stats tell an admin how deep the queue is ==='
do $$
declare s jsonb;
begin
  s := public.moderation_stats();
  if (s->>'actions_7d')::int >= 3 and s ? 'open_disputes' and s ? 'overdue'
    then raise notice 'PASS: stats = %', s;
    else raise exception 'FAIL: %', s; end if;
end $$;

\echo '=== TEST 12: moderation writes are capability-gated, not role-gated ==='
do $$
declare v boolean;
begin
  select has_function_privilege('authenticated','public.review_check_in(uuid,text,text)','execute') into v;
  if v then raise notice 'PASS: review_check_in is callable but checks the capability inside';
  else raise exception 'FAIL: grant missing'; end if;

  -- TEST 2 already proved a capability-less caller is refused at runtime,
  -- which is the model: grants allow the call, authz decides the outcome.
  select has_table_privilege('authenticated','public.moderation_actions','insert') into v;
  if not v then raise notice 'PASS: the audit log cannot be written by a client directly';
  else raise exception 'FAIL: clients can forge audit rows'; end if;
end $$;

rollback;
\echo 'MODERATION TESTS COMPLETE — rolled back'
