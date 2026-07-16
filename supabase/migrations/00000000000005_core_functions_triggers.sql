-- ============================================================================
-- CONQR · Migration 0005 · Functions & triggers
-- ----------------------------------------------------------------------------
--  1. Unique code generators (referral / invite) + column defaults
--  2. Auto-profile creation on auth signup (HLD: users INSERT = trigger only)
--  3. updated_at maintenance
--  4. Comment depth enforcement (max 3 levels, same-thread integrity)
--  5. Report counters + auto-flag at 3 reports (UC-12)
--  6. Pool-contextual authz helpers (promised in F0.2 design doc)
-- ============================================================================

-- ── 1. Code generators ──────────────────────────────────────────────────────
-- Alphabet drops 0/O/1/I/L to keep codes phone-keyboard and voice friendly.

create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  for attempt in 1..20 loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.users u where u.referral_code = code) then
      return code;
    end if;
  end loop;
  raise exception 'generate_referral_code: exhausted attempts';
end;
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  for attempt in 1..20 loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.pools p where p.invite_code = code) then
      return code;
    end if;
  end loop;
  raise exception 'generate_invite_code: exhausted attempts';
end;
$$;

alter table public.users alter column referral_code set default public.generate_referral_code();
alter table public.pools alter column invite_code set default public.generate_invite_code();

-- ── 2. Auto-profile on signup ───────────────────────────────────────────────
-- HLD RLS matrix: users INSERT = "Auth trigger only". A skeleton row is
-- created the moment auth.users gets a row (OTP verified / OAuth completed);
-- profile setup then UPDATEs username/display_name and stamps onboarded_at.
-- Placeholder username 'user_' + 12 uuid hex chars is unique by construction.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
begin
  -- UUID-prefix collisions are rare but would abort signup entirely —
  -- fall back to random suffixes until unique.
  while exists (select 1 from public.users u where u.username = uname) loop
    uname := 'user_' || substr(md5(random()::text), 1, 12);
  end loop;

  insert into public.users (id, phone, username, display_name, referral_code)
  values (new.id, new.phone, uname, 'New Member', public.generate_referral_code());
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. updated_at maintenance ───────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pools
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pool_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.check_ins
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── 4. Comment threading integrity ─────────────────────────────────────────
-- depth is derived from the parent (never trusted from the client) and capped
-- at 2 (three levels). Replies must stay in their parent's thread.

create or replace function public.set_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_depth integer;
  parent_check_in uuid;
begin
  if new.parent_id is null then
    new.depth := 0;
    return new;
  end if;

  select c.depth, c.check_in_id into parent_depth, parent_check_in
  from public.comments c where c.id = new.parent_id;

  if parent_depth is null then
    raise exception 'Parent comment % not found', new.parent_id;
  end if;
  if parent_check_in <> new.check_in_id then
    raise exception 'Reply must belong to the same check-in as its parent';
  end if;
  if parent_depth >= 2 then
    raise exception 'Maximum comment depth (3 levels) exceeded';
  end if;

  new.depth := parent_depth + 1;
  return new;
end;
$$;

create trigger comments_set_depth before insert on public.comments
  for each row execute function public.set_comment_depth();

-- ── 5. Report counters + auto-flag (UC-12: 3 reports = review queue) ───────
-- Counter is RECALCULATED from the reports table (count, never increment) —
-- the same philosophy as pot math.

create or replace function public.apply_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.check_in_id is not null then
    select count(*) into n from public.reports r where r.check_in_id = new.check_in_id;
    update public.check_ins
      set reported_count = n,
          is_verified = case when n >= 3 then false else is_verified end
      where id = new.check_in_id;
  else
    select count(*) into n from public.reports r where r.comment_id = new.comment_id;
    update public.comments
      set reported_count = n,
          is_hidden = case when n >= 3 then true else is_hidden end
      where id = new.comment_id;
  end if;
  return new;
end;
$$;

create trigger reports_apply after insert on public.reports
  for each row execute function public.apply_report();

-- ── 6. Pool-contextual authz helpers ────────────────────────────────────────
-- SQL mirrors of the @conqr/authz persona derivation, for use in RLS policies
-- (F0.4). SECURITY DEFINER so they can consult pool_members regardless of the
-- caller's row visibility; STABLE for per-statement caching.

create or replace function authz.is_pool_member(pool uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pool_members pm
    where pm.pool_id = pool and pm.user_id = uid
  );
$$;

create or replace function authz.is_active_pool_member(pool uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pool_members pm
    where pm.pool_id = pool and pm.user_id = uid and pm.status = 'active'
  );
$$;

create or replace function authz.is_pool_organiser(pool uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pools p
    where p.id = pool and p.creator_id = uid
  );
$$;

-- Visibility rule = the resolver's persona derivation:
-- organiser OR member (any status) OR public pool OR moderation staff.
create or replace function authz.can_view_pool(pool uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    authz.is_pool_organiser(pool, uid)
    or authz.is_pool_member(pool, uid)
    or exists (
      select 1 from public.pools p
      where p.id = pool and p.visibility = 'public'
    )
    or authz.has_capability('moderation.queue.view', uid);
$$;

grant execute on all functions in schema authz to authenticated, service_role;
