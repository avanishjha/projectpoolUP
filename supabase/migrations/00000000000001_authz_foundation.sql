-- ============================================================================
-- CONQR · Migration 0001 · Authorization foundation (RBAC core)
-- ----------------------------------------------------------------------------
-- Platform roles + capability grants live in tables (not enums / hardcoded
-- policy checks) so new roles never require policy rewrites. RLS policies in
-- later migrations call authz.has_capability(...) — the single choke point.
--
-- The role → capability mapping is SEEDED from the TypeScript catalog in
-- packages/authz (migration 0002, generated). Never edit the seed by hand.
--
-- Pool-contextual helpers (is_pool_member, can_view_pool, ...) ship with the
-- product schema migration, since they reference pools / pool_members.
-- ============================================================================

create schema if not exists authz;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table authz.roles (
  key         text primary key,
  description text not null,
  created_at  timestamptz not null default now()
);

comment on table authz.roles is
  'Platform-level roles. Pool personas (organiser/member/spectator) are derived from data, never stored here.';

create table authz.role_capabilities (
  role_key   text not null references authz.roles (key) on delete cascade,
  capability text not null,
  primary key (role_key, capability)
);

comment on table authz.role_capabilities is
  'Generated from packages/authz capability catalog. Do not edit by hand.';

create table authz.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role_key   text not null references authz.roles (key) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

comment on table authz.user_roles is
  'Explicit platform role grants. Every authenticated account implicitly holds the ''user'' role — it is never inserted here.';

create index user_roles_role_key_idx on authz.user_roles (role_key);

-- ── Functions ───────────────────────────────────────────────────────────────
-- SECURITY DEFINER + pinned search_path; STABLE so the planner can cache
-- within a statement. auth.uid() defaults let RLS policies stay terse.

create or replace function authz.has_role(role text, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    role = 'user' and uid is not null
    or exists (
      select 1 from authz.user_roles ur
      where ur.user_id = uid and ur.role_key = role
    );
$$;

create or replace function authz.user_capabilities(uid uuid default auth.uid())
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select rc.capability
  from authz.role_capabilities rc
  where rc.role_key = 'user' and uid is not null
  union
  select rc.capability
  from authz.user_roles ur
  join authz.role_capabilities rc on rc.role_key = ur.role_key
  where ur.user_id = uid;
$$;

create or replace function authz.has_capability(cap text, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    uid is not null
    and (
      exists (
        select 1 from authz.role_capabilities rc
        where rc.role_key = 'user' and rc.capability = cap
      )
      or exists (
        select 1
        from authz.user_roles ur
        join authz.role_capabilities rc on rc.role_key = ur.role_key
        where ur.user_id = uid and rc.capability = cap
      )
    );
$$;

comment on function authz.has_capability(text, uuid) is
  'Platform-level capability check (role-derived only). Pool-contextual conditions are enforced by dedicated helpers + policies on pool tables.';

-- ── Row-Level Security on the authz tables themselves ──────────────────────

alter table authz.roles enable row level security;
alter table authz.role_capabilities enable row level security;
alter table authz.user_roles enable row level security;

-- Role definitions and grants are readable by any authenticated user
-- (they contain no secrets and the client mirrors the same catalog).
create policy roles_read on authz.roles
  for select to authenticated using (true);

create policy role_capabilities_read on authz.role_capabilities
  for select to authenticated using (true);

-- Users see their own role grants; role managers see all.
create policy user_roles_read on authz.user_roles
  for select to authenticated
  using (user_id = auth.uid() or authz.has_capability('admin.roles.manage'));

-- Only role managers mutate grants (service role bypasses RLS by design).
create policy user_roles_insert on authz.user_roles
  for insert to authenticated
  with check (authz.has_capability('admin.roles.manage'));

create policy user_roles_delete on authz.user_roles
  for delete to authenticated
  using (authz.has_capability('admin.roles.manage'));

-- No update policy: a grant is inserted or revoked, never edited.

-- ── Grants for the API roles ────────────────────────────────────────────────

grant usage on schema authz to authenticated, service_role;
grant select on authz.roles, authz.role_capabilities, authz.user_roles to authenticated;
grant insert, delete on authz.user_roles to authenticated; -- gated by RLS above
grant all on all tables in schema authz to service_role;
grant execute on all functions in schema authz to authenticated, service_role;
