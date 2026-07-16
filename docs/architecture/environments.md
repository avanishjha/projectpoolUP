# CONQR Environments & Deployment Strategy

**Status:** Local implemented (F0.5) · Staging/prod created at hardening phase (per Build Bible: "start with ONE project; create staging and production 2 weeks from launch")

## The three environments

| | Local (now) | Staging (pre-launch) | Production |
|---|---|---|---|
| Supabase | Docker via CLI | Cloud project, **Mumbai ap-south-1** | Cloud project, **Mumbai ap-south-1** (RBI data localisation) |
| Razorpay | Test mode keys | Test mode keys | Live mode (after Razorpay review) |
| App build | Expo Go / dev client | EAS internal distribution | App Store + Play Store |
| Data | `seed.sql` fixtures | Synthetic test pools | Real users, real money |

## Migration discipline

- `supabase/migrations/*.sql` is the **only** way schema changes happen — no Studio-clicked
  changes anywhere, ever. Studio is read/debug only.
- Local: `supabase db reset` replays everything + seed.
- Cloud: `supabase link --project-ref <ref>` once, then `supabase db push` per release.
  Same files, same order, no drift. `seed.sql` is local-only (push ignores it).
- Migrations are append-only once pushed to any cloud env. Editing an unapplied local
  migration is fine; editing a pushed one is never fine.

## Secrets

| Where | What | How |
|---|---|---|
| App bundle | Supabase URL + anon key ONLY | `EXPO_PUBLIC_*` env (safe: anon key is RLS-bound) |
| Edge Functions (local) | Razorpay/MSG91/etc. | `supabase/functions/.env` (git-ignored) |
| Edge Functions (cloud) | Same | `supabase secrets set KEY=value` — encrypted at rest |
| Never | Service-role key in any client, any log, any commit | — |

The anon key is safe to embed because it grants nothing by itself — every request it makes
is bound by the RLS matrix (migration 0007). The service-role key bypasses RLS and exists
only inside Edge Functions.

## Role bootstrap

- **Local:** `seed.sql` grants `admin` + `operations` to the avanish dev user automatically.
- **Staging/prod:** first grant via `scripts/grant-role.sql` over a service connection:
  `psql "$DB_URL" -v phone="'91XXXXXXXXXX'" -v role="'admin'" -f scripts/grant-role.sql`
  After the first admin exists, grants happen in-product (holder of `admin.roles.manage`).

## Storage

| Bucket | Privacy | Cap | Path convention | Read rule |
|---|---|---|---|---|
| `check-ins` | Private — signed URLs only (7-day, NFR-SEC-06) | 1 MB | `{pool_id}/{user_id}/{file}` | pool visibility (same authz helpers as tables) |
| `avatars` | Public-read | 2 MB | `{user_id}/{file}` | anyone authenticated; CDN-cacheable |

The path convention is load-bearing: storage policies authorize by parsing the path, so an
upload to a pool you're not an active member of is rejected by the storage layer itself.

## Daily workflow (current stage)

```bash
supabase start      # once per boot (needs Docker Desktop)
supabase db reset   # nuke + replay migrations + seed → pristine rich dev data
pnpm test           # authz engine
# Studio: http://127.0.0.1:54323  · log in to DB as the seeded personas via JWT claims
```
