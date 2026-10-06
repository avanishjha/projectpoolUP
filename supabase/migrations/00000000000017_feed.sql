-- ============================================================================
-- CONQR · Migration 0017 · Feed & Social (F4)
-- ----------------------------------------------------------------------------
-- One unified feed: check-in cards + the CRON's pool_events, newest first.
-- All writes go through SECURITY DEFINER RPCs — the F2.1 lesson: a client
-- insert().select() can't read back its own uncommitted row when the SELECT
-- policy depends on that row.
--
-- Visibility is enforced inside every function via authz.can_view_pool().
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- The feed. Two sources unioned, ordered by time, paginated by cursor.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.pool_feed(
  p_pool_id uuid,
  p_limit integer default 30,
  p_before timestamptz default null
)
returns table (
  kind text,                -- 'check_in' | 'event'
  id uuid,
  created_at timestamptz,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  -- check-in fields
  image_path text,
  caption text,
  liveness_prompt text,
  is_verified boolean,
  reported_count integer,
  reaction_count integer,
  comment_count integer,
  my_reaction public.reaction_type,
  current_streak integer,
  -- event fields
  event_type public.event_type,
  metadata jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select authz.can_view_pool(p_pool_id, auth.uid()) as ok
  )
  select * from (
    -- Check-ins
    select
      'check_in'::text as kind,
      ci.id,
      ci.created_at,
      ci.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      ci.image_path,
      ci.caption,
      ci.liveness_prompt,
      ci.is_verified,
      ci.reported_count,
      (select count(*)::integer from public.reactions r where r.check_in_id = ci.id) as reaction_count,
      (select count(*)::integer from public.comments c where c.check_in_id = ci.id and c.deleted_at is null) as comment_count,
      (select r.reaction_type from public.reactions r where r.check_in_id = ci.id and r.user_id = auth.uid()) as my_reaction,
      pm.current_streak,
      null::public.event_type as event_type,
      null::jsonb as metadata
    from public.check_ins ci
    join public.users u on u.id = ci.user_id
    left join public.pool_members pm on pm.pool_id = ci.pool_id and pm.user_id = ci.user_id
    where ci.pool_id = p_pool_id
      and (select ok from allowed)
      and (p_before is null or ci.created_at < p_before)

    union all

    -- Pool events (Wall of Shame, milestones, lifecycle)
    select
      'event'::text,
      pe.id,
      pe.created_at,
      pe.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      null, null, null, null, null,
      0, 0, null::public.reaction_type,
      null::integer,
      pe.event_type,
      pe.metadata
    from public.pool_events pe
    left join public.users u on u.id = pe.user_id
    where pe.pool_id = p_pool_id
      and (select ok from allowed)
      and (p_before is null or pe.created_at < p_before)
  ) feed
  order by created_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

revoke execute on function public.pool_feed(uuid, integer, timestamptz) from anon, public;
grant execute on function public.pool_feed(uuid, integer, timestamptz) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Reactions: one per user per check-in. Tapping the same one removes it.
-- Members AND spectators may react (spec §4.4).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.toggle_reaction(p_check_in_id uuid, p_type public.reaction_type)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool uuid;
  v_existing public.reaction_type;
  v_count integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select pool_id into v_pool from public.check_ins where id = p_check_in_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'check_in_not_found');
  end if;
  if not authz.can_view_pool(v_pool, uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select reaction_type into v_existing from public.reactions
    where check_in_id = p_check_in_id and user_id = uid;

  if v_existing = p_type then
    delete from public.reactions where check_in_id = p_check_in_id and user_id = uid;
    v_existing := null;
  else
    insert into public.reactions (check_in_id, user_id, reaction_type)
    values (p_check_in_id, uid, p_type)
    on conflict (check_in_id, user_id) do update set reaction_type = excluded.reaction_type;
    v_existing := p_type;
    -- XP for engagement (+2, spec §4.1) — only on a NEW reaction.
    insert into public.xp_events (user_id, amount, reason, check_in_id)
    values (uid, 2, 'reaction_given', p_check_in_id);
  end if;

  select count(*)::integer into v_count from public.reactions where check_in_id = p_check_in_id;
  return jsonb_build_object('ok', true, 'my_reaction', v_existing, 'count', v_count);
end;
$$;

revoke execute on function public.toggle_reaction(uuid, public.reaction_type) from anon, public;
grant execute on function public.toggle_reaction(uuid, public.reaction_type) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Comments: pool MEMBERS only (spectators react but never comment).
-- Depth is derived by the existing trigger and capped at 3 levels.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.post_comment(
  p_check_in_id uuid,
  p_body text,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool uuid;
  v_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if length(btrim(coalesce(p_body, ''))) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;

  select pool_id into v_pool from public.check_ins where id = p_check_in_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'check_in_not_found');
  end if;
  -- Membership (any status — eliminated members keep their voice), not spectators.
  if not authz.is_pool_member(v_pool, uid) then
    return jsonb_build_object('ok', false, 'error', 'members_only');
  end if;

  insert into public.comments (check_in_id, user_id, parent_id, body)
  values (p_check_in_id, uid, p_parent_id, btrim(p_body))
  returning id into v_id;

  insert into public.xp_events (user_id, amount, reason, check_in_id)
  values (uid, 3, 'comment_posted', p_check_in_id);

  return jsonb_build_object('ok', true, 'comment_id', v_id);
exception when others then
  -- Depth-cap / same-thread violations arrive as raised exceptions.
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke execute on function public.post_comment(uuid, text, uuid) from anon, public;
grant execute on function public.post_comment(uuid, text, uuid) to authenticated;

-- Threaded comment list for a check-in.
create or replace function public.check_in_comments(p_check_in_id uuid)
returns table (
  id uuid,
  parent_id uuid,
  depth integer,
  body text,
  created_at timestamptz,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_mine boolean,
  is_hidden boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.parent_id, c.depth,
         case when c.deleted_at is not null then '[deleted]' else c.body end,
         c.created_at, c.user_id, u.username, u.display_name, u.avatar_url,
         (c.user_id = auth.uid()), c.is_hidden
  from public.comments c
  join public.users u on u.id = c.user_id
  join public.check_ins ci on ci.id = c.check_in_id
  where c.check_in_id = p_check_in_id
    and authz.can_view_pool(ci.pool_id, auth.uid())
    and (not c.is_hidden or c.user_id = auth.uid() or authz.has_capability('moderation.comment.review', auth.uid()))
  order by c.created_at asc;
$$;

revoke execute on function public.check_in_comments(uuid) from anon, public;
grant execute on function public.check_in_comments(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Reporting (UC-12): 3 reports auto-flag for admin review (handled by the
-- existing reports_apply trigger). You can only report what you can see.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.report_check_in(
  p_check_in_id uuid,
  p_reason public.report_reason,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_pool uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not authz.reporting_allowed(uid) then
    return jsonb_build_object('ok', false, 'error', 'reporting_suspended');
  end if;

  select pool_id into v_pool from public.check_ins where id = p_check_in_id;
  if not found or not authz.can_view_pool(v_pool, uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.reports (reporter_id, check_in_id, reason, detail)
  values (uid, p_check_in_id, p_reason, p_detail)
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.report_check_in(uuid, public.report_reason, text) from anon, public;
grant execute on function public.report_check_in(uuid, public.report_reason, text) to authenticated;
