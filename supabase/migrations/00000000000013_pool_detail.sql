-- ============================================================================
-- CONQR · Migration 0013 · Pool detail (F2.5)
-- ----------------------------------------------------------------------------
-- Read RPCs for the pool detail screen. SECURITY DEFINER so they can join
-- pool_members → users for the leaderboard and compute counts cleanly, but
-- each ENFORCES authz.can_view_pool(auth.uid()) so visibility is respected.
-- cancel_pool is the organiser's pending-only cancellation (refunds are F5).
-- ============================================================================

-- Pool header + my membership + counts. Empty result = not allowed to view.
create or replace function public.pool_detail(p_pool_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  emoji text,
  challenge_type public.challenge_type,
  status public.pool_status,
  visibility public.visibility,
  start_date timestamptz,
  end_date timestamptz,
  duration_days integer,
  buy_in_amount numeric,
  fine_amount numeric,
  total_pot numeric,
  max_members integer,
  payout_rule public.payout_rule,
  elimination_threshold integer,
  grace_tokens_per_member integer,
  invite_code text,
  creator_id uuid,
  is_organiser boolean,
  my_status public.member_status,
  member_count bigint,
  spectator_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.name, p.description, p.emoji, p.challenge_type, p.status, p.visibility,
    p.start_date, p.end_date,
    (extract(day from (p.end_date - p.start_date)))::integer,
    p.buy_in_amount, p.fine_amount, p.total_pot, p.max_members, p.payout_rule,
    p.elimination_threshold, p.grace_tokens_per_member, p.invite_code, p.creator_id,
    (p.creator_id = auth.uid()) as is_organiser,
    (select pm.status from public.pool_members pm where pm.pool_id = p.id and pm.user_id = auth.uid()) as my_status,
    (select count(*) from public.pool_members pm where pm.pool_id = p.id),
    (select count(*) from public.pool_spectators ps where ps.pool_id = p.id)
  from public.pools p
  where p.id = p_pool_id
    and authz.can_view_pool(p.id, auth.uid());
$$;

revoke execute on function public.pool_detail(uuid) from anon, public;
grant execute on function public.pool_detail(uuid) to authenticated;

-- Ranked member leaderboard (LLD §3.2 sort): streak DESC, fines ASC,
-- compliance DESC, join date ASC. Joins to users for safe profile fields.
create or replace function public.pool_leaderboard(p_pool_id uuid)
returns table (
  rank integer,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  status public.member_status,
  current_streak integer,
  longest_streak integer,
  fines_paid numeric,
  misses_count integer,
  compliance_pct numeric,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (row_number() over (
      order by pm.current_streak desc, pm.fines_paid asc, pm.compliance_pct desc, pm.joined_at asc
    ))::integer as rank,
    pm.user_id, u.username, u.display_name, u.avatar_url,
    pm.status, pm.current_streak, pm.longest_streak, pm.fines_paid, pm.misses_count, pm.compliance_pct,
    (pm.user_id = auth.uid()) as is_me
  from public.pool_members pm
  join public.users u on u.id = pm.user_id
  where pm.pool_id = p_pool_id
    and authz.can_view_pool(p_pool_id, auth.uid())
  order by rank;
$$;

revoke execute on function public.pool_leaderboard(uuid) from anon, public;
grant execute on function public.pool_leaderboard(uuid) to authenticated;

-- Organiser cancels a still-pending pool (FR-POOL-10). Refund of buy-ins is
-- an F5 concern; there are no charges yet.
create or replace function public.cancel_pool(p_pool_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool public.pools%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v_pool from public.pools where id = p_pool_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_pool.creator_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'not_organiser');
  end if;
  if v_pool.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already_started');
  end if;

  update public.pools set status = 'cancelled' where id = p_pool_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.cancel_pool(uuid) from anon, public;
grant execute on function public.cancel_pool(uuid) to authenticated;
