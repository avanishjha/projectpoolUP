-- ============================================================================
-- CONQR · Migration 0030 · NOTIFICATIONS: reminders, rules, delivery
--   F6.3 send-reminders · F8.1 push delivery · F8.2 rules engine
-- ----------------------------------------------------------------------------
-- The engine judges, fines and collects correctly and tells nobody anything.
-- F5.7 has been queuing pre-debit notices into `notifications` since it
-- shipped and nothing has ever delivered one.
--
-- THREE PARTS, one door:
--   queue_notification()     every notification goes through here, so quiet
--                            hours, caps and dedup are impossible to forget
--   send_due_reminders()     hourly — the T-3h nudge and the T-1h warning
--   dispatch_notifications() every 2 min — queued rows to Expo Push
--
-- THE QUIET-HOURS CONFLICT (spec §9 says 22:00–07:00 IST):
-- the deadline is 23:30, so the T-1h final warning lands at 22:30 — inside
-- the quiet window. A message saying money is about to leave your account is
-- transactional, not marketing, so critical types carry an explicit bypass
-- and everything else obeys the window. The alternative was moving the final
-- warning earlier, which would make it useless.
-- ============================================================================

-- ── Per-user preferences. Absent row = sensible defaults. ──────────────────
create table if not exists public.notification_prefs (
  user_id            uuid primary key references public.users (id) on delete cascade,
  push_enabled       boolean not null default true,
  whatsapp_enabled   boolean not null default true,
  reminders_enabled  boolean not null default true,
  social_enabled     boolean not null default true,
  quiet_start_hour   integer not null default 22 check (quiet_start_hour between 0 and 23),
  quiet_end_hour     integer not null default 7  check (quiet_end_hour between 0 and 23),
  updated_at         timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy notification_prefs_own on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
create policy notification_prefs_update_own on public.notification_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_prefs_insert_own on public.notification_prefs
  for insert to authenticated with check (user_id = auth.uid());

-- Which notification types are transactional. These bypass quiet hours and
-- the daily cap, because suppressing them costs the user money.
create table if not exists public.notification_types (
  type            text primary key,
  is_critical     boolean not null default false,
  category        text not null default 'social'
                    check (category in ('reminder', 'money', 'social', 'system')),
  note            text
);

alter table public.notification_types enable row level security;

insert into public.notification_types (type, is_critical, category, note) values
  ('reminder_3h',      false, 'reminder', 'Three hours out. Can wait for morning.'),
  ('reminder_1h',      true,  'reminder', 'Final warning. Lands at 22:30, inside quiet hours, deliberately.'),
  ('pre_debit',        true,  'money',    'RBI notice. Legally required; never suppressed.'),
  ('fine_charged',     true,  'money',    'Money has left their account.'),
  ('payment_failed',   true,  'money',    'Action needed or they go delinquent.'),
  ('verdict',          false, 'social',   'Last night''s result.'),
  ('pool_started',     false, 'social',   null),
  ('reaction',         false, 'social',   null),
  ('comment',          false, 'social',   null)
on conflict (type) do nothing;

create index if not exists notifications_queued_idx
  on public.notifications (status, created_at) where status = 'queued';

-- ════════════════════════════════════════════════════════════════════════════
-- ONE DOOR IN. Applies prefs, quiet hours, caps and dedup in one place so no
-- future caller can bypass them by accident.
-- Returns the id when queued, null when suppressed.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.queue_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_dedup_key text default null,
  p_channel public.notification_channel default 'push'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_critical boolean;
  v_category text;
  v_prefs public.notification_prefs%rowtype;
  v_tz text;
  v_hour integer;
  v_in_quiet boolean;
  v_sent_today integer;
  v_cap integer;
  v_id uuid;
begin
  select is_critical, category into v_critical, v_category
    from public.notification_types where type = p_type;
  v_critical := coalesce(v_critical, false);
  v_category := coalesce(v_category, 'social');

  select * into v_prefs from public.notification_prefs where user_id = p_user_id;

  -- Per-category opt-outs. Money notifications are not opt-out-able: a user
  -- cannot choose not to be told their account is being debited.
  if v_prefs.user_id is not null then
    if p_channel = 'push' and not v_prefs.push_enabled and v_category <> 'money' then return null; end if;
    if p_channel = 'whatsapp' and not v_prefs.whatsapp_enabled and v_category <> 'money' then return null; end if;
    if v_category = 'reminder' and not v_prefs.reminders_enabled then return null; end if;
    if v_category = 'social' and not v_prefs.social_enabled then return null; end if;
  end if;

  -- Quiet hours, in the user's own timezone, skipped for critical types.
  if not v_critical then
    select coalesce(u.timezone, 'Asia/Kolkata') into v_tz
      from public.users u where u.id = p_user_id;
    v_hour := extract(hour from (now() at time zone coalesce(v_tz, 'Asia/Kolkata')))::integer;

    v_in_quiet := case
      when coalesce(v_prefs.quiet_start_hour, 22) <= coalesce(v_prefs.quiet_end_hour, 7)
        then v_hour >= coalesce(v_prefs.quiet_start_hour, 22)
         and v_hour <  coalesce(v_prefs.quiet_end_hour, 7)
      else v_hour >= coalesce(v_prefs.quiet_start_hour, 22)
        or  v_hour <  coalesce(v_prefs.quiet_end_hour, 7)
    end;

    if v_in_quiet then return null; end if;
  end if;

  -- Daily cap: 4 push, 2 WhatsApp. Critical types are exempt.
  if not v_critical then
    v_cap := case when p_channel = 'whatsapp' then 2 else 4 end;
    select count(*) into v_sent_today from public.notifications n
      where n.user_id = p_user_id and n.channel = p_channel
        and n.created_at > now() - interval '24 hours'
        and n.status <> 'failed';
    if v_sent_today >= v_cap then return null; end if;
  end if;

  insert into public.notifications (user_id, type, channel, title, body, data, dedup_key)
  values (p_user_id, p_type, p_channel, p_title, p_body, p_data, p_dedup_key)
  on conflict (dedup_key) where dedup_key is not null do nothing
  returning id into v_id;

  return v_id;  -- null when the dedup key already existed
end;
$$;

revoke execute on function public.queue_notification(uuid, text, text, text, jsonb, text, public.notification_channel)
  from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- F6.3 — the reminders. Hourly: who is about to lose money, and how soon.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.send_due_reminders(p_force_hours_left integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  m record;
  v_hours_left numeric;
  v_type text;
  v_title text;
  v_body text;
  v_id uuid;
  v_3h integer := 0;
  v_1h integer := 0;
  v_suppressed integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  insert into public.cron_runs (job_name, status)
  values ('send-reminders', 'running'::public.cron_run_status)
  returning id into v_run_id;

  for m in
    select pm.user_id, p.id as pool_id, p.name as pool_name, p.fine_amount,
           p.check_in_deadline_utc, p.timezone,
           (now() at time zone p.timezone)::date as pool_today
    from public.pool_members pm
    join public.pools p on p.id = pm.pool_id
    where p.status = 'active'
      and pm.status = 'active'
      and p.fine_amount > 0
      -- Only people who have not already done it today.
      and not exists (
        select 1 from public.check_ins ci
        where ci.pool_id = p.id and ci.user_id = pm.user_id
          and ci.checkin_date = (now() at time zone p.timezone)::date
      )
  loop
    begin
      -- Hours until tonight's deadline, wrapping past midnight UTC.
      v_hours_left := coalesce(
        p_force_hours_left,
        m.check_in_deadline_utc - (extract(hour from (now() at time zone 'UTC'))
                                   + extract(minute from (now() at time zone 'UTC')) / 60.0)
      );
      if v_hours_left < 0 then v_hours_left := v_hours_left + 24; end if;

      if v_hours_left > 2.5 and v_hours_left <= 3.5 then
        v_type := 'reminder_3h';
        v_title := m.pool_name;
        v_body := 'Three hours left to check in. ' || public.format_inr(m.fine_amount) ||
                  ' if you do not.';
      elsif v_hours_left > 0.5 and v_hours_left <= 1.5 then
        v_type := 'reminder_1h';
        v_title := 'One hour left';
        v_body := public.format_inr(m.fine_amount) || ' leaves your account tonight unless you check in to ' ||
                  m.pool_name || '.';
      else
        continue;
      end if;

      v_id := public.queue_notification(
        m.user_id, v_type, v_title, v_body,
        jsonb_build_object('route', '/checkin/' || m.pool_id::text, 'pool_id', m.pool_id),
        v_type || ':' || m.pool_id::text || ':' || m.user_id::text || ':' || m.pool_today::text
      );

      if v_id is null then
        v_suppressed := v_suppressed + 1;
      elsif v_type = 'reminder_3h' then
        v_3h := v_3h + 1;
      else
        v_1h := v_1h + 1;
      end if;

    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'user_id', m.user_id, 'pool_id', m.pool_id, 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end loop;

  update public.cron_runs
    set status = (case when jsonb_array_length(v_errors) > 0 then 'failed' else 'succeeded' end)::public.cron_run_status,
        finished_at = clock_timestamp(),
        members_processed = v_3h + v_1h,
        errors = v_errors
    where id = v_run_id;

  perform public.cron_heartbeat('send-reminders', jsonb_array_length(v_errors) = 0);

  return jsonb_build_object(
    'reminder_3h', v_3h, 'reminder_1h', v_1h,
    'suppressed', v_suppressed, 'errors', v_errors
  );
end;
$$;

revoke execute on function public.send_due_reminders(integer) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- F8.1 — delivery. Queued rows to Expo Push, fire-and-forget through pg_net
-- so a slow push service can never stall the database.
-- A user with no push token is marked failed rather than retried forever.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.dispatch_notifications(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n record;
  v_sent integer := 0;
  v_no_token integer := 0;
begin
  for n in
    select nt.id, nt.user_id, nt.title, nt.body, nt.data, nt.channel, u.push_token
    from public.notifications nt
    join public.users u on u.id = nt.user_id
    where nt.status = 'queued' and nt.channel = 'push'
    order by nt.created_at
    limit greatest(coalesce(p_limit, 100), 1)
    for update of nt skip locked
  loop
    if n.push_token is null or n.push_token = '' then
      update public.notifications
        set status = 'failed', sent_at = now()
        where id = n.id;
      v_no_token := v_no_token + 1;
      continue;
    end if;

    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', n.push_token,
        'title', n.title,
        'body', n.body,
        'data', n.data,
        'sound', 'default',
        'priority', 'high'
      ),
      timeout_milliseconds := 5000
    );

    update public.notifications set status = 'sent', sent_at = now() where id = n.id;
    v_sent := v_sent + 1;
  end loop;

  return jsonb_build_object('sent', v_sent, 'no_token', v_no_token);
end;
$$;

revoke execute on function public.dispatch_notifications(integer) from anon, authenticated, public;

-- ── Client surface: read your own, mark read, set prefs, register a token ──
create or replace function public.register_push_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  update public.users set push_token = nullif(btrim(p_token), '') where id = uid;
  insert into public.notification_prefs (user_id) values (uid) on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.register_push_token(text) from anon, public;
grant execute on function public.register_push_token(text) to authenticated;

create or replace function public.my_notifications(p_limit integer default 50)
returns table (
  id uuid, type text, title text, body text, data jsonb,
  status public.notification_status, created_at timestamptz, read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.type, n.title, n.body, n.data, n.status, n.created_at, n.read_at
  from public.notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(coalesce(p_limit, 50), 200);
$$;

revoke execute on function public.my_notifications(integer) from anon, public;
grant execute on function public.my_notifications(integer) to authenticated;

insert into public.cron_jobs_expected (job_name, every_minutes, grace_minutes, is_critical, note) values
  ('send-reminders', 60, 30, true, 'The nudge and the final warning. Silence here means people are fined without warning.'),
  ('dispatch-notifications', 2, 15, true, 'Queued notifications to Expo Push. Silence means nothing reaches a phone.')
on conflict (job_name) do nothing;
