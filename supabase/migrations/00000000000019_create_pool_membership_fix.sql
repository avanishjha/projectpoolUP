-- ============================================================================
-- CONQR · Migration 0019 · FIX: the creator was not a member of their own pool
-- ----------------------------------------------------------------------------
-- BUG (shipped in 0012, found by the F5.1 regression): create_pool inserted the
-- pool and set creator_id, but never inserted a `pool_members` row for the
-- creator. Everything downstream keys off pool_members, not creator_id, so the
-- organiser was a ghost in their own pool:
--
--   · submit_check_in      → 'not_a_member'; the organiser could never check in
--   · start_checkout       → 'not_a_member'; they could never pay their buy-in
--   · pool_leaderboard     → empty, and the member count read 0
--   · process_pool_day     → iterates pool_members, so they were never judged,
--                            never fined, never credited a streak
--   · activate_pools       → counts pool_members and needs >= 2. A pool with a
--                            creator and one joiner had ONE row, so on its start
--                            date it was CANCELLED instead of activated.
--
-- It escaped every earlier test because the dev seed inserts pool_members rows
-- directly, so seeded pools were always well-formed; only a pool created
-- through the RPC was broken.
--
-- The fix: create_pool now inserts the creator as a member in the same
-- transaction, matching join_pool's shape (status 'pending', grace tokens from
-- the pool). Backfill below repairs any pool already in this state.
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
  v_grace integer := coalesce((p->>'grace_tokens_per_member')::integer, 1);
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
  if v_is_creator_pool and not authz.has_capability('pool.create_creator_pool', uid) then
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
    v_grace,
    coalesce((p->>'payout_rule')::public.payout_rule, 'winner_takes_all'),
    v_is_creator_pool
  )
  returning id, invite_code into v_id, v_code;

  -- THE FIX. Same shape join_pool uses, so a creator and a joiner are
  -- indistinguishable to every downstream consumer.
  insert into public.pool_members (user_id, pool_id, status, grace_tokens)
  values (uid, v_id, 'pending', v_grace)
  on conflict (user_id, pool_id) do nothing;

  return jsonb_build_object('id', v_id, 'invite_code', v_code, 'name', p->>'name');
end;
$$;

comment on function public.create_pool(jsonb) is
  'Creates a pool AND enrols the creator as a member (0019). SECURITY DEFINER so the row is returned without an RLS select-back — see the INSERT...RETURNING snapshot trap.';

-- ── Backfill: enrol creators who were left out by the 0012 version ──────────
insert into public.pool_members (user_id, pool_id, status, grace_tokens)
select p.creator_id,
       p.id,
       case when p.status = 'active' then 'active'::public.member_status
            else 'pending'::public.member_status end,
       p.grace_tokens_per_member
from public.pools p
where p.status in ('pending', 'active')
  and not exists (
    select 1 from public.pool_members pm
    where pm.pool_id = p.id and pm.user_id = p.creator_id
  )
on conflict (user_id, pool_id) do nothing;
