-- ============================================================================
-- CONQR NOTIFICATIONS — TESTS (F6.3 / F8.1 / F8.2)
-- The rules engine decides whether someone is warned before losing money.
-- Over-suppression costs them cash; under-suppression costs their goodwill.
-- All work is rolled back.
-- ============================================================================
\set ON_ERROR_STOP on
begin;

insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id,'authenticated','authenticated',u.phone, now(),'','','','','','','','','',
  '{"provider":"phone","providers":["phone"]}','{}', now(), now()
from (values ('f5000000-0000-4000-a000-000000000001'::uuid,'918900000001'),
             ('f5000000-0000-4000-a000-000000000002'::uuid,'918900000002')) as u(id,phone);

update public.users set push_token = 'ExponentPushToken[test-device-1]'
 where id = 'f5000000-0000-4000-a000-000000000001';

insert into public.pools (id,name,emoji,creator_id,challenge_type,start_date,end_date,
  check_in_deadline_utc,buy_in_amount,fine_amount,status,invite_code,timezone)
values ('f5007001-0000-4000-a000-00000000700a','Reminder Pool','🔔','f5000000-0000-4000-a000-000000000001',
  'custom', now()-interval '5 days', now()+interval '25 days', 18, 500, 99, 'active','RMD001','Asia/Kolkata');
insert into public.pool_members (user_id,pool_id,status,grace_tokens) values
 ('f5000000-0000-4000-a000-000000000001','f5007001-0000-4000-a000-00000000700a','active',0),
 ('f5000000-0000-4000-a000-000000000002','f5007001-0000-4000-a000-00000000700a','active',0);

-- Quiet hours off for the fixture users (start == end disables the window),
-- so TEST 1-3 do not depend on what time the suite happens to run.
insert into public.notification_prefs (user_id, quiet_start_hour, quiet_end_hour) values
 ('f5000000-0000-4000-a000-000000000001', 0, 0),
 ('f5000000-0000-4000-a000-000000000002', 0, 0)
on conflict (user_id) do update set quiet_start_hour = 0, quiet_end_hour = 0;

-- The reminder job scans every active pool, seeded ones included, so assertions
-- count rows for THIS pool rather than trusting the run totals.

\echo '=== TEST 1: the T-3h nudge goes to people who have not checked in ==='
do $$
declare r jsonb; v_body text;
begin
  r := public.send_due_reminders(3);   -- force "3 hours left"
  if (select count(*) from public.notifications
       where type='reminder_3h'
         and user_id in ('f5000000-0000-4000-a000-000000000001','f5000000-0000-4000-a000-000000000002')) = 2
    then raise notice 'PASS: both members of this pool nudged at T-3h';
    else raise exception 'FAIL: %', r; end if;

  select body into v_body from public.notifications where type='reminder_3h'
   and user_id='f5000000-0000-4000-a000-000000000001' limit 1;
  if v_body like '%Three hours left%' and v_body like '%₹99%'
    then raise notice 'PASS: the nudge states the time left and the amount at stake';
    else raise exception 'FAIL body: %', v_body; end if;
end $$;

\echo '=== TEST 2: nobody is nudged twice for the same day ==='
do $$
declare r jsonb; n integer;
begin
  r := public.send_due_reminders(3);
  select count(*) into n from public.notifications where type='reminder_3h'
   and user_id in ('f5000000-0000-4000-a000-000000000001','f5000000-0000-4000-a000-000000000002');
  if n = 2 and (r->>'reminder_3h')::int = 0
    then raise notice 'PASS: re-running sends nothing new (still % notifications)', n;
    else raise exception 'FAIL: n=% r=%', n, r; end if;
end $$;

\echo '=== TEST 3: checking in stops the reminders ==='
do $$
declare r jsonb; n integer;
begin
  insert into public.check_ins (user_id, pool_id, image_path, client_captured_at, checkin_date)
  values ('f5000000-0000-4000-a000-000000000001','f5007001-0000-4000-a000-00000000700a',
          'p/u/done.jpg', now(), (now() at time zone 'Asia/Kolkata')::date);

  r := public.send_due_reminders(1);   -- the T-1h warning
  select count(*) into n from public.notifications
   where type='reminder_1h' and user_id='f5000000-0000-4000-a000-000000000001';
  if n = 0 then raise notice 'PASS: the member who checked in gets no final warning';
  else raise exception 'FAIL: warned anyway'; end if;

  select count(*) into n from public.notifications
   where type='reminder_1h' and user_id='f5000000-0000-4000-a000-000000000002';
  if n = 1 then raise notice 'PASS: the member who has not still gets warned';
  else raise exception 'FAIL: % warnings', n; end if;
end $$;

\echo '=== TEST 4: THE QUIET-HOURS CONFLICT — the final warning must land ==='
do $$
declare v_id uuid; v_crit boolean;
begin
  -- The T-1h warning for a 23:30 deadline arrives at 22:30, inside the
  -- spec's 22:00-07:00 quiet window. It is transactional, so it must still go.
  select is_critical into v_crit from public.notification_types where type='reminder_1h';
  if v_crit then raise notice 'PASS: reminder_1h is marked critical, so quiet hours cannot suppress it';
  else raise exception 'FAIL: the final warning would be silently dropped at 22:30'; end if;

  -- A social notification in the same minute IS suppressed.
  update public.notification_prefs set quiet_start_hour = 0, quiet_end_hour = 23
    where user_id = 'f5000000-0000-4000-a000-000000000002';
  insert into public.notification_prefs (user_id, quiet_start_hour, quiet_end_hour)
  values ('f5000000-0000-4000-a000-000000000002', 0, 23)
  on conflict (user_id) do update set quiet_start_hour = 0, quiet_end_hour = 23;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000002','reaction',
                                    'Someone reacted','🔥 on your check-in');
  if v_id is null then raise notice 'PASS: a social notification inside quiet hours is suppressed';
  else raise exception 'FAIL: social notification sent during quiet hours'; end if;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000002','pre_debit',
                                    'Debit coming','₹99 tomorrow');
  if v_id is not null then raise notice 'PASS: an RBI pre-debit notice is never suppressed';
  else raise exception 'FAIL: a legally required notice was suppressed'; end if;
end $$;

\echo '=== TEST 5: the daily cap holds, but money always gets through ==='
do $$
declare v_id uuid; v_sent integer := 0; i integer;
begin
  delete from public.notifications where user_id='f5000000-0000-4000-a000-000000000001';
  -- Quiet hours off, so this measures the CAP and not the clock.
  insert into public.notification_prefs (user_id, quiet_start_hour, quiet_end_hour)
  values ('f5000000-0000-4000-a000-000000000001', 0, 0)
  on conflict (user_id) do update set quiet_start_hour = 0, quiet_end_hour = 0,
    push_enabled = true, social_enabled = true, reminders_enabled = true;

  for i in 1..8 loop
    v_id := public.queue_notification('f5000000-0000-4000-a000-000000000001','reaction',
                                      'Reaction '||i, 'body', '{}'::jsonb, 'cap-test-'||i);
    if v_id is not null then v_sent := v_sent + 1; end if;
  end loop;

  if v_sent = 4 then raise notice 'PASS: push capped at 4 a day (8 attempted, 4 queued)';
  else raise exception 'FAIL: % got through', v_sent; end if;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000001','fine_charged',
                                    'Charged','₹99 taken', '{}'::jsonb, 'cap-test-money');
  if v_id is not null then raise notice 'PASS: a money notification ignores the cap';
  else raise exception 'FAIL: a charge notification was capped away'; end if;
end $$;

\echo '=== TEST 6: per-category opt-out, except money ==='
do $$
declare v_id uuid;
begin
  delete from public.notifications where user_id='f5000000-0000-4000-a000-000000000001';
  -- Quiet hours off again, so suppression here is provably the OPT-OUT.
  insert into public.notification_prefs (user_id, social_enabled, reminders_enabled, push_enabled,
                                         quiet_start_hour, quiet_end_hour)
  values ('f5000000-0000-4000-a000-000000000001', false, false, false, 0, 0)
  on conflict (user_id) do update set social_enabled=false, reminders_enabled=false,
    push_enabled=false, quiet_start_hour=0, quiet_end_hour=0;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000001','reaction','x','y');
  if v_id is null then raise notice 'PASS: social opt-out respected';
  else raise exception 'FAIL: social sent despite opt-out'; end if;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000001','reminder_3h','x','y');
  if v_id is null then raise notice 'PASS: reminder opt-out respected';
  else raise exception 'FAIL: reminder sent despite opt-out'; end if;

  v_id := public.queue_notification('f5000000-0000-4000-a000-000000000001','pre_debit','x','y');
  if v_id is not null then raise notice 'PASS: money notifications cannot be opted out of';
  else raise exception 'FAIL: a user silenced their own debit notice'; end if;
end $$;

\echo '=== TEST 7: dispatch sends what is queued, and handles a missing token ==='
do $$
declare r jsonb; v_status text;
begin
  delete from public.notification_prefs;
  delete from public.notifications;

  perform public.queue_notification('f5000000-0000-4000-a000-000000000001','fine_charged',
                                    'Charged','₹99 taken','{}'::jsonb,'dispatch-1');
  perform public.queue_notification('f5000000-0000-4000-a000-000000000002','fine_charged',
                                    'Charged','₹99 taken','{}'::jsonb,'dispatch-2');

  r := public.dispatch_notifications();
  if (r->>'sent')::int = 1 and (r->>'no_token')::int = 1
    then raise notice 'PASS: 1 sent to a registered device, 1 marked failed for having no token';
    else raise exception 'FAIL: %', r; end if;

  select status::text into v_status from public.notifications where dedup_key='dispatch-1';
  if v_status='sent' then raise notice 'PASS: the delivered one is marked sent';
  else raise exception 'FAIL: %', v_status; end if;

  select status::text into v_status from public.notifications where dedup_key='dispatch-2';
  if v_status='failed' then raise notice 'PASS: no token → failed, not retried forever';
  else raise exception 'FAIL: %', v_status; end if;
end $$;

\echo '=== TEST 8: a second dispatch does not resend ==='
do $$
declare r jsonb;
begin
  r := public.dispatch_notifications();
  if (r->>'sent')::int = 0 then raise notice 'PASS: nothing re-sent on a second pass';
  else raise exception 'FAIL: resent %', r; end if;
end $$;

\echo '=== TEST 9: F5.7 notices finally have a delivery path ==='
do $$
declare n integer;
begin
  delete from public.notifications;
  insert into public.transactions (id,user_id,pool_id,amount,transaction_type,status,idempotency_key,provider)
  values ('f5f10001-0000-4000-a000-00000000f001','f5000000-0000-4000-a000-000000000001',
          'f5007001-0000-4000-a000-00000000700a',99,'fine','pending','f5007001:notice:fine','simulator');

  perform public.issue_pre_debit_notices();

  select count(*) into n from public.notifications where type='pre_debit' and status='queued';
  if n = 1 then raise notice 'PASS: the RBI notice is queued as a real notification';
  else raise exception 'FAIL: % queued', n; end if;

  perform public.dispatch_notifications();
  select count(*) into n from public.notifications where type='pre_debit' and status='sent';
  if n = 1 then raise notice 'PASS: and it actually dispatches — F5.7 is no longer writing into a void';
  else raise exception 'FAIL: not dispatched'; end if;
end $$;

\echo '=== TEST 10: client surface is own-rows-only ==='
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$
declare n integer; v boolean; r jsonb;
begin
  select count(*) into n from public.my_notifications();
  if n >= 1 then raise notice 'PASS: a user can read their own notifications (%)', n;
  else raise exception 'FAIL: cannot read own'; end if;

  select count(*) into n from public.my_notifications()
   where id in (select id from public.notifications where user_id='f5000000-0000-4000-a000-000000000002');
  if n = 0 then raise notice 'PASS: another user''s notifications are invisible';
  else raise exception 'FAIL: leaked % rows', n; end if;

  r := public.register_push_token('ExponentPushToken[new-device]');
  if (r->>'ok')::boolean then raise notice 'PASS: a user can register their own push token';
  else raise exception 'FAIL: %', r; end if;

  select has_function_privilege('authenticated','public.queue_notification(uuid,text,text,text,jsonb,text,public.notification_channel)','execute') into v;
  if not v then raise notice 'PASS: clients cannot queue notifications to anyone';
  else raise exception 'FAIL: clients can send notifications'; end if;

  select has_function_privilege('authenticated','public.dispatch_notifications(integer)','execute') into v;
  if not v then raise notice 'PASS: clients cannot drive dispatch';
  else raise exception 'FAIL: client-callable dispatch'; end if;
end $$;

rollback;
\echo 'NOTIFICATION TESTS COMPLETE — rolled back'
