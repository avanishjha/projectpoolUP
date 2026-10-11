-- ============================================================================
-- CONQR · Migration 0027 · RBI PRE-DEBIT NOTICES (F5.7 + F6.5)
-- ----------------------------------------------------------------------------
-- An auto-debit against a UPI mandate must be preceded by a notification to
-- the customer at least 24 hours ahead, stating the amount and the date.
-- Migration 0022 built the GATE (`requires_pre_debit_notice`, and a charger
-- that skips un-noticed fines). This issues the notices, so the gate can
-- actually be switched on without halting collection.
--
-- THE SEQUENCE, which is law rather than preference:
--
--   23:30      the verdict creates a pending fine
--   23:30      a notice is issued; debit_after = now + 24h
--   (24h)      the charger's gate refuses the debit the whole time
--   23:30 +1d  the fine is collected
--
-- Turning the gate on therefore DELAYS every fine by a day. That is what
-- "notify at least 24 hours before" means. It is not a tunable, and the
-- product copy should say "charged tomorrow", not "charged tonight".
--
-- RETRIES reuse the original notice: the `pre_debit_notices` row persists
-- and its `debit_after` stays satisfied, so a failed collection can be
-- retried on the 6h/24h/72h ladder without a fresh 24h wait each time.
-- Worth confirming against the payment partner's own reading before go-live
-- — a stricter interpretation would require a notice per debit ATTEMPT.
-- ============================================================================

-- ── Rupees, written the way the notice has to read. ────────────────────────
-- Indian digit grouping: 1,23,456 rather than 123,456. A compliance notice
-- stating the amount should state it the way the recipient reads money.
create or replace function public.format_inr(p_amount numeric)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_whole text := trim(to_char(floor(abs(p_amount)), 'FM999999999'));
  v_last3 text;
  v_rest text;
  v_grouped text;
begin
  if length(v_whole) <= 3 then
    v_grouped := v_whole;
  else
    v_last3 := right(v_whole, 3);
    v_rest := left(v_whole, length(v_whole) - 3);
    -- Everything above the last three digits groups in pairs.
    v_grouped := regexp_replace(reverse(v_rest), '(\d{2})(?=\d)', '\1,', 'g');
    v_grouped := reverse(v_grouped) || ',' || v_last3;
  end if;

  return case when p_amount < 0 then '-' else '' end || '₹' || v_grouped;
end;
$$;

grant execute on function public.format_inr(numeric) to authenticated;

-- ── A live provider may never run without the gate. Enforced, not advised. ──
create or replace function public.enforce_live_requires_notice()
returns trigger
language plpgsql
as $$
begin
  if new.is_live and not new.requires_pre_debit_notice then
    raise exception
      'a live payment provider must set requires_pre_debit_notice (RBI pre-debit notification)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_live_requires_notice_trigger on public.payment_config;
create trigger enforce_live_requires_notice_trigger
  before insert or update on public.payment_config
  for each row execute function public.enforce_live_requires_notice();

-- How far ahead a notice must land before the debit may happen.
alter table public.payment_config
  add column if not exists pre_debit_lead_hours integer not null default 24
  check (pre_debit_lead_hours >= 24);

comment on column public.payment_config.pre_debit_lead_hours is
  'Hours between notifying and debiting. Floor of 24 is the regulatory minimum; the check constraint stops anyone tuning it below that.';

-- ════════════════════════════════════════════════════════════════════════════
-- Issue notices for fines that do not have one. Idempotent twice over: the
-- unique on pre_debit_notices.transaction_id, and the unique dedup_key on
-- notifications.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.issue_pre_debit_notices(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  t record;
  v_lead integer;
  v_debit_after timestamptz;
  v_issued integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  insert into public.cron_runs (job_name, status)
  values ('pre-debit-notices', 'running'::public.cron_run_status)
  returning id into v_run_id;

  for t in
    select tx.id, tx.user_id, tx.pool_id, tx.amount, tx.provider,
           p.name as pool_name, p.timezone
    from public.transactions tx
    join public.pools p on p.id = tx.pool_id
    where tx.transaction_type = 'fine'
      and tx.status in ('pending', 'retry_scheduled')
      and not exists (
        select 1 from public.pre_debit_notices n where n.transaction_id = tx.id
      )
    order by tx.created_at
    limit greatest(coalesce(p_limit, 500), 1)
  loop
    begin
      select pre_debit_lead_hours into v_lead
        from public.payment_config where provider = t.provider;
      v_debit_after := now() + make_interval(hours => coalesce(v_lead, 24));

      insert into public.pre_debit_notices (transaction_id, user_id, amount, debit_after)
      values (t.id, t.user_id, t.amount, v_debit_after)
      on conflict (transaction_id) do nothing;

      if not found then
        continue;  -- someone else got there first
      end if;

      -- The customer-facing half. RBI wants the amount and the date stated.
      insert into public.notifications (user_id, type, channel, title, body, data, dedup_key)
      values (
        t.user_id,
        'pre_debit',
        'push',
        'Heads up: ' || public.format_inr(t.amount) || ' will be debited',
        public.format_inr(t.amount) || ' for the day you missed in ' || t.pool_name ||
        ' will be collected on ' ||
        to_char(v_debit_after at time zone coalesce(t.timezone, 'Asia/Kolkata'), 'DD Mon') ||
        '. Pay now if you would rather settle it today.',
        jsonb_build_object(
          'route', '/pool/' || t.pool_id::text,
          'pool_id', t.pool_id,
          'transaction_id', t.id,
          'amount', t.amount,
          'debit_after', v_debit_after
        ),
        'pre_debit:' || t.id::text
      )
      -- The index is partial (WHERE dedup_key IS NOT NULL), so the inference
      -- clause has to carry the same predicate or Postgres cannot match it.
      on conflict (dedup_key) where dedup_key is not null do nothing;

      v_issued := v_issued + 1;

    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'transaction_id', t.id, 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end loop;

  update public.cron_runs
    set status = (case when jsonb_array_length(v_errors) > 0 then 'failed' else 'succeeded' end)::public.cron_run_status,
        finished_at = clock_timestamp(),
        members_processed = v_issued,
        errors = v_errors
    where id = v_run_id;

  perform public.cron_heartbeat('pre-debit-notices', jsonb_array_length(v_errors) = 0);

  return jsonb_build_object('issued', v_issued, 'errors', v_errors);
end;
$$;

revoke execute on function public.issue_pre_debit_notices(integer) from anon, authenticated, public;

insert into public.cron_jobs_expected (job_name, every_minutes, grace_minutes, is_critical, note)
values ('pre-debit-notices', 15, 30, true,
        'Issues the notice that legally must precede a debit. Silence here means fines are never collectable.')
on conflict (job_name) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Issue notices the moment the verdict creates fines, rather than waiting up
-- to a sweep interval. The scheduled job stays as a safety net.
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

  -- Notice first, debit later. Issuing here means the 24h clock starts the
  -- instant the fine exists, rather than up to a sweep interval afterwards.
  if v_fines > 0 then
    begin
      perform public.issue_pre_debit_notices();
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'stage', 'pre_debit_notices', 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end if;

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
