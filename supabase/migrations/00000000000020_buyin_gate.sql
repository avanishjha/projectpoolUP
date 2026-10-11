-- ============================================================================
-- CONQR · Migration 0020 · THE BUY-IN GATE
-- ----------------------------------------------------------------------------
-- Product decision (Avanish, 2026-10-11): you may only take part in a pool
-- without paying when the pool is FREE. In a pool with a buy-in, a member who
-- has not settled it cannot check in, and the pool will not start around them.
--
-- Three consequences, all implemented here:
--
--   1. submit_check_in refuses an unpaid member of a paid pool.
--   2. activate_pools counts only SETTLED members on a paid pool. Fewer than
--      two who have paid means the pool cancels rather than starting with a
--      pot that does not exist. Members who have paid are promoted to active;
--      members who have not stay pending.
--   3. A payment that settles after the pool has started promotes that member
--      to active immediately, so paying late lets you back in rather than
--      stranding you.
--
-- Also fixes: pool_leaderboard listed every member regardless of state.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- Has this member settled their stake in this pool? Free pools: always yes.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.has_settled_buy_in(p_pool_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce((select buy_in_amount from public.pools where id = p_pool_id), 0) <= 0
      then true
    else exists (
      select 1 from public.transactions t
      where t.pool_id = p_pool_id
        and t.user_id = p_user_id
        and t.transaction_type = 'deposit'
        and t.status = 'succeeded'
    )
  end;
$$;

comment on function public.has_settled_buy_in(uuid, uuid) is
  'The buy-in gate. Free pools (buy_in_amount <= 0) are always settled; paid pools need a succeeded deposit.';

revoke execute on function public.has_settled_buy_in(uuid, uuid) from anon, public;
grant execute on function public.has_settled_buy_in(uuid, uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- submit_check_in — same as 0014 plus the gate. Rebuilt whole rather than
-- patched so the one place that writes a check-in stays readable.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.submit_check_in(
  p_pool_id uuid,
  p_image_path text,
  p_caption text default null,
  p_liveness_prompt text default null,
  p_blur_score numeric default null,
  p_client_captured_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool public.pools%rowtype;
  v_member public.pool_members%rowtype;
  v_today date;
  v_existing public.check_ins%rowtype;
  v_id uuid;
  v_replaced boolean := false;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_pool from public.pools where id = p_pool_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'pool_not_found');
  end if;
  if v_pool.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'pool_not_active');
  end if;

  select * into v_member from public.pool_members
    where pool_id = p_pool_id and user_id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;
  if v_member.status = 'delinquent' then
    return jsonb_build_object('ok', false, 'error', 'membership_delinquent');
  end if;
  if v_member.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'membership_' || v_member.status::text);
  end if;

  -- THE GATE. Free pools pass straight through.
  if not public.has_settled_buy_in(p_pool_id, uid) then
    return jsonb_build_object(
      'ok', false, 'error', 'buy_in_unpaid',
      'amount', v_pool.buy_in_amount
    );
  end if;

  -- The pool's own day, decided by the server. Device clocks are not trusted.
  v_today := (now() at time zone v_pool.timezone)::date;

  if v_today < (v_pool.start_date at time zone v_pool.timezone)::date then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;
  if v_today > (v_pool.end_date at time zone v_pool.timezone)::date then
    return jsonb_build_object('ok', false, 'error', 'pool_ended');
  end if;

  select * into v_existing from public.check_ins
    where pool_id = p_pool_id and user_id = uid and checkin_date = v_today;

  if found then
    update public.check_ins
      set image_path = p_image_path,
          caption = p_caption,
          liveness_prompt = p_liveness_prompt,
          blur_score = p_blur_score,
          client_captured_at = coalesce(p_client_captured_at, now()),
          is_verified = true,
          reported_count = 0,
          updated_at = now()
      where id = v_existing.id
      returning id into v_id;
    v_replaced := true;
  else
    insert into public.check_ins (
      user_id, pool_id, image_path, caption, liveness_prompt, blur_score,
      client_captured_at, checkin_date
    ) values (
      uid, p_pool_id, p_image_path, p_caption, p_liveness_prompt, p_blur_score,
      coalesce(p_client_captured_at, now()), v_today
    ) returning id into v_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'check_in_id', v_id,
    'replaced', v_replaced,
    'checkin_date', v_today,
    'current_streak', v_member.current_streak,
    'pool_name', v_pool.name
  );
end;
$$;

revoke execute on function public.submit_check_in(uuid, text, text, text, numeric, timestamptz) from anon, public;
grant execute on function public.submit_check_in(uuid, text, text, text, numeric, timestamptz) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- activate_pools — only members who have settled count, and only they start.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.activate_pools()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pool public.pools%rowtype;
  v_settled integer;
  v_activated integer := 0;
  v_cancelled integer := 0;
begin
  for v_pool in
    select * from public.pools
    where status = 'pending'
      and start_date <= now()
    order by created_at
    for update skip locked
  loop
    -- A pot that does not exist cannot be played for: count only paid members.
    select count(*) into v_settled
      from public.pool_members pm
      where pm.pool_id = v_pool.id
        and public.has_settled_buy_in(v_pool.id, pm.user_id);

    if v_settled >= 2 then
      update public.pools set status = 'active' where id = v_pool.id;

      -- Only settled members start. Unpaid ones stay pending and can pay in.
      update public.pool_members pm
        set status = 'active', updated_at = now()
        where pm.pool_id = v_pool.id
          and pm.status = 'pending'
          and public.has_settled_buy_in(v_pool.id, pm.user_id);

      insert into public.pool_events (pool_id, user_id, event_type, event_date, metadata)
        values (v_pool.id, null, 'pool_started',
                (now() at time zone v_pool.timezone)::date,
                jsonb_build_object('members', v_settled))
        on conflict do nothing;
      v_activated := v_activated + 1;
    else
      update public.pools set status = 'cancelled' where id = v_pool.id;
      v_cancelled := v_cancelled + 1;
    end if;
  end loop;

  return jsonb_build_object('activated', v_activated, 'cancelled', v_cancelled);
end;
$$;

revoke execute on function public.activate_pools() from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- Paying late lets you in: a settled deposit on a running pool promotes that
-- member from pending to active.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admit_paid_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_type = 'deposit'
     and new.status = 'succeeded'
     and coalesce(old.status, 'pending'::public.txn_status) <> 'succeeded'
     and new.pool_id is not null
  then
    update public.pool_members pm
      set status = 'active', updated_at = now()
      from public.pools p
      where pm.pool_id = new.pool_id
        and pm.user_id = new.user_id
        and pm.status = 'pending'
        and p.id = new.pool_id
        and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists admit_paid_member_trigger on public.transactions;
create trigger admit_paid_member_trigger
  after update on public.transactions
  for each row execute function public.admit_paid_member();

-- ════════════════════════════════════════════════════════════════════════════
-- Punch-list #6 — the leaderboard listed every member regardless of state.
-- Eliminated members stay visible (they are part of the story); members who
-- never started are not standings material.
-- ════════════════════════════════════════════════════════════════════════════
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
      order by pm.current_streak desc, pm.fines_paid asc,
               pm.compliance_pct desc, pm.joined_at asc
    ))::integer,
    pm.user_id, u.username, u.display_name, u.avatar_url,
    pm.status, pm.current_streak, pm.longest_streak, pm.fines_paid,
    pm.misses_count, pm.compliance_pct,
    (pm.user_id = auth.uid())
  from public.pool_members pm
  join public.users u on u.id = pm.user_id
  where pm.pool_id = p_pool_id
    and authz.can_view_pool(p_pool_id, auth.uid())
    and (
      pm.status <> 'pending'
      -- A pending pool has not started, so everyone in it still belongs here.
      or (select p.status from public.pools p where p.id = p_pool_id) = 'pending'
    )
  order by pm.current_streak desc, pm.fines_paid asc,
           pm.compliance_pct desc, pm.joined_at asc;
$$;

revoke execute on function public.pool_leaderboard(uuid) from anon, public;
grant execute on function public.pool_leaderboard(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- pool_start_readiness — what the UI needs to stop a pool cancelling silently
-- (punch-list #8). Free pools are ready as soon as two people are in.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.pool_start_readiness(p_pool_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'members', (select count(*) from public.pool_members pm where pm.pool_id = p.id),
    'settled', (select count(*) from public.pool_members pm
                 where pm.pool_id = p.id and public.has_settled_buy_in(p.id, pm.user_id)),
    'needed', 2,
    'i_have_paid', public.has_settled_buy_in(p.id, auth.uid()),
    'is_free', coalesce(p.buy_in_amount, 0) <= 0,
    'starts_at', p.start_date,
    'will_start', (select count(*) from public.pool_members pm
                    where pm.pool_id = p.id and public.has_settled_buy_in(p.id, pm.user_id)) >= 2
  )
  from public.pools p
  where p.id = p_pool_id and authz.can_view_pool(p.id, auth.uid());
$$;

revoke execute on function public.pool_start_readiness(uuid) from anon, public;
grant execute on function public.pool_start_readiness(uuid) to authenticated;
