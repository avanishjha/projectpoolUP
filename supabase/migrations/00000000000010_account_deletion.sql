-- ============================================================================
-- CONQR · Migration 0010 · Account deletion (F1.5, FR-AUTH-08, DPDP erasure)
-- ----------------------------------------------------------------------------
-- Soft-delete: stamp users.deleted_at. The client CANNOT write deleted_at
-- directly (F0.4 column fence), so this SECURITY DEFINER RPC is the only
-- path — and it can only ever delete the CALLER's own account (auth.uid()).
--
-- Deletion does NOT block on active pools: per FRS §1.3 those pools continue
-- and financial obligations persist (the UPI mandate keeps charging fines
-- until each pool completes). We return the active-pool count so the UI can
-- warn honestly.
--
-- Hard-delete (purge rows, delete check-in images, release the username) runs
-- 30 days later as a scheduled job — built with the CRON engine (F6). Until
-- then the soft-deleted row is retained for reconciliation.
-- ============================================================================

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  active_pools integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select count(*)
  into active_pools
  from public.pool_members pm
  join public.pools p on p.id = pm.pool_id
  where pm.user_id = uid
    and pm.status = 'active'
    and p.status = 'active';

  update public.users
  set deleted_at = coalesce(deleted_at, now())
  where id = uid;

  return jsonb_build_object('deleted', true, 'active_pools', active_pools);
end;
$$;

comment on function public.request_account_deletion() is
  'Soft-deletes the calling user (sets deleted_at). Only path for a client to delete their own account; hard-delete is a later scheduled job.';

revoke execute on function public.request_account_deletion() from anon, public;
grant execute on function public.request_account_deletion() to authenticated;

-- Lets the UI show the active-pool warning before the user confirms, without
-- a bespoke query surface.
create or replace function public.my_active_pool_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.pool_members pm
  join public.pools p on p.id = pm.pool_id
  where pm.user_id = auth.uid()
    and pm.status = 'active'
    and p.status = 'active';
$$;

revoke execute on function public.my_active_pool_count() from anon, public;
grant execute on function public.my_active_pool_count() to authenticated;
