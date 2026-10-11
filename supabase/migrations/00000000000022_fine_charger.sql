-- ============================================================================
-- CONQR · Migration 0022 · THE FINE CHARGER (F5.4 + F5.5 + F6.2)
-- ----------------------------------------------------------------------------
-- The CRON has been queuing `pending` fines every night and nothing drained
-- the queue, so a miss cost nobody anything. This collects them.
--
-- It also fixes two things that were quietly dead:
--
--   · `pool_members.status = 'delinquent'` was never set by any code path,
--     so `authz.is_delinquent()` — which gates check-ins and pool creation —
--     could never fire. Not paying had literally no consequence.
--   · `pool_members.fines_paid` was never written, so the leaderboard's
--     second-tier sort (fines_paid ASC) had always been comparing zeros.
--
-- SHAPE, unchanged from the rest of the money code:
--   logic in SQL, the provider call is the only swappable part, every write
--   idempotent, and derived money recomputed with SUM rather than counted.
--
-- RBI: an auto-debit against a UPI mandate legally requires a pre-debit
-- notice 24h ahead. That notice is F5.7 and does not exist yet, so the gate
-- is built here and switched OFF for the simulator. It MUST be on before a
-- live provider is configured — `requires_pre_debit_notice` is the switch.
-- ============================================================================

-- A member going delinquent is feed-worthy: it is why they stop appearing.
alter type public.event_type add value if not exists 'member_delinquent';

alter table public.payment_config
  add column if not exists requires_pre_debit_notice boolean not null default false;

comment on column public.payment_config.requires_pre_debit_notice is
  'RBI pre-debit notice gate. MUST be true for any live provider. The charger skips a fine that has no notice recorded (F5.7).';

-- When this is true the charger needs a notice row; the table is created now
-- so the gate has something to read once F5.7 starts writing to it.
create table if not exists public.pre_debit_notices (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  amount         numeric(10,2) not null,
  notified_at    timestamptz not null default now(),
  debit_after    timestamptz not null,
  unique (transaction_id)
);

alter table public.pre_debit_notices enable row level security;

create policy pre_debit_notices_select_own on public.pre_debit_notices
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('finance.transactions.view', auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- Derived money. fines_paid is a cache over the ledger, never a counter.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.recalc_member_fines(p_pool_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pool_members pm
     set fines_paid = coalesce((
           select sum(t.amount) from public.transactions t
           where t.pool_id = p_pool_id and t.user_id = p_user_id
             and t.transaction_type = 'fine' and t.status = 'succeeded'
         ), 0),
         updated_at = now()
   where pm.pool_id = p_pool_id and pm.user_id = p_user_id;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- A mandate to debit against. Real registration is F5.3; until then one is
-- minted when a buy-in settles, which is when a real mandate would be taken.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.ensure_simulated_mandate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_live boolean;
  v_fine numeric;
begin
  if new.transaction_type <> 'deposit' or new.status <> 'succeeded'
     or coalesce(old.status, 'pending'::public.txn_status) = 'succeeded'
     or new.pool_id is null then
    return new;
  end if;

  select is_live into v_live from public.payment_config where provider = new.provider;
  if coalesce(v_live, true) then
    return new;  -- a live provider registers real mandates; never fake one
  end if;

  select fine_amount into v_fine from public.pools where id = new.pool_id;

  insert into public.payment_mandates (
    user_id, pool_id, provider, provider_mandate_id, status, max_amount, valid_until
  ) values (
    new.user_id, new.pool_id, new.provider,
    'mand_sim_' || replace(new.pool_id::text, '-', '') || '_' || replace(new.user_id::text, '-', ''),
    'active', greatest(coalesce(v_fine, 0) * 10, 1000), now() + interval '1 year'
  )
  on conflict (provider, provider_mandate_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_simulated_mandate_trigger on public.transactions;
create trigger ensure_simulated_mandate_trigger
  after update on public.transactions
  for each row execute function public.ensure_simulated_mandate();

-- ════════════════════════════════════════════════════════════════════════════
-- Delinquency. A member whose fine has exhausted its retries stops being able
-- to check in or create pools, which is what authz.is_delinquent() gates.
-- Recomputed from the ledger, so clearing the debt clears the state.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.recalc_member_delinquency(p_pool_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owes boolean;
  v_status public.member_status;
begin
  select exists (
    select 1 from public.transactions t
    where t.pool_id = p_pool_id and t.user_id = p_user_id
      and t.transaction_type = 'fine' and t.status = 'failed'
  ) into v_owes;

  select status into v_status from public.pool_members
    where pool_id = p_pool_id and user_id = p_user_id;

  if v_owes and v_status = 'active' then
    update public.pool_members set status = 'delinquent', updated_at = now()
      where pool_id = p_pool_id and user_id = p_user_id;
    insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
      values (p_pool_id, p_user_id, 'member_delinquent',
              (now() at time zone 'Asia/Kolkata')::date, '{}')
      on conflict do nothing;

  elsif not v_owes and v_status = 'delinquent' then
    -- Debt cleared: let them back in.
    update public.pool_members set status = 'active', updated_at = now()
      where pool_id = p_pool_id and user_id = p_user_id;
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Settling a fine must also move the member-level caches. Hooking the
-- transaction table keeps this true no matter which path settles the row.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.sync_fine_side_effects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_type = 'fine' and new.pool_id is not null
     and new.status is distinct from coalesce(old.status, 'pending'::public.txn_status)
  then
    perform public.recalc_member_fines(new.pool_id, new.user_id);
    perform public.recalc_member_delinquency(new.pool_id, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_fine_side_effects_trigger on public.transactions;
create trigger sync_fine_side_effects_trigger
  after update on public.transactions
  for each row execute function public.sync_fine_side_effects();

-- ════════════════════════════════════════════════════════════════════════════
-- THE CHARGER. Drains pending + due-for-retry fines.
--   p_force_outcome: test hook only — the real provider decides the outcome.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.charge_pending_fines(
  p_limit integer default 200,
  p_force_outcome text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_txn record;
  v_mandate public.payment_mandates%rowtype;
  v_cfg public.payment_config%rowtype;
  v_order text;
  v_body text;
  v_sig text;
  v_outcome text;
  v_charged integer := 0;
  v_failed integer := 0;
  v_skipped integer := 0;
  v_collected numeric := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  insert into public.cron_runs (job_name, status)
  values ('charge-fines', 'running'::public.cron_run_status)
  returning id into v_run_id;

  for v_txn in
    select t.* from public.transactions t
    where t.transaction_type = 'fine'
      and (
        t.status = 'pending'
        or (t.status = 'retry_scheduled' and t.next_retry_at is not null and t.next_retry_at <= now())
      )
    order by t.created_at
    limit greatest(coalesce(p_limit, 200), 1)
    for update skip locked
  loop
    begin
      select * into v_cfg from public.payment_config where provider = v_txn.provider;
      if not found then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      -- RBI gate. Off for the simulator; MUST be on before a live provider.
      if v_cfg.requires_pre_debit_notice
         and not exists (
           select 1 from public.pre_debit_notices n
           where n.transaction_id = v_txn.id and n.debit_after <= now()
         )
      then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      -- Something to debit against.
      select * into v_mandate from public.payment_mandates
        where user_id = v_txn.user_id and pool_id = v_txn.pool_id
          and provider = v_txn.provider and status = 'active'
          and (valid_until is null or valid_until > now())
        limit 1;

      if not found then
        -- No mandate means no auto-debit is possible. Burning retries on it
        -- would be pointless, so it goes straight to manual-pay territory.
        update public.transactions
          set status = 'failed', failure_reason = 'no_mandate', updated_at = now()
          where id = v_txn.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      if v_txn.amount > v_mandate.max_amount then
        update public.transactions
          set status = 'failed', failure_reason = 'exceeds_mandate', updated_at = now()
          where id = v_txn.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Give the attempt a provider reference (reuse one if retrying).
      v_order := coalesce(v_txn.provider_order_id,
                          'order_fine_' || encode(extensions.gen_random_bytes(8), 'hex'));
      if v_txn.provider_order_id is null then
        update public.transactions set provider_order_id = v_order where id = v_txn.id;
      end if;

      -- A real provider is called here and answers asynchronously by webhook.
      -- The simulator produces the same signed event, through the same path.
      v_outcome := coalesce(p_force_outcome, 'success');

      v_body := (jsonb_build_object(
        'id', 'evt_fine_' || encode(extensions.gen_random_bytes(10), 'hex'),
        'event', case when v_outcome = 'success' then 'payment.captured' else 'payment.failed' end,
        'created_at', extract(epoch from now())::bigint,
        'payload', jsonb_build_object(
          'order_id', v_order,
          'payment_id', 'pay_fine_' || encode(extensions.gen_random_bytes(8), 'hex'),
          'mandate_id', v_mandate.provider_mandate_id,
          'failure_reason', case when v_outcome = 'success' then null else 'insufficient_funds' end
        )
      ))::text;

      v_sig := encode(extensions.hmac(v_body, v_cfg.webhook_secret, 'sha256'), 'hex');
      perform public.apply_payment_event(v_body, v_sig, v_txn.provider);

      if v_outcome = 'success' then
        v_charged := v_charged + 1;
        v_collected := v_collected + v_txn.amount;
      else
        v_failed := v_failed + 1;
      end if;

    exception when others then
      -- One bad fine must never stop the queue draining.
      v_errors := v_errors || jsonb_build_object(
        'transaction_id', v_txn.id, 'sqlstate', sqlstate, 'message', sqlerrm
      );
    end;
  end loop;

  update public.cron_runs
    set status = case when jsonb_array_length(v_errors) > 0 then 'failed' else 'succeeded' end::public.cron_run_status,
        finished_at = clock_timestamp(),
        fines_issued = v_charged,
        errors = v_errors
    where id = v_run_id;

  return jsonb_build_object(
    'charged', v_charged, 'failed', v_failed, 'skipped', v_skipped,
    'collected', v_collected, 'errors', v_errors
  );
end;
$$;

comment on function public.charge_pending_fines(integer, text) is
  'Drains pending and due-for-retry fines. Idempotent: apply_payment_event refuses to re-settle a terminal transaction, and FOR UPDATE SKIP LOCKED keeps concurrent runs apart.';

revoke execute on function public.charge_pending_fines(integer, text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- F6.2 — the retry sweep. Same worker, only the due ones.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.process_retries(p_force_outcome text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due integer;
begin
  select count(*) into v_due from public.transactions
    where transaction_type = 'fine' and status = 'retry_scheduled'
      and next_retry_at is not null and next_retry_at <= now();

  if v_due = 0 then
    return jsonb_build_object('due', 0, 'charged', 0);
  end if;

  return public.charge_pending_fines(v_due, p_force_outcome) || jsonb_build_object('due', v_due);
end;
$$;

revoke execute on function public.process_retries(text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- Backfill the caches these functions now maintain, so existing rows are not
-- left lying about what has been paid.
-- ════════════════════════════════════════════════════════════════════════════
update public.pool_members pm
   set fines_paid = coalesce((
         select sum(t.amount) from public.transactions t
         where t.pool_id = pm.pool_id and t.user_id = pm.user_id
           and t.transaction_type = 'fine' and t.status = 'succeeded'
       ), 0);
