-- ============================================================================
-- CONQR · Migration 0007 · Row-Level Security policies (F0.4)
-- ----------------------------------------------------------------------------
-- Access model:
--   * Deny by default. Migration 0004 enabled RLS with zero policies; this
--     migration opens ONLY the documented paths (HLD §4.2 + Extended Spec).
--   * Policies compose authz helpers — never inline role names.
--   * Column-level GRANTs protect sensitive fields where row rules can't:
--     RLS decides WHICH rows, grants decide WHICH columns.
--   * Financial state (transactions, pot, streaks, memberships) has NO client
--     write path at all — service role (CRON / webhooks / edge fns) only.
--   * anon (unauthenticated) can touch nothing in public.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Additional authz helpers needed by policies
-- ════════════════════════════════════════════════════════════════════════════

-- Platform-wide restriction mirror of the resolver: any delinquent membership
-- locks the account out of new financial commitments (UC-09).
create or replace function authz.is_delinquent(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.pool_members pm
    where pm.user_id = uid and pm.status = 'delinquent'
  );
$$;

create or replace function authz.is_pool_active(pool uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.pools p where p.id = pool and p.status = 'active');
$$;

create or replace function authz.is_pool_public(pool uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.pools p where p.id = pool and p.visibility = 'public');
$$;

-- Look up a check-in's pool without tripping check_ins RLS (definer).
create or replace function authz.check_in_pool(check_in uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select ci.pool_id from public.check_ins ci where ci.id = check_in;
$$;

create or replace function authz.can_view_check_in(check_in uuid, uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.can_view_pool(authz.check_in_pool(check_in), uid);
$$;

-- False-reporter lockout (Extended Spec §8.1: 5 cleared reports = 30-day ban).
create or replace function authz.reporting_allowed(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select u.reporting_suspended_until is null or u.reporting_suspended_until < now()
     from public.users u where u.id = uid),
    false
  );
$$;

-- "Today" in a pool's own timezone — the unit check-ins are bucketed by.
create or replace function public.pool_today(pool uuid)
returns date
language sql stable security definer set search_path = ''
as $$
  select (now() at time zone p.timezone)::date from public.pools p where p.id = pool;
$$;

-- The code generators run as the INSERTing user (column defaults execute as
-- invoker) and must see ALL rows for their uniqueness probe, not the caller's
-- RLS-filtered slice.
alter function public.generate_referral_code() security definer;
alter function public.generate_invite_code() security definer;

grant execute on function public.pool_today(uuid) to authenticated, service_role;
grant execute on function public.generate_invite_code() to authenticated, service_role;
grant execute on function public.generate_referral_code() to authenticated, service_role;
grant execute on all functions in schema authz to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Reset the grant surface: Supabase default-grants ALL — take it back.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on all tables in schema public from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. profiles — the safe public projection of users
-- ----------------------------------------------------------------------------
-- Any authenticated user may see any profile (feed avatars, leaderboards),
-- but NEVER phone / UPI / Razorpay ids / push tokens. The view runs as owner
-- (postgres) and so bypasses the strict users policies BY DESIGN, exposing
-- only these columns. App code joins profiles, never users.
-- ════════════════════════════════════════════════════════════════════════════

create view public.profiles as
  select id, username, display_name, avatar_url, xp, level, is_pro, is_creator, created_at
  from public.users
  where deleted_at is null and banned_at is null;

comment on view public.profiles is
  'Safe public projection of users. Deliberately owner-executed (bypasses users RLS) to expose exactly these columns to any authenticated user.';

grant select on public.profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. users — own full row; staff lookup; column-fenced self-service updates
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.users to authenticated;
grant update (username, display_name, avatar_url, language_pref, default_upi_id,
              timezone, push_token, onboarded_at)
  on public.users to authenticated;

create policy users_select_own_or_staff on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or authz.has_capability('admin.users.view')
    or authz.has_capability('support.users.lookup')
  );

create policy users_update_own on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT policy: profile rows are born from the auth trigger only.
-- No DELETE policy: account deletion is an edge-function flow (OTP re-verify,
-- soft delete). xp/level/lifetime_*/is_pro/is_creator/moderation columns are
-- absent from the UPDATE grant — clients cannot touch them on any row.

-- ════════════════════════════════════════════════════════════════════════════
-- 5. pools — visible per persona; create with fenced columns; edit while pending
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.pools to authenticated;
grant insert (name, description, emoji, creator_id, challenge_type, start_date,
              end_date, check_in_deadline_utc, check_in_window_start, timezone,
              buy_in_amount, fine_amount, check_in_type, visibility, max_members,
              elimination_threshold, grace_tokens_per_member, payout_rule,
              is_creator_pool)
  on public.pools to authenticated;
grant update (name, description, emoji, challenge_type, start_date, end_date,
              check_in_deadline_utc, check_in_window_start, visibility,
              max_members, elimination_threshold, grace_tokens_per_member,
              payout_rule)
  on public.pools to authenticated;

create policy pools_select_visible on public.pools
  for select to authenticated
  using (authz.can_view_pool(id));

create policy pools_insert_own on public.pools
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and status = 'pending'
    and authz.has_capability('pool.create')
    and not authz.is_delinquent()
    and (not is_creator_pool or authz.has_capability('creator.pool.create'))
  );

-- Organiser edits while pending only. Stakes (buy_in/fine) are immutable —
-- excluded from the UPDATE grant; money terms never change under people.
create policy pools_update_organiser_pending on public.pools
  for update to authenticated
  using (creator_id = auth.uid() and status = 'pending')
  with check (creator_id = auth.uid() and status = 'pending');

-- No DELETE policy (HLD: never). Cancellation = edge function (refund flow).
-- status / total_pot / platform_fee_pct / invite_code / razorpay_order_id are
-- not client-writable: absent from both INSERT and UPDATE grants.

-- ════════════════════════════════════════════════════════════════════════════
-- 6. pool_members — competitive state readable; mandate ids fenced; no client writes
-- ════════════════════════════════════════════════════════════════════════════

grant select (user_id, pool_id, status, current_streak, longest_streak,
              grace_tokens, shield_active, streak_freeze_active, fines_paid,
              misses_count, compliance_pct, joined_at, updated_at)
  on public.pool_members to authenticated;
-- razorpay_mandate_id / razorpay_token_id deliberately ungranted.

create policy pool_members_select_visible on public.pool_members
  for select to authenticated
  using (authz.can_view_pool(pool_id));

-- No INSERT (joins are the payment edge function), no UPDATE (CRON owns
-- streaks/fines/status), no DELETE (memberships are permanent record).

-- ════════════════════════════════════════════════════════════════════════════
-- 7. transactions — own ledger + finance/support read; zero client writes
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.transactions to authenticated;

create policy transactions_select_own_or_staff on public.transactions
  for select to authenticated
  using (
    user_id = auth.uid()
    or authz.has_capability('support.transactions.view')
    or authz.has_capability('finance.reconciliation.view')
  );

-- No INSERT/UPDATE/DELETE policies: every rupee moves via service role.

-- ════════════════════════════════════════════════════════════════════════════
-- 8. check_ins — view per pool visibility; insert/replace own, today, active
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.check_ins to authenticated;
grant insert (id, user_id, pool_id, image_path, caption, liveness_prompt,
              blur_score, client_captured_at, checkin_date)
  on public.check_ins to authenticated;
grant update (image_path, caption, liveness_prompt, blur_score, client_captured_at)
  on public.check_ins to authenticated;

create policy check_ins_select_visible on public.check_ins
  for select to authenticated
  using (authz.can_view_pool(pool_id));

-- Insert: yourself, as an ACTIVE member of an ACTIVE pool, for the pool-local
-- TODAY only. Backdating (erasing a miss) is structurally impossible.
create policy check_ins_insert_own_today on public.check_ins
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and authz.is_active_pool_member(pool_id)
    and authz.is_pool_active(pool_id)
    and checkin_date = public.pool_today(pool_id)
  );

-- Replace flow (FR-CI-07): today's own check-in only. History is immutable.
create policy check_ins_update_own_today on public.check_ins
  for update to authenticated
  using (user_id = auth.uid() and checkin_date = public.pool_today(pool_id))
  with check (
    user_id = auth.uid()
    and authz.is_active_pool_member(pool_id)
    and authz.is_pool_active(pool_id)
    and checkin_date = public.pool_today(pool_id)
  );

-- is_verified / reported_count / thumbnail_path are server-owned (ungranted).

-- ════════════════════════════════════════════════════════════════════════════
-- 9. reactions — react to anything you can see (members AND spectators)
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.reactions to authenticated;
grant insert (check_in_id, user_id, reaction_type) on public.reactions to authenticated;
grant update (reaction_type) on public.reactions to authenticated;
grant delete on public.reactions to authenticated;

create policy reactions_select_visible on public.reactions
  for select to authenticated
  using (authz.can_view_check_in(check_in_id));

create policy reactions_insert_own on public.reactions
  for insert to authenticated
  with check (user_id = auth.uid() and authz.can_view_check_in(check_in_id));

create policy reactions_update_own on public.reactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reactions_delete_own on public.reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 10. comments — members only (spectators may NOT comment); edit/soft-delete own
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.comments to authenticated;
grant insert (id, check_in_id, user_id, parent_id, body) on public.comments to authenticated;
grant update (body, deleted_at) on public.comments to authenticated;

create policy comments_select_visible on public.comments
  for select to authenticated
  using (
    authz.can_view_check_in(check_in_id)
    and (not is_hidden or user_id = auth.uid()
         or authz.has_capability('moderation.comment.review'))
  );

-- Membership (any status — eliminated members keep their voice), not spectators.
create policy comments_insert_members on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and authz.is_pool_member(authz.check_in_pool(check_in_id))
  );

create policy comments_update_own on public.comments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Soft delete = update body='' + deleted_at. depth is trigger-derived
-- (ungranted); is_hidden / reported_count are server-owned.

-- ════════════════════════════════════════════════════════════════════════════
-- 11. pool_events — feed events readable per pool visibility; CRON-written
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.pool_events to authenticated;

create policy pool_events_select_visible on public.pool_events
  for select to authenticated
  using (authz.can_view_pool(pool_id));

-- ════════════════════════════════════════════════════════════════════════════
-- 12. power_up_inventory — own arsenal is private; purchase/consume via server
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.power_up_inventory to authenticated;

create policy power_ups_select_own on public.power_up_inventory
  for select to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 13. badges / user_badges — public flair
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.badges to authenticated;
grant select on public.user_badges to authenticated;

create policy badges_select_all on public.badges
  for select to authenticated using (true);

create policy user_badges_select_all on public.user_badges
  for select to authenticated using (true);

-- Awards are written by the service-role award engine only.

-- ════════════════════════════════════════════════════════════════════════════
-- 14. xp_events — own ledger, read-only
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.xp_events to authenticated;

create policy xp_events_select_own on public.xp_events
  for select to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 15. notifications — own inbox; client may only mark as read
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 16. notification_preferences — fully self-service
-- ════════════════════════════════════════════════════════════════════════════

grant select, insert, update, delete on public.notification_preferences to authenticated;

create policy notif_prefs_all_own on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 17. reports — report what you can see, unless reporting-suspended
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.reports to authenticated;
grant insert (reporter_id, check_in_id, comment_id, reason, detail)
  on public.reports to authenticated;
grant update (status, resolved_by, resolved_at) on public.reports to authenticated;

create policy reports_select_own_or_mod on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or authz.has_capability('moderation.queue.view'));

-- The EXISTS probes run under the target tables' own RLS as the caller:
-- "you can report exactly what you can see."
create policy reports_insert_visible_target on public.reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and authz.reporting_allowed()
    and (check_in_id is null
         or exists (select 1 from public.check_ins ci where ci.id = check_in_id))
    and (comment_id is null
         or exists (select 1 from public.comments c where c.id = comment_id))
  );

create policy reports_update_moderation on public.reports
  for update to authenticated
  using (authz.has_capability('moderation.checkin.review'))
  with check (
    authz.has_capability('moderation.checkin.review')
    and (resolved_by is null or resolved_by = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 18. disputes — dispute your own fine within 24h; admins resolve
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.disputes to authenticated;
grant insert (transaction_id, user_id, reason) on public.disputes to authenticated;
grant update (status, resolved_by, resolution_note, resolved_at)
  on public.disputes to authenticated;

create policy disputes_select_own_or_admin on public.disputes
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('admin.disputes.resolve'));

create policy disputes_insert_own_fine_24h on public.disputes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and t.user_id = auth.uid()
        and t.transaction_type = 'fine'
        and t.created_at > now() - interval '24 hours'
    )
  );

create policy disputes_update_admin on public.disputes
  for update to authenticated
  using (authz.has_capability('admin.disputes.resolve'))
  with check (
    authz.has_capability('admin.disputes.resolve')
    and (resolved_by is null or resolved_by = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 19. subscriptions — own Pro state, read-only (webhooks write)
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.subscriptions to authenticated;

create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 20. pool_spectators — follow public pools; counts visible with the pool
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.pool_spectators to authenticated;
grant insert (pool_id, user_id) on public.pool_spectators to authenticated;
grant delete on public.pool_spectators to authenticated;

create policy spectators_select_visible on public.pool_spectators
  for select to authenticated
  using (authz.can_view_pool(pool_id));

create policy spectators_insert_public on public.pool_spectators
  for insert to authenticated
  with check (user_id = auth.uid() and authz.is_pool_public(pool_id));

create policy spectators_delete_own on public.pool_spectators
  for delete to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 21. cron_runs — operations staff only
-- ════════════════════════════════════════════════════════════════════════════

grant select on public.cron_runs to authenticated;

create policy cron_runs_select_ops on public.cron_runs
  for select to authenticated
  using (authz.has_capability('ops.cron.monitor'));
