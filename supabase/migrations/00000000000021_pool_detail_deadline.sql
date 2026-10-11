-- ============================================================================
-- CONQR · Migration 0021 · pool_detail returns the deadline
-- ----------------------------------------------------------------------------
-- The deadline is the single most motivating number in the product — it is
-- what turns a to-do into a stake — and the detail screen could not show it
-- because `pool_detail` never returned `check_in_deadline_utc` or the pool's
-- timezone. Added here, along with `paid_members` so the UI can distinguish
-- "4 people joined" from "2 people actually paid in".
--
-- A `returns table` signature cannot be widened in place, so this is a drop
-- and recreate.
-- ============================================================================

drop function if exists public.pool_detail(uuid);

create function public.pool_detail(p_pool_id uuid)
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
  spectator_count bigint,
  check_in_deadline_utc integer,
  check_in_window_start integer,
  timezone text,
  paid_members bigint
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
    (select count(*) from public.pool_spectators ps where ps.pool_id = p.id),
    p.check_in_deadline_utc,
    p.check_in_window_start,
    p.timezone,
    (select count(*) from public.pool_members pm
      where pm.pool_id = p.id and public.has_settled_buy_in(p.id, pm.user_id))
  from public.pools p
  where p.id = p_pool_id
    and authz.can_view_pool(p.id, auth.uid());
$$;

revoke execute on function public.pool_detail(uuid) from anon, public;
grant execute on function public.pool_detail(uuid) to authenticated;
