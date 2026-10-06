-- ============================================================================
-- CONQR · Migration 0011 · Pool join (F2.3) + invite preview (F2.2)
-- ----------------------------------------------------------------------------
-- pool_members has NO client INSERT policy (F0.4) — joins are privileged. This
-- RPC is the join choke point: it runs the full validation chain (UC-04) and
-- inserts the membership. When Razorpay lands (F5) the paid join flow wraps
-- mandate + buy-in around this same membership write in an Edge Function.
--
-- For now (no payment) members join as 'pending'; pool activation (F2.6 CRON)
-- promotes them to 'active'.
-- ============================================================================

-- Preview a pool by its invite code — works even for PRIVATE pools, because
-- holding the code IS the permission to see the preview (you can't discover it
-- otherwise). Returns limited, non-sensitive fields only.
create or replace function public.preview_pool_by_code(p_code text)
returns table (
  id uuid,
  name text,
  emoji text,
  description text,
  challenge_type public.challenge_type,
  buy_in_amount numeric,
  fine_amount numeric,
  max_members integer,
  member_count bigint,
  start_date timestamptz,
  duration_days integer,
  status public.pool_status,
  already_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.name, p.emoji, p.description, p.challenge_type,
    p.buy_in_amount, p.fine_amount, p.max_members,
    (select count(*) from public.pool_members pm where pm.pool_id = p.id),
    p.start_date,
    (extract(day from (p.end_date - p.start_date)))::integer,
    p.status,
    exists (select 1 from public.pool_members pm where pm.pool_id = p.id and pm.user_id = auth.uid())
  from public.pools p
  where upper(p.invite_code) = upper(trim(p_code));
$$;

revoke execute on function public.preview_pool_by_code(text) from anon, public;
grant execute on function public.preview_pool_by_code(text) to authenticated;

-- Join a pool by invite code. Returns { ok, pool_id?, pool_name?, error? }.
-- Error codes map to UC-04 exception flows.
create or replace function public.join_pool(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool public.pools%rowtype;
  v_count integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if authz.is_delinquent(uid) then
    return jsonb_build_object('ok', false, 'error', 'delinquent');
  end if;

  -- Lock the pool row so concurrent joins can't both take the last slot.
  select * into v_pool from public.pools
    where upper(invite_code) = upper(trim(p_code))
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_pool.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already_started');
  end if;
  if exists (select 1 from public.pool_members pm where pm.pool_id = v_pool.id and pm.user_id = uid) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  select count(*) into v_count from public.pool_members pm where pm.pool_id = v_pool.id;
  if v_count >= v_pool.max_members then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.pool_members (user_id, pool_id, status, grace_tokens)
  values (uid, v_pool.id, 'pending', v_pool.grace_tokens_per_member);

  return jsonb_build_object('ok', true, 'pool_id', v_pool.id, 'pool_name', v_pool.name);
end;
$$;

comment on function public.join_pool(text) is
  'Validated join by invite code (UC-04). Only client path into pool_members. Payment wraps this in F5.';

revoke execute on function public.join_pool(text) from anon, public;
grant execute on function public.join_pool(text) to authenticated;
