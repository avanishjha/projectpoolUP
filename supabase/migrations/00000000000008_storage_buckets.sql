-- ============================================================================
-- CONQR · Migration 0008 · Storage buckets + object policies (F0.5)
-- ----------------------------------------------------------------------------
-- Two buckets, two very different privacy postures:
--
--   check-ins  PRIVATE. NFR-SEC-06: signed URLs only (7-day expiry), never
--              public. 1MB hard cap (FRS: client compresses <500KB; server
--              rejects >1MB). Path convention: {pool_id}/{user_id}/{file}
--              — the path IS the authorization context.
--
--   avatars    PUBLIC-read (shown on every feed card and leaderboard row;
--              they are already part of the safe profiles projection).
--              2MB cap (FRS §1.2). Path convention: {user_id}/{file}.
--
-- Policies compose the same authz helpers as table RLS — one permission
-- brain everywhere.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('check-ins', 'check-ins', false, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',   'avatars',   true,  2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── check-ins: read follows pool visibility ─────────────────────────────────

create policy "checkins_read_pool_visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'check-ins'
    and authz.can_view_pool(((storage.foldername(name))[1])::uuid)
  );

-- Upload: into your own folder, in a pool where you are an ACTIVE member,
-- while the pool is active. Mirrors the check_ins table INSERT policy.
create policy "checkins_insert_own_active_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'check-ins'
    and (storage.foldername(name))[2] = auth.uid()::text
    and authz.is_active_pool_member(((storage.foldername(name))[1])::uuid)
    and authz.is_pool_active(((storage.foldername(name))[1])::uuid)
  );

-- Replace flow (same-day retake): overwrite your own object only.
create policy "checkins_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'check-ins' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'check-ins' and (storage.foldername(name))[2] = auth.uid()::text);

-- No client DELETE: retention is the cleanup CRON's job (90 days, service role).

-- ── avatars: public read, self-service write in your own folder ────────────

create policy "avatars_read_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
