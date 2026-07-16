-- ============================================================================
-- CONQR · Local development seed — applied by `supabase db reset` ONLY.
-- Never pushed to staging/production (db push ignores seed.sql).
-- ----------------------------------------------------------------------------
-- Personas: avanish (dev admin+ops), priya (7-day streak hero), rahul (social),
-- sneha (pending pool), arjun (spectator), kabir (delinquent cautionary tale),
-- meera (verified creator running a public pool).
-- All financial rows respect the same invariants the CRON will maintain:
-- pot = SUM(succeeded deposits+fines), idempotency keys pool:user:date:type.
-- ============================================================================

-- ── Auth users (trigger auto-creates profile skeletons) ─────────────────────
insert into auth.users (id, phone) values
  ('5eed0000-0000-4000-a000-000000000001', '919800000001'),  -- avanish
  ('5eed0000-0000-4000-a000-000000000002', '919800000002'),  -- priya
  ('5eed0000-0000-4000-a000-000000000003', '919800000003'),  -- rahul
  ('5eed0000-0000-4000-a000-000000000004', '919800000004'),  -- sneha
  ('5eed0000-0000-4000-a000-000000000005', '919800000005'),  -- arjun
  ('5eed0000-0000-4000-a000-000000000006', '919800000006'),  -- kabir
  ('5eed0000-0000-4000-a000-000000000007', '919800000007');  -- meera

-- Complete their onboarding (what the profile-setup screen will do).
update public.users set username = 'avanish',  display_name = 'Avanish Jha',    onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000001';
update public.users set username = 'priya_s',  display_name = 'Priya Sharma',   onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000002';
update public.users set username = 'rahul_v',  display_name = 'Rahul Verma',    onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000003';
update public.users set username = 'sneha_k',  display_name = 'Sneha Kulkarni', onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000004';
update public.users set username = 'arjun_m',  display_name = 'Arjun Mehta',    onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000005';
update public.users set username = 'kabir_x',  display_name = 'Kabir Singh',    onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000006';
update public.users set username = 'meera_fit', display_name = 'Meera Nair', is_creator = true, onboarded_at = now() where id = '5eed0000-0000-4000-a000-000000000007';

-- Dev admin bootstrap: avanish gets admin + operations.
insert into authz.user_roles (user_id, role_key) values
  ('5eed0000-0000-4000-a000-000000000001', 'admin'),
  ('5eed0000-0000-4000-a000-000000000001', 'operations'),
  ('5eed0000-0000-4000-a000-000000000007', 'creator');

-- ════════════════════════════════════════════════════════════════════════════
-- Pool 1 · "75 Hard Boyz" — PRIVATE, ACTIVE, day 5 of 30. The main demo pool.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.pools (id, name, description, emoji, creator_id, challenge_type,
                          start_date, end_date, status, visibility, buy_in_amount, fine_amount,
                          elimination_threshold, total_pot)
values ('900d0001-0000-4000-a000-000000000001', '75 Hard Boyz',
        'No excuses. Photo daily ya ₹99 pot mein.', '🔥',
        '5eed0000-0000-4000-a000-000000000001', '75_hard',
        now() - interval '5 days', now() + interval '25 days', 'active', 'private',
        499, 99, 5,
        2095);  -- = 4 deposits × ₹499 + kabir's one succeeded ₹99 fine (see below)

insert into public.pool_members (user_id, pool_id, status, current_streak, longest_streak,
                                 fines_paid, misses_count, compliance_pct, joined_at) values
  ('5eed0000-0000-4000-a000-000000000001', '900d0001-0000-4000-a000-000000000001', 'active', 5, 5, 0, 0, 100.0, now() - interval '6 days'),
  ('5eed0000-0000-4000-a000-000000000002', '900d0001-0000-4000-a000-000000000001', 'active', 5, 5, 0, 0, 100.0, now() - interval '6 days'),
  ('5eed0000-0000-4000-a000-000000000003', '900d0001-0000-4000-a000-000000000001', 'active', 2, 3, 0, 1, 80.0,  now() - interval '6 days'),
  ('5eed0000-0000-4000-a000-000000000006', '900d0001-0000-4000-a000-000000000001', 'delinquent', 0, 2, 99, 3, 40.0, now() - interval '6 days');

-- Buy-ins (day -6) + kabir's fines: one collected, one written off after 3 retries.
insert into public.transactions (user_id, pool_id, amount, transaction_type, status,
                                 idempotency_key, razorpay_payment_id, settled_at, created_at, retry_count, failure_reason) values
  ('5eed0000-0000-4000-a000-000000000001', '900d0001-0000-4000-a000-000000000001', 499, 'deposit', 'succeeded',
   '900d0001:5eed0001:2026-07-09:deposit', 'pay_seed_dep1', now() - interval '6 days', now() - interval '6 days', 0, null),
  ('5eed0000-0000-4000-a000-000000000002', '900d0001-0000-4000-a000-000000000001', 499, 'deposit', 'succeeded',
   '900d0001:5eed0002:2026-07-09:deposit', 'pay_seed_dep2', now() - interval '6 days', now() - interval '6 days', 0, null),
  ('5eed0000-0000-4000-a000-000000000003', '900d0001-0000-4000-a000-000000000001', 499, 'deposit', 'succeeded',
   '900d0001:5eed0003:2026-07-09:deposit', 'pay_seed_dep3', now() - interval '6 days', now() - interval '6 days', 0, null),
  ('5eed0000-0000-4000-a000-000000000006', '900d0001-0000-4000-a000-000000000001', 499, 'deposit', 'succeeded',
   '900d0001:5eed0006:2026-07-09:deposit', 'pay_seed_dep4', now() - interval '6 days', now() - interval '6 days', 0, null),
  ('5eed0000-0000-4000-a000-000000000006', '900d0001-0000-4000-a000-000000000001', 99, 'fine', 'succeeded',
   '900d0001:5eed0006:2026-07-12:fine', 'pay_seed_fine1', now() - interval '3 days', now() - interval '3 days', 1, null),
  ('5eed0000-0000-4000-a000-000000000006', '900d0001-0000-4000-a000-000000000001', 99, 'fine', 'written_off',
   '900d0001:5eed0006:2026-07-13:fine', null, null, now() - interval '2 days', 3, 'BAD_REQUEST_ERROR: insufficient balance');

-- Yesterday's + today's check-ins for the streak holders.
insert into public.check_ins (user_id, pool_id, image_path, caption, blur_score, client_captured_at, checkin_date, created_at) values
  ('5eed0000-0000-4000-a000-000000000001', '900d0001-0000-4000-a000-000000000001',
   '900d0001-0000-4000-a000-000000000001/5eed0000-0000-4000-a000-000000000001/day5.jpg',
   'Day 5. Subah 6 baje. 🏋️', 0.12, now() - interval '3 hours', (now() at time zone 'Asia/Kolkata')::date, now() - interval '3 hours'),
  ('5eed0000-0000-4000-a000-000000000002', '900d0001-0000-4000-a000-000000000001',
   '900d0001-0000-4000-a000-000000000001/5eed0000-0000-4000-a000-000000000002/day5.jpg',
   '5km done before sunrise 🌅', 0.08, now() - interval '5 hours', (now() at time zone 'Asia/Kolkata')::date, now() - interval '5 hours'),
  ('5eed0000-0000-4000-a000-000000000002', '900d0001-0000-4000-a000-000000000001',
   '900d0001-0000-4000-a000-000000000001/5eed0000-0000-4000-a000-000000000002/day4.jpg',
   'Day 4 ✅', 0.15, now() - interval '1 day 4 hours', (now() at time zone 'Asia/Kolkata')::date - 1, now() - interval '1 day 4 hours'),
  ('5eed0000-0000-4000-a000-000000000003', '900d0001-0000-4000-a000-000000000001',
   '900d0001-0000-4000-a000-000000000001/5eed0000-0000-4000-a000-000000000003/day5.jpg',
   'wapas aa gaya 💪', 0.22, now() - interval '1 hour', (now() at time zone 'Asia/Kolkata')::date, now() - interval '1 hour');

-- Reactions + a comment thread on priya's check-in today.
insert into public.reactions (check_in_id, user_id, reaction_type)
select ci.id, '5eed0000-0000-4000-a000-000000000001', 'fire'
from public.check_ins ci
where ci.user_id = '5eed0000-0000-4000-a000-000000000002'
  and ci.checkin_date = (now() at time zone 'Asia/Kolkata')::date;

insert into public.reactions (check_in_id, user_id, reaction_type)
select ci.id, '5eed0000-0000-4000-a000-000000000003', 'respect'
from public.check_ins ci
where ci.user_id = '5eed0000-0000-4000-a000-000000000002'
  and ci.checkin_date = (now() at time zone 'Asia/Kolkata')::date;

insert into public.comments (check_in_id, user_id, body)
select ci.id, '5eed0000-0000-4000-a000-000000000003', 'machine ho yaar 🔥'
from public.check_ins ci
where ci.user_id = '5eed0000-0000-4000-a000-000000000002'
  and ci.checkin_date = (now() at time zone 'Asia/Kolkata')::date;

-- Feed events: pool start, kabir's shame trail, priya's 5-day run is building.
insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata) values
  ('900d0001-0000-4000-a000-000000000001', null, 'pool_started',
   ((now() - interval '5 days') at time zone 'Asia/Kolkata')::date, '{"members": 4, "pot": 1996}'),
  ('900d0001-0000-4000-a000-000000000001', '5eed0000-0000-4000-a000-000000000006', 'missed_day',
   ((now() - interval '3 days') at time zone 'Asia/Kolkata')::date, '{"miss_number": 1}'),
  ('900d0001-0000-4000-a000-000000000001', '5eed0000-0000-4000-a000-000000000006', 'fine_issued',
   ((now() - interval '3 days') at time zone 'Asia/Kolkata')::date, '{"amount": 99, "pot_after": 2095}'),
  ('900d0001-0000-4000-a000-000000000001', '5eed0000-0000-4000-a000-000000000003', 'missed_day',
   ((now() - interval '2 days') at time zone 'Asia/Kolkata')::date, '{"miss_number": 1}');

-- ════════════════════════════════════════════════════════════════════════════
-- Pool 2 · "Subah 5 Baje Club" — PUBLIC, PENDING, starts in 2 days.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.pools (id, name, description, emoji, creator_id, challenge_type,
                          start_date, end_date, status, visibility, buy_in_amount, fine_amount)
values ('900d0002-0000-4000-a000-000000000002', 'Subah 5 Baje Club',
        'Wake up at 5 AM. Photo proof with timestamp.', '⏰',
        '5eed0000-0000-4000-a000-000000000004', 'custom',
        now() + interval '2 days', now() + interval '23 days', 'pending', 'public', 199, 49);

insert into public.pool_members (user_id, pool_id, status) values
  ('5eed0000-0000-4000-a000-000000000004', '900d0002-0000-4000-a000-000000000002', 'pending'),
  ('5eed0000-0000-4000-a000-000000000002', '900d0002-0000-4000-a000-000000000002', 'pending');

-- ════════════════════════════════════════════════════════════════════════════
-- Pool 3 · "No Sugar Squad" — PUBLIC, ACTIVE, CREATOR pool by meera.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.pools (id, name, description, emoji, creator_id, challenge_type,
                          start_date, end_date, status, visibility, buy_in_amount, fine_amount,
                          is_creator_pool, total_pot)
values ('900d0003-0000-4000-a000-000000000003', 'No Sugar Squad',
        'Meera''s 21-day no sugar challenge. Meetha chhodo, paisa jeeto.', '🍬',
        '5eed0000-0000-4000-a000-000000000007', 'no_sugar',
        now() - interval '1 day', now() + interval '20 days', 'active', 'public',
        99, 25, true,
        198);  -- 2 deposits × ₹99

insert into public.pool_members (user_id, pool_id, status, current_streak, longest_streak, compliance_pct) values
  ('5eed0000-0000-4000-a000-000000000007', '900d0003-0000-4000-a000-000000000003', 'active', 1, 1, 100.0),
  ('5eed0000-0000-4000-a000-000000000005', '900d0003-0000-4000-a000-000000000003', 'active', 1, 1, 100.0);

insert into public.transactions (user_id, pool_id, amount, transaction_type, status, idempotency_key, razorpay_payment_id, settled_at) values
  ('5eed0000-0000-4000-a000-000000000007', '900d0003-0000-4000-a000-000000000003', 99, 'deposit', 'succeeded',
   '900d0003:5eed0007:2026-07-13:deposit', 'pay_seed_dep5', now() - interval '1 day'),
  ('5eed0000-0000-4000-a000-000000000005', '900d0003-0000-4000-a000-000000000003', 99, 'deposit', 'succeeded',
   '900d0003:5eed0005:2026-07-13:deposit', 'pay_seed_dep6', now() - interval '1 day');

-- rahul watches meera's pool as a spectator.
insert into public.pool_spectators (pool_id, user_id) values
  ('900d0003-0000-4000-a000-000000000003', '5eed0000-0000-4000-a000-000000000003');

-- ── XP ledger + caches (as the CRON/award engine would maintain them) ───────
insert into public.xp_events (user_id, amount, reason, pool_id) values
  ('5eed0000-0000-4000-a000-000000000001', 50, 'check_in_streak', '900d0001-0000-4000-a000-000000000001'),
  ('5eed0000-0000-4000-a000-000000000002', 50, 'check_in_streak', '900d0001-0000-4000-a000-000000000001'),
  ('5eed0000-0000-4000-a000-000000000002', 10, 'early_bird_bonus', '900d0001-0000-4000-a000-000000000001'),
  ('5eed0000-0000-4000-a000-000000000003', 30, 'check_in_streak', '900d0001-0000-4000-a000-000000000001'),
  ('5eed0000-0000-4000-a000-000000000003', 4,  'reactions_given', null);

update public.users u set xp = coalesce((select sum(x.amount) from public.xp_events x where x.user_id = u.id), 0);

-- ── Notifications (inbox samples) ───────────────────────────────────────────
insert into public.notifications (user_id, type, channel, title, body, dedup_key, status, sent_at) values
  ('5eed0000-0000-4000-a000-000000000003', 'reminder_3h', 'push',
   '🚨 3 ghante bache!', 'Pot: ₹2,095. Miss mat kar.', 'reminder_3h:900d0001:5eed0003:seed', 'sent', now() - interval '4 hours'),
  ('5eed0000-0000-4000-a000-000000000006', 'fine_charged', 'whatsapp',
   '💸 Aaj miss', '₹99 pot mein gaya. Streak reset.', 'fine:900d0001:5eed0006:seed', 'sent', now() - interval '3 days');

-- ── CRON observability samples ──────────────────────────────────────────────
insert into public.cron_runs (job_name, status, started_at, finished_at, pools_processed, members_processed, fines_issued) values
  ('process-checkins', 'succeeded', now() - interval '1 day', now() - interval '1 day' + interval '2 seconds', 2, 6, 1),
  ('process-checkins', 'succeeded', now() - interval '2 hours', now() - interval '2 hours' + interval '1 second', 2, 6, 0),
  ('activate-pools',   'succeeded', now() - interval '1 hour', now() - interval '1 hour' + interval '1 second', 0, 0, 0);
