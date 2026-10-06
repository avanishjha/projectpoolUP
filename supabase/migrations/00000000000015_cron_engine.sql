-- ============================================================================
-- CONQR · Migration 0015 · THE CRON ENGINE (F6.1)
-- ----------------------------------------------------------------------------
-- This is the product. If this is wrong, people are charged twice, or never,
-- or their streak lies to them. Every design choice below exists to make
-- those outcomes impossible rather than unlikely.
--
-- SAFETY MODEL
--   1. Exactly-once per member-day: pool_members.last_processed_date is the
--      guard. A member-day is processed only if last_processed_date is null
--      or < the day being processed. Re-runs are no-ops, not double charges.
--   2. Idempotent money: transactions.idempotency_key is UNIQUE
--      (pool:user:date:fine). Even if the guard above were bypassed, the
--      insert bounces off the constraint (ON CONFLICT DO NOTHING).
--   3. Never increment the pot: total_pot is always recomputed as
--      SUM(succeeded deposits + fines). Increments double-count on retry.
--   4. Serialised per pool: pg_advisory_xact_lock(pool uuid) means two
--      concurrent runs can never process the same pool simultaneously.
--   5. Error isolation: each pool is processed in its own BEGIN/EXCEPTION
--      block. One bad pool logs an error and the run continues.
--   6. Observability: every run writes a cron_runs row (counts + errors).
--      Silent failure is the enemy — a run that does nothing is visible.
--   7. Money movement is NOT here. The CRON only records 'pending' fine
--      transactions; the Razorpay worker (F5) charges them. A payment outage
--      can never corrupt streak/elimination state, and vice versa.
-- ============================================================================

-- Member-day processing guard (the exactly-once key).
alter table public.pool_members
  add column if not exists last_processed_date date;

comment on column public.pool_members.last_processed_date is
  'Last pool-local day the CRON processed for this member. The exactly-once guard: re-runs skip days already done.';

-- Fine transactions await charging; this index drives the F5 payment worker.
create index if not exists transactions_pending_fines_idx
  on public.transactions (status, created_at)
  where transaction_type = 'fine' and status = 'pending';

-- ════════════════════════════════════════════════════════════════════════════
-- Pot recalculation — SUM, never increment (NFR-REL-04)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.recalc_pool_pot(p_pool_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pot numeric(12,2);
begin
  select coalesce(sum(amount), 0) into v_pot
  from public.transactions
  where pool_id = p_pool_id
    and status = 'succeeded'
    and transaction_type in ('deposit', 'fine');

  update public.pools set total_pot = v_pot where id = p_pool_id;
  return v_pot;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Process ONE pool for ONE pool-local day.
-- Returns a JSON summary. Caller owns transaction/lock semantics.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.process_pool_day(p_pool_id uuid, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pool public.pools%rowtype;
  v_m public.pool_members%rowtype;
  v_has_checkin boolean;
  v_days_elapsed integer;
  v_checkins integer;
  v_processed integer := 0;
  v_success integer := 0;
  v_missed integer := 0;
  v_fines integer := 0;
  v_shields integer := 0;
  v_graces integer := 0;
  v_freezes integer := 0;
  v_eliminated integer := 0;
  v_skipped integer := 0;
  v_key text;
  v_active_left integer;
begin
  -- Serialise per pool: concurrent runs cannot interleave on the same pool.
  perform pg_advisory_xact_lock(hashtextextended(p_pool_id::text, 0));

  select * into v_pool from public.pools where id = p_pool_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'pool_not_found');
  end if;
  if v_pool.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'pool_not_active', 'status', v_pool.status);
  end if;
  -- Never process a day before the pool started or after it ended.
  if p_date < (v_pool.start_date at time zone v_pool.timezone)::date then
    return jsonb_build_object('ok', false, 'error', 'before_start');
  end if;

  v_days_elapsed := greatest(1, (p_date - (v_pool.start_date at time zone v_pool.timezone)::date) + 1);

  for v_m in
    select * from public.pool_members
    where pool_id = p_pool_id
      and status = 'active'
    order by user_id
    for update
  loop
    -- ── Exactly-once guard ────────────────────────────────────────────────
    if v_m.last_processed_date is not null and v_m.last_processed_date >= p_date then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_processed := v_processed + 1;

    select exists (
      select 1 from public.check_ins ci
      where ci.pool_id = p_pool_id and ci.user_id = v_m.user_id and ci.checkin_date = p_date
    ) into v_has_checkin;

    if v_has_checkin then
      -- ── SUCCESS ────────────────────────────────────────────────────────
      v_success := v_success + 1;
      select count(*) into v_checkins from public.check_ins
        where pool_id = p_pool_id and user_id = v_m.user_id and checkin_date <= p_date;

      update public.pool_members
        set current_streak = v_m.current_streak + 1,
            longest_streak = greatest(v_m.longest_streak, v_m.current_streak + 1),
            compliance_pct = least(100, round((v_checkins::numeric / v_days_elapsed) * 100, 2)),
            last_processed_date = p_date,
            updated_at = now()
        where user_id = v_m.user_id and pool_id = p_pool_id;

      -- Streak milestone event (deduped by the unique index on
      -- (pool,user,type,date) — a re-run cannot double-post).
      if (v_m.current_streak + 1) in (7, 14, 21, 30, 50, 75, 100) then
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
        values (p_pool_id, v_m.user_id, 'streak_milestone', p_date,
                jsonb_build_object('streak', v_m.current_streak + 1))
        on conflict do nothing;
      end if;

      -- XP ledger (users.xp is a cache recomputed from this).
      insert into public.xp_events (user_id, amount, reason, pool_id)
      values (v_m.user_id, 10 + case
                when v_m.current_streak + 1 >= 30 then 20
                when v_m.current_streak + 1 >= 14 then 10
                when v_m.current_streak + 1 >= 7 then 5
                else 0 end,
              'check_in', p_pool_id);

    else
      -- ── MISS ───────────────────────────────────────────────────────────
      v_missed := v_missed + 1;

      if v_m.shield_active then
        -- Shield absorbs the miss entirely: no fine, streak intact.
        update public.pool_members
          set shield_active = false,
              last_processed_date = p_date,
              updated_at = now()
          where user_id = v_m.user_id and pool_id = p_pool_id;
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
          values (p_pool_id, v_m.user_id, 'shield_used', p_date, '{}') on conflict do nothing;
        v_shields := v_shields + 1;
        continue;
      end if;

      if v_m.grace_tokens > 0 then
        -- Grace token: no fine, streak intact.
        update public.pool_members
          set grace_tokens = v_m.grace_tokens - 1,
              last_processed_date = p_date,
              updated_at = now()
          where user_id = v_m.user_id and pool_id = p_pool_id;
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
          values (p_pool_id, v_m.user_id, 'grace_used', p_date,
                  jsonb_build_object('remaining', v_m.grace_tokens - 1)) on conflict do nothing;
        v_graces := v_graces + 1;
        continue;
      end if;

      -- Real miss: fine is owed. Free pools (fine = 0) still break the streak.
      if v_pool.fine_amount > 0 then
        v_key := p_pool_id::text || ':' || v_m.user_id::text || ':' || p_date::text || ':fine';
        -- Idempotency key is UNIQUE: a duplicate attempt is a silent no-op.
        insert into public.transactions (
          user_id, pool_id, amount, transaction_type, status, idempotency_key
        ) values (
          v_m.user_id, p_pool_id, v_pool.fine_amount, 'fine', 'pending', v_key
        ) on conflict (idempotency_key) do nothing;
        if found then v_fines := v_fines + 1; end if;
      end if;

      select count(*) into v_checkins from public.check_ins
        where pool_id = p_pool_id and user_id = v_m.user_id and checkin_date <= p_date;

      update public.pool_members
        set current_streak = case when v_m.streak_freeze_active then v_m.current_streak else 0 end,
            streak_freeze_active = false,
            misses_count = v_m.misses_count + 1,
            compliance_pct = least(100, round((v_checkins::numeric / v_days_elapsed) * 100, 2)),
            last_processed_date = p_date,
            updated_at = now()
        where user_id = v_m.user_id and pool_id = p_pool_id;

      if v_m.streak_freeze_active then
        v_freezes := v_freezes + 1;
      end if;

      insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
        values (p_pool_id, v_m.user_id, 'missed_day', p_date,
                jsonb_build_object('miss_number', v_m.misses_count + 1)) on conflict do nothing;

      if v_pool.fine_amount > 0 then
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
          values (p_pool_id, v_m.user_id, 'fine_issued', p_date,
                  jsonb_build_object('amount', v_pool.fine_amount)) on conflict do nothing;
      end if;

      -- Elimination threshold (FR-POOL-06).
      if v_pool.elimination_threshold is not null
         and (v_m.misses_count + 1) >= v_pool.elimination_threshold then
        update public.pool_members set status = 'eliminated', updated_at = now()
          where user_id = v_m.user_id and pool_id = p_pool_id;
        insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
          values (p_pool_id, v_m.user_id, 'member_eliminated', p_date,
                  jsonb_build_object('misses', v_m.misses_count + 1)) on conflict do nothing;
        v_eliminated := v_eliminated + 1;
      end if;
    end if;
  end loop;

  -- Pot is ALWAYS derived, never incremented.
  perform public.recalc_pool_pot(p_pool_id);

  -- Pool end: past end_date, or only one active member left (FR-POOL-12).
  select count(*) into v_active_left from public.pool_members
    where pool_id = p_pool_id and status = 'active';

  if p_date >= (v_pool.end_date at time zone v_pool.timezone)::date then
    perform public.complete_pool(p_pool_id, 'ended', p_date);
  elsif v_active_left <= 1 then
    perform public.complete_pool(p_pool_id, 'last_member_standing', p_date);
  end if;

  return jsonb_build_object(
    'ok', true, 'pool_id', p_pool_id, 'date', p_date,
    'processed', v_processed, 'skipped', v_skipped,
    'success', v_success, 'missed', v_missed, 'fines', v_fines,
    'shields', v_shields, 'graces', v_graces, 'freezes', v_freezes,
    'eliminated', v_eliminated
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Pool completion. Payout calculation itself lands with Razorpay (F5); this
-- closes the state machine and posts the event.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.complete_pool(p_pool_id uuid, p_reason text, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pools set status = 'completed' where id = p_pool_id and status = 'active';
  if not found then return; end if;

  update public.pool_members
    set status = 'completed', updated_at = now()
    where pool_id = p_pool_id and status = 'active';

  insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
  values (p_pool_id, null, 'pool_completed', p_date, jsonb_build_object('reason', p_reason))
  on conflict do nothing;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Activation: pending pools whose start date has arrived (UC-05).
-- ≥2 members → active. Otherwise cancelled (refunds are F5).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.activate_pools()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pool public.pools%rowtype;
  v_members integer;
  v_activated integer := 0;
  v_cancelled integer := 0;
begin
  for v_pool in
    select * from public.pools
    where status = 'pending'
      and start_date <= now()
    order by created_at
    for update skip locked
  loop
    select count(*) into v_members from public.pool_members where pool_id = v_pool.id;

    if v_members >= 2 then
      update public.pools set status = 'active' where id = v_pool.id;
      update public.pool_members
        set status = 'active', updated_at = now()
        where pool_id = v_pool.id and status = 'pending';
      insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
        values (v_pool.id, null, 'pool_started',
                (now() at time zone v_pool.timezone)::date,
                jsonb_build_object('members', v_members))
        on conflict do nothing;
      v_activated := v_activated + 1;
    else
      update public.pools set status = 'cancelled' where id = v_pool.id;
      v_cancelled := v_cancelled + 1;
    end if;
  end loop;

  return jsonb_build_object('activated', v_activated, 'cancelled', v_cancelled);
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- THE RUNNER — what pg_cron calls. Per-pool error isolation + run logging.
-- p_force_date/p_force_pool exist for testing and for replaying a missed day.
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
      -- Only pools whose deadline hour has passed today, unless forced.
      and (
        p_force_date is not null
        or p_force_pool is not null
        or extract(hour from (now() at time zone 'UTC'))::integer >= p.check_in_deadline_utc
      )
    order by p.id
  loop
    begin
      -- The day being closed out is the pool-local day at deadline time.
      v_target := coalesce(p_force_date, (now() at time zone v_pool.timezone)::date);
      v_result := public.process_pool_day(v_pool.id, v_target);

      if (v_result->>'ok')::boolean then
        v_pools := v_pools + 1;
        v_members := v_members + coalesce((v_result->>'processed')::integer, 0);
        v_fines := v_fines + coalesce((v_result->>'fines')::integer, 0);
      end if;
    exception when others then
      -- One bad pool must never kill the run (NFR-REL-02).
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

comment on function public.process_check_ins(date, uuid) is
  'THE CRON. Idempotent per member-day, per-pool error isolation, pot recalculated not incremented, every run logged to cron_runs.';

-- Service role only — these are never callable from a client.
revoke execute on function public.process_check_ins(date, uuid) from anon, authenticated, public;
revoke execute on function public.process_pool_day(uuid, date) from anon, authenticated, public;
revoke execute on function public.activate_pools() from anon, authenticated, public;
revoke execute on function public.complete_pool(uuid, text, date) from anon, authenticated, public;
revoke execute on function public.recalc_pool_pot(uuid) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- Health view for the ops dashboard (ops.cron.monitor capability).
-- ════════════════════════════════════════════════════════════════════════════
create or replace view public.cron_health as
select
  job_name,
  max(started_at) as last_run_at,
  (array_agg(status order by started_at desc))[1] as last_status,
  count(*) filter (where started_at > now() - interval '24 hours') as runs_24h,
  count(*) filter (where status = 'failed' and started_at > now() - interval '24 hours') as failures_24h,
  sum(fines_issued) filter (where started_at > now() - interval '24 hours') as fines_24h
from public.cron_runs
group by job_name;

grant select on public.cron_health to authenticated;
