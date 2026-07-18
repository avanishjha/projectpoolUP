-- ============================================================================
-- CONQR · Migration 0009 · Custom access token hook (F1.4)
-- ----------------------------------------------------------------------------
-- Injects the user's platform roles into every issued JWT as the `app_roles`
-- claim, so the client can build its @conqr/authz Subject without an extra
-- round-trip. RLS remains the real enforcement — this claim is for UI gating
-- and coherence, not security.
--
-- GoTrue calls this as `supabase_auth_admin` on every token issuance
-- (sign-in + refresh). Roles granted mid-session propagate on next refresh.
-- ============================================================================

create or replace function authz.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  roles text[];
begin
  select coalesce(array_agg(ur.role_key order by ur.role_key), '{}')
  into roles
  from authz.user_roles ur
  where ur.user_id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_roles}', to_jsonb(roles));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

comment on function authz.custom_access_token_hook(jsonb) is
  'GoTrue custom access token hook: adds app_roles (platform role keys) to the JWT. Enforcement stays in RLS; this claim only powers client UI gating.';

-- GoTrue runs as supabase_auth_admin: it needs USAGE on the schema to locate
-- the function and EXECUTE to call it. SECURITY DEFINER handles the table read.
grant usage on schema authz to supabase_auth_admin;
revoke execute on function authz.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant execute on function authz.custom_access_token_hook(jsonb) to supabase_auth_admin;
