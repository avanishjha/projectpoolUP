-- ============================================================================
-- CONQR · Migration 0018 · PAYMENT FOUNDATION (F5.1)
-- ----------------------------------------------------------------------------
-- Provider-agnostic payment layer. Runs end to end today against a built-in
-- SIMULATOR; adding Razorpay later is a credentials + transport change, not a
-- rewrite.
--
-- ARCHITECTURE — the same split that made the CRON safe:
--   LOGIC lives in SQL   (apply_payment_event: the state machine, testable now)
--   TRANSPORT lives in an Edge Function (the HTTPS webhook shell, added with
--   Razorpay). The Edge Function will do nothing but verify the signature and
--   call apply_payment_event().
--
-- The simulator signs its events with the SAME HMAC-SHA256 scheme Razorpay
-- uses, so signature verification is real code under test today rather than a
-- stub to be written later.
--
-- IDEMPOTENCY (money, so it matters):
--   1. payment_events.provider_event_id is UNIQUE — a replayed webhook is a
--      no-op, which is the single most common real-world payment bug.
--   2. apply_payment_event only moves a transaction OUT of a non-terminal
--      state; a succeeded transaction can never be re-succeeded or reversed
--      by a late/duplicate event.
--   3. The pot is recomputed with recalc_pool_pot(), never incremented.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Provider-agnostic column names ─────────────────────────────────────────
-- Nothing reads these yet (F5 was unbuilt), so renaming now is free and keeps
-- the schema honest about supporting more than one provider.
alter table public.transactions rename column razorpay_order_id    to provider_order_id;
alter table public.transactions rename column razorpay_payment_id  to provider_payment_id;
alter table public.transactions rename column razorpay_transfer_id to provider_transfer_id;

alter table public.transactions
  add column if not exists provider text not null default 'simulator';

comment on column public.transactions.provider is
  'Which payment provider owns provider_order_id / provider_payment_id. ''simulator'' until Razorpay lands.';

create index if not exists transactions_provider_order_idx
  on public.transactions (provider, provider_order_id);

-- ════════════════════════════════════════════════════════════════════════════
-- Config — the webhook secret. In production the Edge Function reads this from
-- Supabase secrets; this row exists so the SQL side can verify signatures in
-- tests and in the simulator.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.payment_config (
  provider      text primary key,
  webhook_secret text not null,
  is_live       boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.payment_config enable row level security;
-- No policies: service role only. Humans never read the webhook secret.

insert into public.payment_config (provider, webhook_secret, is_live)
values ('simulator', 'conqr_sim_whsec_local_dev_only', false)
on conflict (provider) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Customers — created on first join, one per user per provider.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.payment_customers (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users (id) on delete cascade,
  provider             text not null,
  provider_customer_id text not null,
  created_at           timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.payment_customers enable row level security;

create policy payment_customers_select_own on public.payment_customers
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('finance.transactions.view', auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- Mandates (UPI Autopay). Table shape lands now so the fine charger has
-- somewhere to look; registration itself is F5.3.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.payment_mandates (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  pool_id             uuid references public.pools (id) on delete cascade,
  provider            text not null,
  provider_mandate_id text not null,
  status              text not null default 'pending'
                        check (status in ('pending','active','paused','cancelled','expired')),
  max_amount          numeric(10,2) not null check (max_amount > 0),
  valid_until         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (provider, provider_mandate_id)
);

alter table public.payment_mandates enable row level security;

create policy payment_mandates_select_own on public.payment_mandates
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('finance.transactions.view', auth.uid()));

create index if not exists payment_mandates_active_idx
  on public.payment_mandates (user_id, status) where status = 'active';

-- ════════════════════════════════════════════════════════════════════════════
-- Webhook event log. The UNIQUE on provider_event_id IS the replay defence.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.payment_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  provider_event_id text not null,
  event_type        text not null,
  payload           jsonb not null,
  signature_ok      boolean not null,
  transaction_id    uuid references public.transactions (id),
  outcome           text,
  received_at       timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table public.payment_events enable row level security;
-- Service role only: raw provider payloads are not for clients.

-- ════════════════════════════════════════════════════════════════════════════
-- Signature verification — the real scheme, used by the simulator today and by
-- Razorpay tomorrow (both are HMAC-SHA256 over the raw body, hex-encoded).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.verify_payment_signature(
  p_body text,
  p_signature text,
  p_provider text default 'simulator'
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_expected text;
begin
  select webhook_secret into v_secret from public.payment_config where provider = p_provider;
  if v_secret is null then return false; end if;

  v_expected := encode(extensions.hmac(p_body, v_secret, 'sha256'), 'hex');

  -- Length-independent comparison; both sides are fixed-length hex here.
  return v_expected = lower(coalesce(p_signature, ''));
end;
$$;

revoke execute on function public.verify_payment_signature(text, text, text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- ensure_payment_customer — idempotent, called on first join.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.ensure_payment_customer(p_provider text default 'simulator')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_id text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select provider_customer_id into v_id
    from public.payment_customers where user_id = uid and provider = p_provider;

  if v_id is not null then
    return jsonb_build_object('ok', true, 'customer_id', v_id, 'created', false);
  end if;

  -- A real provider returns this id from its API; the simulator mints one.
  v_id := 'cust_sim_' || replace(uid::text, '-', '');

  insert into public.payment_customers (user_id, provider, provider_customer_id)
  values (uid, p_provider, v_id)
  on conflict (user_id, provider) do nothing;

  return jsonb_build_object('ok', true, 'customer_id', v_id, 'created', true);
end;
$$;

revoke execute on function public.ensure_payment_customer(text) from anon, public;
grant execute on function public.ensure_payment_customer(text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- start_checkout — creates the PENDING transaction and returns an order the
-- client can "pay". With Razorpay this body is replaced by an Orders API call;
-- the signature and the rest of the flow stay identical.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.start_checkout(
  p_pool_id uuid,
  p_type public.txn_type default 'deposit'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool public.pools%rowtype;
  v_amount numeric(10,2);
  v_key text;
  v_order text;
  v_txn uuid;
  v_existing public.transactions%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_type <> 'deposit' then
    return jsonb_build_object('ok', false, 'error', 'unsupported_type');
  end if;

  select * into v_pool from public.pools where id = p_pool_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'pool_not_found');
  end if;
  if not authz.is_pool_member(p_pool_id, uid) then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  v_amount := v_pool.buy_in_amount;
  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('ok', true, 'free', true, 'amount', 0);
  end if;

  -- One buy-in per member per pool, forever.
  v_key := p_pool_id::text || ':' || uid::text || ':deposit';

  select * into v_existing from public.transactions where idempotency_key = v_key;
  if found then
    if v_existing.status = 'succeeded' then
      return jsonb_build_object('ok', true, 'already_paid', true, 'transaction_id', v_existing.id);
    end if;
    -- Resume the open attempt rather than minting a second one.
    return jsonb_build_object(
      'ok', true, 'transaction_id', v_existing.id, 'order_id', v_existing.provider_order_id,
      'amount', v_existing.amount, 'provider', v_existing.provider, 'resumed', true
    );
  end if;

  perform public.ensure_payment_customer('simulator');

  v_order := 'order_sim_' || encode(extensions.gen_random_bytes(8), 'hex');

  insert into public.transactions (
    user_id, pool_id, amount, transaction_type, status,
    idempotency_key, provider, provider_order_id
  ) values (
    uid, p_pool_id, v_amount, 'deposit', 'pending',
    v_key, 'simulator', v_order
  ) returning id into v_txn;

  return jsonb_build_object(
    'ok', true, 'transaction_id', v_txn, 'order_id', v_order,
    'amount', v_amount, 'provider', 'simulator', 'resumed', false
  );
end;
$$;

revoke execute on function public.start_checkout(uuid, public.txn_type) from anon, public;
grant execute on function public.start_checkout(uuid, public.txn_type) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- apply_payment_event — THE STATE MACHINE.
-- Called by the webhook Edge Function (and by the simulator). Service role
-- only: a client must never be able to mark its own payment succeeded.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.apply_payment_event(
  p_body text,
  p_signature text,
  p_provider text default 'simulator'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
  v_event jsonb;
  v_event_id text;
  v_type text;
  v_order text;
  v_payment text;
  v_reason text;
  v_txn public.transactions%rowtype;
  v_outcome text;
begin
  -- 1. Signature first. An unsigned body is never parsed for meaning.
  v_ok := public.verify_payment_signature(p_body, p_signature, p_provider);
  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'bad_signature');
  end if;

  begin
    v_event := p_body::jsonb;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_payload');
  end;

  v_event_id := v_event->>'id';
  v_type     := v_event->>'event';
  v_order    := v_event #>> '{payload,order_id}';
  v_payment  := v_event #>> '{payload,payment_id}';
  v_reason   := v_event #>> '{payload,failure_reason}';

  if v_event_id is null or v_type is null then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;

  -- 2. Replay defence. A duplicate delivery is a no-op, not a second charge.
  begin
    insert into public.payment_events (provider, provider_event_id, event_type, payload, signature_ok)
    values (p_provider, v_event_id, v_type, v_event, true);
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'duplicate', true, 'event_id', v_event_id);
  end;

  select * into v_txn from public.transactions
    where provider = p_provider and provider_order_id = v_order
    for update;

  if not found then
    update public.payment_events set outcome = 'unknown_order'
      where provider = p_provider and provider_event_id = v_event_id;
    return jsonb_build_object('ok', false, 'error', 'unknown_order', 'order_id', v_order);
  end if;

  -- 3. Terminal states are terminal. A late failure cannot un-succeed a payment.
  if v_txn.status in ('succeeded', 'written_off') then
    update public.payment_events set outcome = 'already_terminal', transaction_id = v_txn.id
      where provider = p_provider and provider_event_id = v_event_id;
    return jsonb_build_object('ok', true, 'ignored', 'already_terminal', 'status', v_txn.status);
  end if;

  if v_type in ('payment.captured', 'order.paid') then
    update public.transactions
      set status = 'succeeded',
          provider_payment_id = coalesce(v_payment, provider_payment_id),
          settled_at = now(),
          failure_reason = null,
          updated_at = now()
      where id = v_txn.id;
    v_outcome := 'succeeded';

  elsif v_type = 'payment.failed' then
    update public.transactions
      set status = case when v_txn.retry_count >= 3 then 'failed'::public.txn_status
                        else 'retry_scheduled'::public.txn_status end,
          failure_reason = coalesce(v_reason, 'unknown'),
          retry_count = least(v_txn.retry_count + 1, 3),
          next_retry_at = case v_txn.retry_count
                            when 0 then now() + interval '6 hours'
                            when 1 then now() + interval '24 hours'
                            when 2 then now() + interval '72 hours'
                            else null end,
          updated_at = now()
      where id = v_txn.id;
    v_outcome := 'failed';

  else
    update public.payment_events set outcome = 'ignored_type', transaction_id = v_txn.id
      where provider = p_provider and provider_event_id = v_event_id;
    return jsonb_build_object('ok', true, 'ignored', 'unhandled_type', 'event', v_type);
  end if;

  update public.payment_events set outcome = v_outcome, transaction_id = v_txn.id
    where provider = p_provider and provider_event_id = v_event_id;

  -- 4. Pot is recomputed, never incremented.
  if v_txn.pool_id is not null then
    perform public.recalc_pool_pot(v_txn.pool_id);
  end if;

  return jsonb_build_object(
    'ok', true, 'outcome', v_outcome, 'transaction_id', v_txn.id, 'event_id', v_event_id
  );
end;
$$;

revoke execute on function public.apply_payment_event(text, text, text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- THE SIMULATOR. Builds a correctly-signed event and feeds it through the very
-- same path a real webhook takes — nothing here short-circuits the state
-- machine. Blocked when the provider is live.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.simulate_payment(
  p_order_id text,
  p_outcome text default 'success',
  p_failure_reason text default 'insufficient_funds'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_live boolean;
  v_secret text;
  v_body text;
  v_sig text;
  v_event_id text;
begin
  select is_live, webhook_secret into v_live, v_secret
    from public.payment_config where provider = 'simulator';

  if v_secret is null then
    return jsonb_build_object('ok', false, 'error', 'simulator_not_configured');
  end if;
  if v_live then
    return jsonb_build_object('ok', false, 'error', 'simulator_disabled_in_live');
  end if;

  v_event_id := 'evt_sim_' || encode(extensions.gen_random_bytes(10), 'hex');

  v_body := (jsonb_build_object(
    'id', v_event_id,
    'event', case when p_outcome = 'success' then 'payment.captured' else 'payment.failed' end,
    'created_at', extract(epoch from now())::bigint,
    'payload', jsonb_build_object(
      'order_id', p_order_id,
      'payment_id', 'pay_sim_' || encode(extensions.gen_random_bytes(8), 'hex'),
      'failure_reason', case when p_outcome = 'success' then null else p_failure_reason end
    )
  ))::text;

  v_sig := encode(extensions.hmac(v_body, v_secret, 'sha256'), 'hex');

  return public.apply_payment_event(v_body, v_sig, 'simulator');
end;
$$;

revoke execute on function public.simulate_payment(text, text, text) from anon, public;
-- Clients may drive the simulator while it is not live; the live guard above
-- is what stops this ever being a way to mint real money.
grant execute on function public.simulate_payment(text, text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- my_pool_payment — what the client needs to render the buy-in state.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_pool_payment(p_pool_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
       'status', t.status, 'amount', t.amount, 'order_id', t.provider_order_id,
       'transaction_id', t.id, 'failure_reason', t.failure_reason,
       'retry_count', t.retry_count
     )
     from public.transactions t
     where t.pool_id = p_pool_id and t.user_id = auth.uid()
       and t.transaction_type = 'deposit'
     order by t.created_at desc limit 1),
    jsonb_build_object('status', 'none')
  );
$$;

revoke execute on function public.my_pool_payment(uuid) from anon, public;
grant execute on function public.my_pool_payment(uuid) to authenticated;
