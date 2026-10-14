-- ============================================================================
-- CONQR · Migration 0032 · WALLET — the statement (F7.1 + F7.2 + F7.4)
-- ----------------------------------------------------------------------------
-- NOT a stored-value wallet, and deliberately so. CONQR holds no user
-- balance: buy-ins and fines are pulled from the user's own bank through the
-- UPI Autopay mandate, and payouts go back out through Razorpay Route. There
-- is no `balance` column anywhere in the schema and there must never be one —
-- holding customer funds in India is a Prepaid Payment Instrument and needs
-- an RBI licence.
--
-- So everything below is DERIVED from `transactions`. Same rule as the pot:
-- money is a cache over a ledger, never a counter.
--
-- Users are now receiving push notifications saying they have been charged.
-- This is the screen that lets them verify it.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- Lifetime position. Everything the user has ever paid, lost and won.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_wallet_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select transaction_type, status, amount
    from public.transactions
    where user_id = auth.uid()
  ),
  settled as (
    select
      coalesce(sum(amount) filter (where transaction_type = 'deposit'  and status = 'succeeded'), 0) as deposited,
      coalesce(sum(amount) filter (where transaction_type = 'fine'     and status = 'succeeded'), 0) as fined,
      coalesce(sum(amount) filter (where transaction_type = 'payout'   and status = 'succeeded'), 0) as won,
      coalesce(sum(amount) filter (where transaction_type = 'refund'   and status = 'succeeded'), 0) as refunded,
      coalesce(sum(amount) filter (where transaction_type = 'fine'
                                     and status in ('pending','retry_scheduled','failed')), 0)      as owed
    from t
  ),
  pools as (
    select
      count(*) filter (where pm.status = 'completed')                          as completed,
      count(*) filter (where pm.status = 'active')                             as active,
      count(*) filter (where pm.status = 'eliminated')                         as eliminated
    from public.pool_members pm
    where pm.user_id = auth.uid()
  ),
  -- "In play": money already committed to pools that have not finished.
  in_play as (
    select coalesce(sum(tx.amount), 0) as locked
    from public.transactions tx
    join public.pools p on p.id = tx.pool_id
    where tx.user_id = auth.uid()
      and tx.status = 'succeeded'
      and tx.transaction_type in ('deposit', 'fine')
      and p.status in ('pending', 'active')
  )
  select jsonb_build_object(
    'deposited',  settled.deposited,
    'fined',      settled.fined,
    'won',        settled.won,
    'refunded',   settled.refunded,
    'owed',       settled.owed,
    -- What they are actually up or down: winnings and refunds back, minus
    -- everything that left. Fines they still owe are not counted until paid.
    'net',        (settled.won + settled.refunded) - (settled.deposited + settled.fined),
    'in_play',    in_play.locked,
    'pools_completed', pools.completed,
    'pools_active',    pools.active,
    'pools_eliminated', pools.eliminated,
    'win_rate',   case when pools.completed = 0 then null
                  else round(
                    (select count(*) from public.transactions w
                      where w.user_id = auth.uid()
                        and w.transaction_type = 'payout' and w.status = 'succeeded'
                    )::numeric / pools.completed * 100, 0)
                  end
  )
  from settled, pools, in_play;
$$;

revoke execute on function public.my_wallet_summary() from anon, public;
grant execute on function public.my_wallet_summary() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Per-pool position, with an estimated payout under that pool's own rule.
--
-- The estimate is honest about being one: it moves every night, and it nets
-- off the 5% platform fee and the 18% GST charged on that fee. Showing a
-- gross number people will not receive would be worse than showing nothing.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_pool_positions()
returns table (
  pool_id uuid,
  pool_name text,
  emoji text,
  pool_status public.pool_status,
  my_status public.member_status,
  paid_in numeric,
  fines_paid numeric,
  fines_owed numeric,
  total_pot numeric,
  my_rank integer,
  members integer,
  payout_rule public.payout_rule,
  estimated_payout numeric,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select pm.pool_id, pm.user_id, pm.status, pm.current_streak, pm.fines_paid,
           pm.compliance_pct, pm.joined_at
    from public.pool_members pm
    where pm.user_id = auth.uid()
  ),
  ranked as (
    select
      pm.pool_id, pm.user_id,
      row_number() over (
        partition by pm.pool_id
        order by pm.current_streak desc, pm.fines_paid asc,
                 pm.compliance_pct desc, pm.joined_at asc
      )::integer as rnk,
      count(*) over (partition by pm.pool_id)::integer as member_count,
      sum(pm.compliance_pct) over (partition by pm.pool_id) as total_compliance
    from public.pool_members pm
    where pm.status <> 'pending'
  )
  select
    p.id, p.name, p.emoji, p.status, m.status,
    coalesce((select sum(t.amount) from public.transactions t
              where t.pool_id = p.id and t.user_id = auth.uid()
                and t.transaction_type = 'deposit' and t.status = 'succeeded'), 0),
    coalesce(m.fines_paid, 0),
    coalesce((select sum(t.amount) from public.transactions t
              where t.pool_id = p.id and t.user_id = auth.uid()
                and t.transaction_type = 'fine'
                and t.status in ('pending','retry_scheduled','failed')), 0),
    p.total_pot,
    r.rnk,
    coalesce(r.member_count, 0),
    p.payout_rule,
    -- Net of the 5% platform fee and 18% GST on that fee.
    round(
      case p.payout_rule
        when 'winner_takes_all' then
          case when r.rnk = 1 then p.total_pot else 0 end
        when 'top_3_split' then
          case r.rnk when 1 then p.total_pot * 0.50
                     when 2 then p.total_pot * 0.30
                     when 3 then p.total_pot * 0.20
                     else 0 end
        when 'proportional' then
          case when coalesce(r.total_compliance, 0) > 0
               then p.total_pot * (coalesce(m.compliance_pct, 0) / r.total_compliance)
               else 0 end
        else 0
      end
      * (1 - (p.platform_fee_pct + p.platform_fee_pct * 0.18))
    , 2),
    p.end_date
  from mine m
  join public.pools p on p.id = m.pool_id
  left join ranked r on r.pool_id = p.id and r.user_id = auth.uid()
  where p.status in ('pending', 'active')
  order by p.end_date;
$$;

revoke execute on function public.my_pool_positions() from anon, public;
grant execute on function public.my_pool_positions() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- F7.2 — the ledger. Every rupee that has moved, with the provider's own
-- references so a user can match it against their bank statement.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_ledger(
  p_filter text default 'all',
  p_limit integer default 50,
  p_before timestamptz default null
)
returns table (
  id uuid,
  pool_id uuid,
  pool_name text,
  emoji text,
  amount numeric,
  direction text,
  transaction_type public.txn_type,
  status public.txn_status,
  failure_reason text,
  retry_count integer,
  provider_payment_id text,
  utr_number text,
  gst_amount numeric,
  created_at timestamptz,
  settled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, t.pool_id, p.name, p.emoji, t.amount,
    -- From the user's point of view, not the platform's.
    case when t.transaction_type in ('payout', 'refund') then 'in' else 'out' end,
    t.transaction_type, t.status, t.failure_reason, t.retry_count,
    t.provider_payment_id, t.utr_number, t.gst_amount,
    t.created_at, t.settled_at
  from public.transactions t
  left join public.pools p on p.id = t.pool_id
  where t.user_id = auth.uid()
    and (p_before is null or t.created_at < p_before)
    and case p_filter
          when 'money_in'  then t.transaction_type in ('payout', 'refund')
          when 'money_out' then t.transaction_type in ('deposit', 'fine', 'power_up', 'subscription')
          when 'fines'     then t.transaction_type = 'fine'
          when 'payouts'   then t.transaction_type = 'payout'
          when 'pending'   then t.status in ('pending', 'retry_scheduled', 'failed')
          else true
        end
  order by t.created_at desc
  limit least(coalesce(p_limit, 50), 200);
$$;

revoke execute on function public.my_ledger(text, integer, timestamptz) from anon, public;
grant execute on function public.my_ledger(text, integer, timestamptz) to authenticated;
