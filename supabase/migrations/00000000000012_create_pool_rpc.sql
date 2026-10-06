-- ============================================================================
-- CONQR · Migration 0012 · create_pool RPC (F2.1 fix)
-- ----------------------------------------------------------------------------
-- The client used `insert(...).select()`. PostgREST turns that into
-- INSERT ... RETURNING, which re-checks the SELECT RLS policy on the NEW row.
-- can_view_pool → is_pool_organiser is STABLE, so it runs under the INSERT's
-- snapshot and CANNOT see the row being inserted → the creator can't read
-- back their own just-created pool → 42501. (Admins slipped through only
-- because moderation.queue.view short-circuits can_view_pool.)
--
-- Fix: create through a SECURITY DEFINER RPC that validates like the RLS
-- policy did, inserts, and returns the invite code directly — no select-back,
-- no snapshot trap. Consistent with join_pool / account deletion. The RLS
-- INSERT policy stays as defence-in-depth for any direct write.
-- ============================================================================

create or replace function public.create_pool(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_code text;
  v_is_creator_pool boolean := coalesce((p->>'is_creator_pool')::boolean, false);
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if authz.is_delinquent(uid) then
    raise exception 'delinquent' using errcode = '42501';
  end if;
  if not authz.has_capability('pool.create', uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_is_creator_pool and not authz.has_capability('creator.pool.create', uid) then
    raise exception 'forbidden_creator_pool' using errcode = '42501';
  end if;

  insert into public.pools (
    name, description, emoji, creator_id, challenge_type, start_date, end_date,
    check_in_deadline_utc, check_in_window_start, buy_in_amount, fine_amount,
    visibility, elimination_threshold, grace_tokens_per_member, payout_rule, is_creator_pool
  ) values (
    p->>'name',
    nullif(p->>'description', ''),
    coalesce(nullif(p->>'emoji', ''), '🔥'),
    uid,
    (p->>'challenge_type')::public.challenge_type,
    (p->>'start_date')::timestamptz,
    (p->>'end_date')::timestamptz,
    (p->>'check_in_deadline_utc')::integer,
    nullif(p->>'check_in_window_start', '')::integer,
    (p->>'buy_in_amount')::numeric,
    (p->>'fine_amount')::numeric,
    coalesce((p->>'visibility')::public.visibility, 'private'),
    nullif(p->>'elimination_threshold', '')::integer,
    coalesce((p->>'grace_tokens_per_member')::integer, 1),
    coalesce((p->>'payout_rule')::public.payout_rule, 'winner_takes_all'),
    v_is_creator_pool
  )
  returning id, invite_code into v_id, v_code;

  return jsonb_build_object('id', v_id, 'invite_code', v_code, 'name', p->>'name');
end;
$$;

comment on function public.create_pool(jsonb) is
  'Validated pool creation. Avoids the INSERT...RETURNING snapshot trap that blocked non-admin creators from reading back their own new pool.';

revoke execute on function public.create_pool(jsonb) from anon, public;
grant execute on function public.create_pool(jsonb) to authenticated;
