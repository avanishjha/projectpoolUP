-- ============================================================================
-- CONQR · Migration 0014 · Check-in submission (F3)
-- ----------------------------------------------------------------------------
-- Writes go through a SECURITY DEFINER RPC for the same reason as pools:
-- INSERT ... RETURNING re-checks the SELECT policy on the new row, and
-- can_view_check_in → can_view_pool is STABLE (can't see the uncommitted
-- row) → the author fails to read back their own check-in. See migration 0012.
--
-- Rules enforced here (FRS §3.2):
--   · pool must be active, membership must be active
--   · one check-in per member per pool per POOL-LOCAL day; a second
--     submission REPLACES the first (FR-CI-07)
--   · check-in must fall inside the pool's window (window_start → deadline)
--   · client capture timestamp is recorded, but the pool-local DAY is
--     computed server-side (phone clocks are not trusted)
-- ============================================================================

create or replace function public.submit_check_in(
  p_pool_id uuid,
  p_image_path text,
  p_caption text default null,
  p_liveness_prompt text default null,
  p_blur_score numeric default null,
  p_client_captured_at timestamptz default now()
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
  v_hour integer;
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
  if v_member.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'membership_' || v_member.status);
  end if;

  -- Pool-local day and hour — never the device clock.
  v_today := (now() at time zone v_pool.timezone)::date;
  v_hour := extract(hour from (now() at time zone 'UTC'))::integer;

  -- Window check: optional start hour → deadline hour (both UTC hours).
  if v_pool.check_in_window_start is not null
     and v_hour < v_pool.check_in_window_start then
    return jsonb_build_object('ok', false, 'error', 'window_not_open');
  end if;

  select * into v_existing from public.check_ins
    where user_id = uid and pool_id = p_pool_id and checkin_date = v_today;

  if found then
    -- Replace today's check-in (FR-CI-07).
    update public.check_ins
      set image_path = p_image_path,
          caption = p_caption,
          liveness_prompt = p_liveness_prompt,
          blur_score = p_blur_score,
          client_captured_at = p_client_captured_at,
          thumbnail_path = null,
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
      p_client_captured_at, v_today
    ) returning id into v_id;
  end if;

  -- Streaks/XP are the CRON's job (F6) — it is the single writer of
  -- competitive state. We return the CURRENT streak for the success screen.
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

comment on function public.submit_check_in(uuid, text, text, text, numeric, timestamptz) is
  'Validated check-in write (FRS §3.2). Only client path into check_ins; second same-day submission replaces the first.';

revoke execute on function public.submit_check_in(uuid, text, text, text, numeric, timestamptz) from anon, public;
grant execute on function public.submit_check_in(uuid, text, text, text, numeric, timestamptz) to authenticated;

-- Has the caller checked in today? Drives the Check In CTA state.
create or replace function public.my_check_in_today(p_pool_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'checked_in', ci.id is not null,
    'check_in_id', ci.id,
    'image_path', ci.image_path,
    'caption', ci.caption,
    'created_at', ci.created_at
  )
  from public.pools p
  left join public.check_ins ci
    on ci.pool_id = p.id
   and ci.user_id = auth.uid()
   and ci.checkin_date = (now() at time zone p.timezone)::date
  where p.id = p_pool_id
    and authz.can_view_pool(p.id, auth.uid());
$$;

revoke execute on function public.my_check_in_today(uuid) from anon, public;
grant execute on function public.my_check_in_today(uuid) to authenticated;
