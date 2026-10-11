-- ============================================================================
-- CONQR · Migration 0024 · CRON OBSERVABILITY (F6.7)
-- ----------------------------------------------------------------------------
-- Five scheduled jobs now move real money. Until this migration the only
-- record of them was `cron_runs`, which has a fatal blind spot: a job that
-- stops running writes NO row, so the absence of evidence looks exactly like
-- a quiet night. Nothing was watching for silence.
--
-- TWO LAYERS, because an in-database watchdog cannot detect its own death:
--
--   1. cron_watchdog() — runs inside the database every 5 minutes. Catches a
--      single stalled or failing job and can say WHY (overdue, erroring,
--      processing nothing when there was work). Useless if pg_cron dies.
--
--   2. cron_heartbeat() — an OUTBOUND ping, per job, to an external
--      dead-man's switch (Healthchecks.io, Cronitor, …). That service alerts
--      when the pings STOP. It is the only layer that survives pg_cron, the
--      database, or the whole project going away, which is exactly the
--      failure NFR-REL-02 cares about.
--
-- Unconfigured — local dev, CI — every one of these is a silent no-op. No
-- network calls, no noise, no cost.
-- ============================================================================

create extension if not exists pg_net;

-- ════════════════════════════════════════════════════════════════════════════
-- What each job promises: how often it runs, how late is too late, and where
-- to ping. A job absent from this table is simply not monitored.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.cron_jobs_expected (
  job_name        text primary key,
  every_minutes   integer not null check (every_minutes > 0),
  grace_minutes   integer not null default 5 check (grace_minutes >= 0),
  heartbeat_url   text,        -- null = heartbeats disabled for this job
  is_critical     boolean not null default true,
  enabled         boolean not null default true,
  note            text
);

alter table public.cron_jobs_expected enable row level security;

create policy cron_jobs_expected_ops_read on public.cron_jobs_expected
  for select to authenticated
  using (authz.has_capability('ops.cron.monitor', auth.uid()));

insert into public.cron_jobs_expected (job_name, every_minutes, grace_minutes, is_critical, note) values
  ('process-checkins', 1,   10,  true,  'The verdict. Silence here means nobody is being judged or fined.'),
  ('charge-fines',     10,  25,  true,  'Collection. Silence means fines queue up uncollected.'),
  ('activate-pools',   10,  25,  true,  'Pools start and cancel here. Silence strands them in pending.'),
  ('process-retries',  360, 90,  false, 'Retries are not urgent to the minute; the ladder has slack.')
on conflict (job_name) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Alerts. Raised once and left open until the condition clears, so a job
-- that is down for an hour produces one alert rather than twelve.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.cron_alerts (
  id          uuid primary key default gen_random_uuid(),
  job_name    text not null,
  kind        text not null check (kind in ('overdue', 'failing', 'no_progress')),
  detail      text not null,
  raised_at   timestamptz not null default now(),
  cleared_at  timestamptz
);

alter table public.cron_alerts enable row level security;

create policy cron_alerts_ops_read on public.cron_alerts
  for select to authenticated
  using (authz.has_capability('ops.cron.monitor', auth.uid()));

-- One open alert per job per kind. The partial unique index IS the dedup.
create unique index if not exists cron_alerts_open_idx
  on public.cron_alerts (job_name, kind) where cleared_at is null;

-- ════════════════════════════════════════════════════════════════════════════
-- The outbound heartbeat. Healthchecks.io convention: POST the base URL on
-- success, base/fail on failure. Fire-and-forget — pg_net is async, so a slow
-- or dead monitoring service can never delay or break a money job.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.cron_heartbeat(p_job_name text, p_ok boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
begin
  select heartbeat_url into v_url
    from public.cron_jobs_expected
    where job_name = p_job_name and enabled and heartbeat_url is not null;

  if v_url is null then
    return;  -- not configured: silent no-op (local dev, CI)
  end if;

  perform net.http_post(
    url := case when p_ok then v_url else rtrim(v_url, '/') || '/fail' end,
    body := jsonb_build_object('job', p_job_name, 'at', now()),
    timeout_milliseconds := 4000
  );
exception when others then
  -- Monitoring must never be able to break the thing it monitors.
  null;
end;
$$;

revoke execute on function public.cron_heartbeat(text, boolean) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- The watchdog. Three questions, asked every five minutes.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.cron_watchdog()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
  v_last timestamptz;
  v_last_status text;
  v_fails integer;
  v_due integer;
  v_raised integer := 0;
  v_cleared integer := 0;
  v_detail text;

begin
  for j in select * from public.cron_jobs_expected where enabled loop

    select max(started_at) into v_last
      from public.cron_runs where job_name = j.job_name;

    select status::text into v_last_status
      from public.cron_runs where job_name = j.job_name
      order by started_at desc limit 1;

    -- ── 1. OVERDUE: has it run at all, recently enough? ──────────────────
    -- A job that stopped writes no row, so this is the only in-database
    -- signal that it died.
    if v_last is null
       or v_last < now() - make_interval(mins => j.every_minutes + j.grace_minutes)
    then
      v_detail := case
        when v_last is null then 'has never run'
        else 'last ran ' || to_char(v_last, 'YYYY-MM-DD HH24:MI') ||
             ' (' || round(extract(epoch from (now() - v_last)) / 60) || ' min ago, expected every ' ||
             j.every_minutes || ' min)'
      end;

      insert into public.cron_alerts (job_name, kind, detail)
      values (j.job_name, 'overdue', v_detail)
      on conflict do nothing;
      if found then v_raised := v_raised + 1; end if;

      perform public.cron_heartbeat(j.job_name, false);
    else
      update public.cron_alerts set cleared_at = now()
        where job_name = j.job_name and kind = 'overdue' and cleared_at is null;
      if found then v_cleared := v_cleared + 1; end if;
    end if;

    -- ── 2. FAILING: consecutive failures, not a one-off blip ─────────────
    select count(*) into v_fails from (
      select status from public.cron_runs
      where job_name = j.job_name order by started_at desc limit 3
    ) recent where status = 'failed';

    if v_fails >= 3 then
      insert into public.cron_alerts (job_name, kind, detail)
      values (j.job_name, 'failing', 'last 3 runs all failed')
      on conflict do nothing;
      if found then v_raised := v_raised + 1; end if;
      perform public.cron_heartbeat(j.job_name, false);
    elsif v_last_status = 'succeeded' then
      update public.cron_alerts set cleared_at = now()
        where job_name = j.job_name and kind = 'failing' and cleared_at is null;
      if found then v_cleared := v_cleared + 1; end if;
    end if;

  end loop;

  -- ── 3. NO PROGRESS: the subtle one. The job runs and reports success,
  --      but work is piling up behind it. A green run is not the same as a
  --      working run.
  select count(*) into v_due from public.transactions
    where transaction_type = 'fine'
      and status = 'pending'
      and created_at < now() - interval '45 minutes';

  if v_due > 0 then
    insert into public.cron_alerts (job_name, kind, detail)
    values ('charge-fines', 'no_progress',
            v_due || ' fine(s) pending for over 45 min while the charger reports success')
    on conflict do nothing;
    if found then v_raised := v_raised + 1; end if;
  else
    update public.cron_alerts set cleared_at = now()
      where job_name = 'charge-fines' and kind = 'no_progress' and cleared_at is null;
    if found then v_cleared := v_cleared + 1; end if;
  end if;

  -- The watchdog has its own heartbeat: if THIS stops pinging, the external
  -- switch escalates even though no individual job raised anything.
  perform public.cron_heartbeat('watchdog', true);

  return jsonb_build_object(
    'raised', v_raised,
    'cleared', v_cleared,
    'open', (select count(*) from public.cron_alerts where cleared_at is null)
  );
end;
$$;

revoke execute on function public.cron_watchdog() from anon, authenticated, public;

insert into public.cron_jobs_expected (job_name, every_minutes, grace_minutes, is_critical, note)
values ('watchdog', 5, 10, true, 'Watches the others. Its own silence is the signal that the scheduler is gone.')
on conflict (job_name) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Health view, rebuilt: what an ops dashboard actually needs to answer
-- "is the engine alive?" in one glance.
-- ════════════════════════════════════════════════════════════════════════════
drop view if exists public.cron_health;

create view public.cron_health as
select
  e.job_name,
  e.is_critical,
  e.every_minutes,
  r.last_run_at,
  r.last_status,
  (r.last_run_at is null
     or r.last_run_at < now() - make_interval(mins => e.every_minutes + e.grace_minutes)) as is_overdue,
  case when r.last_run_at is null then null
       else round(extract(epoch from (now() - r.last_run_at)) / 60)::integer end as minutes_since,
  coalesce(r.runs_24h, 0)      as runs_24h,
  coalesce(r.failures_24h, 0)  as failures_24h,
  coalesce(r.fines_24h, 0)     as fines_24h,
  (select count(*) from public.cron_alerts a
    where a.job_name = e.job_name and a.cleared_at is null) as open_alerts,
  (e.heartbeat_url is not null) as heartbeat_configured
from public.cron_jobs_expected e
left join (
  select
    job_name,
    max(started_at) as last_run_at,
    (array_agg(status order by started_at desc))[1]::text as last_status,
    count(*) filter (where started_at > now() - interval '24 hours') as runs_24h,
    count(*) filter (where status = 'failed' and started_at > now() - interval '24 hours') as failures_24h,
    sum(fines_issued) filter (where started_at > now() - interval '24 hours') as fines_24h
  from public.cron_runs group by job_name
) r on r.job_name = e.job_name
where e.enabled;

grant select on public.cron_health to authenticated;

comment on view public.cron_health is
  'One row per monitored job. is_overdue is the important column: it is true when a job has stopped writing runs, which is the failure cron_runs alone cannot show.';

-- ════════════════════════════════════════════════════════════════════════════
-- Wire heartbeats into the money jobs. Each pings its own outcome, so the
-- external switch learns about a FAILING job as well as a silent one.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.process_check_ins(
  p_force_date date default null,
  p_force_pool uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_pool record;
  v_result jsonb;
  v_pools integer := 0;
  v_members integer := 0;
  v_fines integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_target date;
  v_started timestamptz := clock_timestamp();
begin
  insert into public.cron_runs (job_name, status)
  values ('process-checkins', 'running'::public.cron_run_status)
  returning id into v_run_id;

  for v_pool in
    select p.id, p.timezone, p.check_in_deadline_utc
    from public.pools p
    where p.status = 'active'
      and (p_force_pool is null or p.id = p_force_pool)
      and (
        p_force_date is not null
        or p_force_pool is not null
        or extract(hour from (now() at time zone 'UTC'))::integer >= p.check_in_deadline_utc
      )
    order by p.id
  loop
    begin
      v_target := coalesce(p_force_date, (now() at time zone v_pool.timezone)::date);
      v_result := public.process_pool_day(v_pool.id, v_target);

      if (v_result->>'ok')::boolean then
        v_pools := v_pools + 1;
        v_members := v_members + coalesce((v_result->>'processed')::integer, 0);
        v_fines := v_fines + coalesce((v_result->>'fines')::integer, 0);
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'pool_id', v_pool.id, 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end loop;

  update public.cron_runs
    set status = (case when jsonb_array_length(v_errors) > 0 then 'failed' else 'succeeded' end)::public.cron_run_status,
        finished_at = clock_timestamp(),
        pools_processed = v_pools,
        members_processed = v_members,
        fines_issued = v_fines,
        errors = v_errors
    where id = v_run_id;

  perform public.cron_heartbeat('process-checkins', jsonb_array_length(v_errors) = 0);

  return jsonb_build_object(
    'run_id', v_run_id,
    'pools_processed', v_pools,
    'members_processed', v_members,
    'fines_issued', v_fines,
    'errors', v_errors,
    'duration_ms', round(extract(milliseconds from (clock_timestamp() - v_started)))
  );
end;
$$;

revoke execute on function public.process_check_ins(date, uuid) from anon, authenticated, public;

-- activate_pools logs a run too, so its silence is detectable like the others.
create or replace function public.activate_pools()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_pool public.pools%rowtype;
  v_settled integer;
  v_activated integer := 0;
  v_cancelled integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  insert into public.cron_runs (job_name, status)
  values ('activate-pools', 'running'::public.cron_run_status)
  returning id into v_run_id;

  for v_pool in
    select * from public.pools
    where status = 'pending' and start_date <= now()
    order by created_at
    for update skip locked
  loop
    begin
      select count(*) into v_settled
        from public.pool_members pm
        where pm.pool_id = v_pool.id
          and public.has_settled_buy_in(v_pool.id, pm.user_id);

      if v_settled >= 2 then
        update public.pools set status = 'active' where id = v_pool.id;
        update public.pool_members pm
          set status = 'active', updated_at = now()
          where pm.pool_id = v_pool.id
            and pm.status = 'pending'
            and public.has_settled_buy_in(v_pool.id, pm.user_id);
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
          values (v_pool.id, null, 'pool_started',
                  (now() at time zone v_pool.timezone)::date,
                  jsonb_build_object('members', v_settled))
          on conflict do nothing;
        v_activated := v_activated + 1;
      else
        update public.pools set status = 'cancelled' where id = v_pool.id;
        v_cancelled := v_cancelled + 1;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'pool_id', v_pool.id, 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end loop;

  update public.cron_runs
    set status = (case when jsonb_array_length(v_errors) > 0 then 'failed' else 'succeeded' end)::public.cron_run_status,
        finished_at = clock_timestamp(),
        pools_processed = v_activated + v_cancelled,
        errors = v_errors
    where id = v_run_id;

  perform public.cron_heartbeat('activate-pools', jsonb_array_length(v_errors) = 0);

  return jsonb_build_object('activated', v_activated, 'cancelled', v_cancelled, 'errors', v_errors);
end;
$$;

revoke execute on function public.activate_pools() from anon, authenticated, public;

-- The charger pings from where it already writes its cron_runs row.
create or replace function public.charge_fines_with_heartbeat()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.charge_pending_fines();
  perform public.cron_heartbeat('charge-fines', jsonb_array_length(v_result->'errors') = 0);
  return v_result;
end;
$$;

revoke execute on function public.charge_fines_with_heartbeat() from anon, authenticated, public;
