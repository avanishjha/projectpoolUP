-- ============================================================================
-- CONQR · Migration 0029 · MANUAL FINE PAYMENT (F5.6)
-- ----------------------------------------------------------------------------
-- A fine that goes terminal — no mandate registered, or the 6h/24h/72h ladder
-- exhausted — marks the member delinquent, which blocks check-ins and pool
-- creation. Until now there was no way out of that: the charger had given up
-- and nothing let the user settle it themselves.
--
-- WHY THIS PATH SKIPS THE RBI GATE, deliberately:
-- the pre-debit notice governs an AUTO-debit pulled against a mandate without
-- the customer present. A payment the customer initiates, right now, looking
-- at the amount, is not that. Requiring a 24h notice before letting someone
-- pay a debt they are trying to clear would be absurd and is not what the
-- rule asks for.
--
-- Everything else is unchanged: settlement still goes through
-- apply_payment_event, so the same four idempotency layers apply, and the
-- existing sync_fine_side_effects trigger lifts delinquency the moment the
-- debt clears.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- What do I owe, and why? Drives the "you owe" card.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_outstanding_fines(p_pool_id uuid default null)
returns table (
  transaction_id uuid,
  pool_id uuid,
  pool_name text,
  amount numeric,
  status public.txn_status,
  failure_reason text,
  retry_count integer,
  next_retry_at timestamptz,
  incurred_on date,
  is_terminal boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, t.pool_id, p.name, t.amount, t.status, t.failure_reason,
    t.retry_count, t.next_retry_at,
    t.created_at::date,
    (t.status = 'failed')
  from public.transactions t
  join public.pools p on p.id = t.pool_id
  where t.user_id = auth.uid()
    and t.transaction_type = 'fine'
    and t.status in ('pending', 'retry_scheduled', 'failed')
    and (p_pool_id is null or t.pool_id = p_pool_id)
  order by (t.status = 'failed') desc, t.created_at;
$$;

revoke execute on function public.my_outstanding_fines(uuid) from anon, public;
grant execute on function public.my_outstanding_fines(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Open a checkout for one of YOUR OWN fines.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.start_fine_payment(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_txn public.transactions%rowtype;
  v_order text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_txn from public.transactions
    where id = p_transaction_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Yours, and only yours. Never a route to settle someone else's debt.
  if v_txn.user_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'not_yours');
  end if;

  if v_txn.transaction_type <> 'fine' then
    return jsonb_build_object('ok', false, 'error', 'not_a_fine');
  end if;

  if v_txn.status = 'succeeded' then
    return jsonb_build_object('ok', true, 'already_paid', true, 'transaction_id', v_txn.id);
  end if;

  if v_txn.status = 'written_off' then
    return jsonb_build_object('ok', false, 'error', 'written_off');
  end if;

  -- Reuse the attempt's provider reference if the charger already made one,
  -- so a manual payment and an auto-debit can never both settle separately.
  v_order := coalesce(v_txn.provider_order_id,
                      'order_manual_' || encode(extensions.gen_random_bytes(8), 'hex'));

  if v_txn.provider_order_id is null then
    update public.transactions set provider_order_id = v_order where id = v_txn.id;
  end if;

  perform public.ensure_payment_customer(v_txn.provider);

  return jsonb_build_object(
    'ok', true,
    'transaction_id', v_txn.id,
    'order_id', v_order,
    'amount', v_txn.amount,
    'provider', v_txn.provider,
    'manual', true
  );
end;
$$;

comment on function public.start_fine_payment(uuid) is
  'Customer-initiated settlement of an outstanding fine (F5.6). Deliberately bypasses the RBI pre-debit gate: that governs auto-debits pulled without the customer present, not a payment they are making themselves.';

revoke execute on function public.start_fine_payment(uuid) from anon, public;
grant execute on function public.start_fine_payment(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- What a member owes across the whole app — drives the delinquency banner.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_debt_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', coalesce(sum(t.amount), 0),
    'count', count(*),
    'blocking', coalesce(sum(t.amount) filter (where t.status = 'failed'), 0),
    'is_delinquent', authz.is_delinquent(auth.uid())
  )
  from public.transactions t
  where t.user_id = auth.uid()
    and t.transaction_type = 'fine'
    and t.status in ('pending', 'retry_scheduled', 'failed');
$$;

revoke execute on function public.my_debt_summary() from anon, public;
grant execute on function public.my_debt_summary() to authenticated;
