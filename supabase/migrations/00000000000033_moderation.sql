-- ============================================================================
-- CONQR · Migration 0033 · MODERATION (F11.3 + the moderation half of F11.4)
-- ----------------------------------------------------------------------------
-- F4.6 has been auto-flagging check-ins at three reports since it shipped and
-- NOTHING has ever reviewed one. A flagged check-in sits `is_verified = false`
-- forever: the reporter never learns the outcome, the accused is never told,
-- and the cheat keeps their streak.
--
-- The capabilities for all of this already existed in @conqr/authz and were
-- never resolved through by any code path:
--   moderation.queue.view · moderation.checkin.review ·
--   moderation.comment.review · moderation.user.suspend · admin.disputes.resolve
--
-- So did the columns: users.suspended_until, users.banned_at and
-- users.reporting_suspended_until — the last of which authz.reporting_allowed()
-- has been reading since migration 0007 while nothing ever wrote it.
--
-- TWO PRINCIPLES
--   1. Every moderation action records WHO did it and WHY, and nothing is
--      deletable. A judgement about someone's money must be auditable.
--   2. Upholding a report is a MISS, not just a hidden photo. The cheat loses
--      the streak they faked and is fined, which is the only reason reporting
--      is worth anyone's time.
-- ============================================================================

-- ── Disputes: the accused gets a say before a verdict costs them. ──────────
-- NOTE the name. `public.disputes` already exists from migration 0004 and is
-- a PAYMENT dispute ("I was charged wrongly"), keyed on transaction_id. This
-- is a different thing entirely — contesting a moderation verdict on a photo —
-- so it gets its own table rather than overloading that one. Both are covered
-- by the admin.disputes.resolve capability.
create table if not exists public.check_in_disputes (
  id            uuid primary key default gen_random_uuid(),
  check_in_id   uuid not null references public.check_ins (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  body          text not null check (char_length(btrim(body)) between 10 and 1000),
  status        public.dispute_status not null default 'open',
  resolved_by   uuid references public.users (id),
  resolver_note text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  -- One dispute per check-in. You get one explanation, not an appeal loop.
  unique (check_in_id)
);

alter table public.check_in_disputes enable row level security;

create policy check_in_disputes_select_own on public.check_in_disputes
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('moderation.queue.view', auth.uid()));

create index if not exists check_in_disputes_open_idx on public.check_in_disputes (status, created_at)
  where status = 'open';

-- ── An append-only record of every judgement. ─────────────────────────────
create table if not exists public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.users (id),
  action       text not null,
  target_type  text not null check (target_type in ('check_in','comment','user','dispute')),
  target_id    uuid not null,
  verdict      text,
  note         text,
  created_at   timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;

create policy moderation_actions_read on public.moderation_actions
  for select to authenticated
  using (authz.has_capability('moderation.queue.view', auth.uid()));

create index if not exists moderation_actions_target_idx
  on public.moderation_actions (target_type, target_id, created_at desc);

-- How long people get. Spec §11.3: 24h to dispute, 48h to review.
create table if not exists public.moderation_config (
  id                     boolean primary key default true check (id),
  dispute_window_hours   integer not null default 24 check (dispute_window_hours > 0),
  review_window_hours    integer not null default 48 check (review_window_hours > 0),
  false_reports_to_suspend integer not null default 5 check (false_reports_to_suspend > 0),
  reporter_suspension_days integer not null default 30 check (reporter_suspension_days > 0)
);
insert into public.moderation_config (id) values (true) on conflict (id) do nothing;

-- A moderation verdict is NOT the same as the nightly 'verdict' summary: this
-- one can reset a streak and issue a fine, so it is transactional and must
-- never be dropped by quiet hours or the daily cap. Found by the test suite —
-- the first version used the social type and vanished silently at 22:30.
insert into public.notification_types (type, is_critical, category, note) values
  ('moderation_verdict', true, 'money',
   'A moderator upheld or cleared reports on a check-in. Can cost a streak and a fine.')
on conflict (type) do nothing;
alter table public.moderation_config enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- THE QUEUE. Flagged check-ins and hidden comments, oldest first, with
-- everything a moderator needs to judge without leaving the row.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.moderation_queue(p_kind text default 'all')
returns table (
  kind text,
  id uuid,
  pool_id uuid,
  pool_name text,
  author_id uuid,
  author_name text,
  author_username text,
  content text,
  image_path text,
  liveness_prompt text,
  blur_score numeric,
  report_count integer,
  reasons text[],
  flagged_at timestamptz,
  has_dispute boolean,
  dispute_body text,
  dispute_deadline timestamptz,
  review_deadline timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.moderation_config where id)
  select * from (
    -- Check-ins the trigger flagged at 3 reports.
    select
      'check_in'::text,
      ci.id, ci.pool_id, p.name, ci.user_id, u.display_name, u.username,
      ci.caption, ci.image_path, ci.liveness_prompt, ci.blur_score,
      ci.reported_count,
      array(select distinct r.reason::text from public.reports r
             where r.check_in_id = ci.id and r.status = 'open'),
      ci.updated_at as flagged_at,
      exists (select 1 from public.check_in_disputes d where d.check_in_id = ci.id),
      (select d.body from public.check_in_disputes d where d.check_in_id = ci.id and d.status = 'open'),
      ci.updated_at + make_interval(hours => (select dispute_window_hours from cfg)),
      ci.updated_at + make_interval(hours => (select review_window_hours from cfg))
    from public.check_ins ci
    join public.pools p on p.id = ci.pool_id
    join public.users u on u.id = ci.user_id
    where ci.is_verified = false
      and exists (select 1 from public.reports r where r.check_in_id = ci.id and r.status = 'open')
      and (p_kind in ('all','check_in'))

    union all

    -- Comments the same trigger hid.
    select
      'comment'::text,
      c.id, ci.pool_id, p.name, c.user_id, u.display_name, u.username,
      c.body, null, null, null,
      (select count(*)::integer from public.reports r where r.comment_id = c.id and r.status = 'open'),
      array(select distinct r.reason::text from public.reports r
             where r.comment_id = c.id and r.status = 'open'),
      c.updated_at as flagged_at,
      false, null, null,
      c.updated_at + make_interval(hours => (select review_window_hours from cfg))
    from public.comments c
    join public.check_ins ci on ci.id = c.check_in_id
    join public.pools p on p.id = ci.pool_id
    join public.users u on u.id = c.user_id
    where c.is_hidden = true
      and exists (select 1 from public.reports r where r.comment_id = c.id and r.status = 'open')
      and (p_kind in ('all','comment'))
  ) q
  where authz.has_capability('moderation.queue.view', auth.uid())
  order by flagged_at asc;
$$;

revoke execute on function public.moderation_queue(text) from anon, public;
grant execute on function public.moderation_queue(text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Review a check-in.
--   upheld  — the report was right. The check-in was fake, so it becomes a
--             MISS: streak reset, miss counted, fine issued. Reporters are
--             vindicated.
--   cleared — the report was wrong. The check-in is restored and the
--             reporters move closer to losing the ability to report.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.review_check_in(
  p_check_in_id uuid,
  p_verdict text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_ci public.check_ins%rowtype;
  v_pool public.pools%rowtype;
  v_member public.pool_members%rowtype;
  v_cfg public.moderation_config%rowtype;
  v_key text;
  v_fined boolean := false;
  v_suspended integer := 0;
  r record;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not authz.has_capability('moderation.checkin.review', uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_verdict not in ('upheld', 'cleared') then
    return jsonb_build_object('ok', false, 'error', 'bad_verdict');
  end if;

  select * into v_ci from public.check_ins where id = p_check_in_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_cfg from public.moderation_config where id;
  select * into v_pool from public.pools where id = v_ci.pool_id;
  select * into v_member from public.pool_members
    where pool_id = v_ci.pool_id and user_id = v_ci.user_id for update;

  if p_verdict = 'upheld' then
    -- A faked check-in is a miss. Anything less and reporting is pointless.
    update public.check_ins
      set is_verified = false, updated_at = now()
      where id = v_ci.id;

    if v_member.user_id is not null then
      update public.pool_members
        set current_streak = 0,
            misses_count = v_member.misses_count + 1,
            updated_at = now()
        where pool_id = v_ci.pool_id and user_id = v_ci.user_id;
    end if;

    -- Fine them for the day they faked, on the same idempotency contract the
    -- CRON uses, so this can never double-charge alongside it.
    if coalesce(v_pool.fine_amount, 0) > 0 then
      v_key := v_ci.pool_id::text || ':' || v_ci.user_id::text || ':' || v_ci.checkin_date::text || ':fine';
      insert into public.transactions (user_id, pool_id, amount, transaction_type, status, idempotency_key)
      values (v_ci.user_id, v_ci.pool_id, v_pool.fine_amount, 'fine', 'pending', v_key)
      on conflict (idempotency_key) do nothing;
      v_fined := found;
    end if;

    update public.reports set status = 'upheld', resolved_by = uid, resolved_at = now()
      where check_in_id = v_ci.id and status = 'open';

    insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
    values (v_ci.pool_id, v_ci.user_id, 'missed_day', v_ci.checkin_date,
            jsonb_build_object('reason', 'check_in_rejected'))
    on conflict do nothing;

    perform public.queue_notification(
      v_ci.user_id, 'moderation_verdict', 'Your check-in was rejected',
      'A moderator reviewed your ' || to_char(v_ci.checkin_date, 'DD Mon') ||
      ' check-in in ' || v_pool.name || ' and upheld the reports. It counts as a miss.',
      jsonb_build_object('route', '/pool/' || v_ci.pool_id::text));

  else
    -- Cleared: restore it, and start counting against the reporters.
    update public.check_ins
      set is_verified = true, reported_count = 0, updated_at = now()
      where id = v_ci.id;

    for r in
      select reporter_id from public.reports
      where check_in_id = v_ci.id and status = 'open'
    loop
      update public.reports set status = 'cleared', resolved_by = uid, resolved_at = now()
        where check_in_id = v_ci.id and reporter_id = r.reporter_id and status = 'open';

      -- Five wrong reports and you lose the ability to report for 30 days.
      if (select count(*) from public.reports
            where reporter_id = r.reporter_id and status = 'cleared')
         >= v_cfg.false_reports_to_suspend
      then
        update public.users
          set reporting_suspended_until = now() + make_interval(days => v_cfg.reporter_suspension_days)
          where id = r.reporter_id
            and (reporting_suspended_until is null or reporting_suspended_until < now());
        if found then v_suspended := v_suspended + 1; end if;
      end if;
    end loop;

    perform public.queue_notification(
      v_ci.user_id, 'moderation_verdict', 'Your check-in was cleared',
      'The reports on your ' || to_char(v_ci.checkin_date, 'DD Mon') ||
      ' check-in were reviewed and dismissed. Nothing changes.',
      jsonb_build_object('route', '/pool/' || v_ci.pool_id::text));
  end if;

  -- Clearing the check-in means the accused was right, so their dispute is
  -- ACCEPTED; upholding the reports rejects it. (dispute_status is the enum
  -- from 0004: open | accepted | rejected.)
  update public.check_in_disputes
    set status = case when p_verdict = 'cleared' then 'accepted'::public.dispute_status
                      else 'rejected'::public.dispute_status end,
        resolved_by = uid, resolved_at = now(), resolver_note = p_note
    where check_in_id = v_ci.id and status = 'open';

  insert into public.moderation_actions (moderator_id, action, target_type, target_id, verdict, note)
  values (uid, 'review_check_in', 'check_in', v_ci.id, p_verdict, p_note);

  return jsonb_build_object(
    'ok', true, 'verdict', p_verdict, 'fined', v_fined,
    'reporters_suspended', v_suspended
  );
end;
$$;

revoke execute on function public.review_check_in(uuid, text, text) from anon, public;
grant execute on function public.review_check_in(uuid, text, text) to authenticated;

-- ── Comments: lighter, no money involved. ─────────────────────────────────
create or replace function public.review_comment(p_comment_id uuid, p_verdict text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not authz.has_capability('moderation.comment.review', uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_verdict not in ('upheld', 'cleared') then
    return jsonb_build_object('ok', false, 'error', 'bad_verdict');
  end if;

  update public.comments
    set is_hidden = (p_verdict = 'upheld'),
        deleted_at = case when p_verdict = 'upheld' then now() else null end,
        updated_at = now()
    where id = p_comment_id;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  update public.reports
    set status = case when p_verdict = 'upheld' then 'upheld'::public.report_status
                      else 'cleared'::public.report_status end,
        resolved_by = uid, resolved_at = now()
    where comment_id = p_comment_id and status = 'open';

  insert into public.moderation_actions (moderator_id, action, target_type, target_id, verdict)
  values (uid, 'review_comment', 'comment', p_comment_id, p_verdict);

  return jsonb_build_object('ok', true, 'verdict', p_verdict);
end;
$$;

revoke execute on function public.review_comment(uuid, text) from anon, public;
grant execute on function public.review_comment(uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- The accused's side. 24 hours from being flagged, and only your own.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.submit_dispute(p_check_in_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_ci public.check_ins%rowtype;
  v_cfg public.moderation_config%rowtype;
  v_id uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select * into v_ci from public.check_ins where id = p_check_in_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_ci.user_id <> uid then return jsonb_build_object('ok', false, 'error', 'not_yours'); end if;
  if v_ci.is_verified then return jsonb_build_object('ok', false, 'error', 'not_flagged'); end if;

  select * into v_cfg from public.moderation_config where id;
  if v_ci.updated_at + make_interval(hours => v_cfg.dispute_window_hours) < now() then
    return jsonb_build_object('ok', false, 'error', 'window_closed');
  end if;

  if length(btrim(coalesce(p_body, ''))) < 10 then
    return jsonb_build_object('ok', false, 'error', 'too_short');
  end if;

  insert into public.check_in_disputes (check_in_id, user_id, body)
  values (p_check_in_id, uid, btrim(p_body))
  on conflict (check_in_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'already_disputed');
  end if;

  return jsonb_build_object('ok', true, 'dispute_id', v_id);
end;
$$;

revoke execute on function public.submit_dispute(uuid, text) from anon, public;
grant execute on function public.submit_dispute(uuid, text) to authenticated;

-- ── What a user can see about their own flagged check-in. ─────────────────
create or replace function public.my_flagged_check_ins()
returns table (
  check_in_id uuid, pool_id uuid, pool_name text, checkin_date date,
  reported_count integer, can_dispute boolean, dispute_deadline timestamptz,
  dispute_status public.dispute_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select ci.id, ci.pool_id, p.name, ci.checkin_date, ci.reported_count,
         (not exists (select 1 from public.check_in_disputes d where d.check_in_id = ci.id))
           and ci.updated_at + make_interval(hours => (select dispute_window_hours from public.moderation_config where id)) > now(),
         ci.updated_at + make_interval(hours => (select dispute_window_hours from public.moderation_config where id)),
         (select d.status from public.check_in_disputes d where d.check_in_id = ci.id)
  from public.check_ins ci
  join public.pools p on p.id = ci.pool_id
  where ci.user_id = auth.uid() and ci.is_verified = false
  order by ci.updated_at desc;
$$;

revoke execute on function public.my_flagged_check_ins() from anon, public;
grant execute on function public.my_flagged_check_ins() to authenticated;

-- ── Suspending and banning. Separate capability, separate audit trail. ────
create or replace function public.suspend_user(p_user_id uuid, p_days integer, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not authz.has_capability('moderation.user.suspend', uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_user_id = uid then
    return jsonb_build_object('ok', false, 'error', 'cannot_suspend_self');
  end if;

  update public.users set suspended_until = now() + make_interval(days => greatest(p_days, 1))
    where id = p_user_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  insert into public.moderation_actions (moderator_id, action, target_type, target_id, verdict, note)
  values (uid, 'suspend_user', 'user', p_user_id, p_days::text || 'd', p_note);

  return jsonb_build_object('ok', true, 'until', now() + make_interval(days => greatest(p_days, 1)));
end;
$$;

revoke execute on function public.suspend_user(uuid, integer, text) from anon, public;
grant execute on function public.suspend_user(uuid, integer, text) to authenticated;

-- ── Queue depth, for the admin dashboard and the watchdog. ────────────────
create or replace function public.moderation_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not authz.has_capability('moderation.queue.view', auth.uid())
              then jsonb_build_object('error', 'forbidden')
  else jsonb_build_object(
    'open_check_ins', (select count(*) from public.check_ins ci
                        where ci.is_verified = false
                          and exists (select 1 from public.reports r
                                       where r.check_in_id = ci.id and r.status = 'open')),
    'open_comments',  (select count(*) from public.comments c
                        where c.is_hidden and exists (select 1 from public.reports r
                                       where r.comment_id = c.id and r.status = 'open')),
    'open_disputes',  (select count(*) from public.check_in_disputes where status = 'open'),
    'overdue',        (select count(*) from public.check_ins ci
                        where ci.is_verified = false
                          and ci.updated_at + make_interval(
                                hours => (select review_window_hours from public.moderation_config where id)) < now()
                          and exists (select 1 from public.reports r
                                       where r.check_in_id = ci.id and r.status = 'open')),
    'actions_7d',     (select count(*) from public.moderation_actions
                        where created_at > now() - interval '7 days')
  ) end;
$$;

revoke execute on function public.moderation_stats() from anon, public;
grant execute on function public.moderation_stats() to authenticated;
