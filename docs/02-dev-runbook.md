# CONQR — Dev Runbook & Supabase Operations Guide

Everything needed to run, reset, debug, and (eventually) ship the backend. Companion to
[architecture/environments.md](architecture/environments.md).

---

## 1. Start everything (daily workflow)

```powershell
# 0. Docker Desktop must be running first (Start menu → wait for the whale to settle)

# 1. Backend — from the repo root
cd D:\Projects\CONQR
supabase start          # boots Postgres, Auth, Storage, PostgREST, Studio (~20s warm)

# 2. App — phone via Expo Go
pnpm --dir apps/mobile start        # scan QR; phone + PC on same Wi-Fi
#    App — browser instead
pnpm --dir apps/mobile web          # http://localhost:8081

# When done (optional — it's fine to leave running)
supabase stop           # data persists in a Docker volume
```

**Test logins (local only, no SMS sent):** OTP is always `123456` for:
`9999999999` / `9999999998` / `9999999997` / `9999999996` (fresh accounts — go through
onboarding) · `9800000001` (avanish — admin+ops) · `9800000002` (priya).
Add more under `[auth.sms.test_otp]` in `config.toml` + full `supabase stop`/`start`.

### Daily URLs

| What | URL |
|---|---|
| Studio (browse DB) | http://127.0.0.1:54323 |
| API (the app talks to this) | http://127.0.0.1:54321 |
| Postgres direct | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Metro/web app | http://localhost:8081 |

Keys live in `apps/mobile/.env` (git-ignored); get them any time with `supabase status`.
The **anon/publishable key is safe** (every request it makes is bound by RLS). The
**secret/service key bypasses RLS** — Edge Functions only, never the app, never git.

### Quality gates

```powershell
pnpm test              # authz unit tests
pnpm typecheck         # all packages
pnpm lint
pnpm gen:authz-seed    # after editing packages/authz capability catalog
```

```bash
pnpm test:db
```

Runs every harness in `supabase/tests` twice (the second pass is the
idempotency proof) and fails a suite that asserts nothing. One suite while you
work on it: `node scripts/run-sql-tests.mjs moderation --once`.

### Reset the world

```powershell
supabase db reset      # drop → replay ALL migrations → apply seed.sql (~30s)
```

Gives you back the pristine seeded state (3 pools, 7 personas, kabir's fines).
Do this freely — it's the point of the seed.

---

## 2. Troubleshooting (all previously hit in anger)

| Symptom | Fix |
|---|---|
| `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file` | Docker Desktop isn't running. Start it, wait, retry. |
| `Conflict. The container name "/supabase_vector_CONQR" is already in use` | Stale container from a crashed stop: `docker ps -aq --filter "name=CONQR" \| % { docker rm -f $_ }` then `supabase start`. |
| `failed to merge file config: toml: table X already exists` | You added a section that exists further down in `config.toml`. Merge into the existing block. Note: a broken TOML blocks `supabase stop` too. |
| Phone can't reach OTP / requests hang on device | Windows Firewall: allow inbound TCP 54321 (and 8081) — or once: `netsh advfirewall firewall add rule name="CONQR dev" dir=in action=allow protocol=TCP localport=54321,8081`. Both devices on same Wi-Fi; router client-isolation breaks this → press `s` in Metro for tunnel mode (app JS only; Supabase still needs LAN). |
| `Project is incompatible with this version of Expo Go` | Project is pinned to the SDK your Expo Go supports (54). If it drifts: `npm pkg set dependencies.expo="~54.0.0"` in apps/mobile, `pnpm install`, `npx expo install --fix`. |
| Port 8081 in use | Another Metro is running (fine — reuse it), or kill: `Get-Process node \| Stop-Process`. Claude's preview uses 8090 to avoid clashing with yours. |
| App shows old entry/blank after big changes | Restart Metro with cache clear: `pnpm --dir apps/mobile start -- --clear`. |
| `process is not defined` type errors | `src/types/expo-types.d.ts` must exist (Expo CLI deletes root `expo-env.d.ts`). |
| OTP request → **500** for a seed persona | A manually-inserted `auth.users` row is missing GoTrue's empty-string columns. Seed now inserts complete rows; if you add personas, copy the full-column insert pattern in `seed.sql`. |
| OTP request → **429** | Server-side resend cooldown (30s per number). Wait and retry — repeated taps extend the wait. |

---

### Buttons that do nothing in the browser preview

`Alert.alert` is a silent no-op on react-native-web — no dialog, no error, no
console message. Any confirm or action-sheet built on it is a dead button in the
web preview (and looks like an OS dialog on device, which is also wrong). Use
`ConfirmSheet` or `ChoiceSheet` from `src/ui`.

## 3. Supabase operations guide

### 3.1 The golden rules

1. **Schema changes ONLY via migration files.** Studio is for browsing and ad-hoc queries,
   never for altering tables — a Studio change exists nowhere and dies on the next reset.
2. **Migrations are append-only once pushed to any cloud env.** Locally (nothing pushed yet)
   editing + `db reset` is fine.
3. **Money/streak fields have no client write path.** If a feature needs to write them,
   it goes through an Edge Function with the service key — never a new RLS policy.

### 3.2 Adding a migration

```powershell
# Create supabase/migrations/000000000000NN_short_name.sql  (next number in sequence)
supabase db reset      # replay everything incl. the new one — this IS the test
```

If the authz capability catalog changed: edit `packages/authz/src/{capabilities,personas}.ts`
→ `pnpm gen:authz-seed` → commit the regenerated `0002` seed → `db reset`.

### 3.3 Auth / SMS configuration (the full story)

**Local (already configured, in `supabase/config.toml`):**

```toml
[auth.sms]
enable_signup = true
max_frequency = "30s"          # resend cooldown (spec FRS §1.1)

[auth.sms.test_otp]            # these numbers NEVER hit a real gateway
919999999999 = "123456"
919800000001 = "123456"
919800000002 = "123456"

[auth.sms.twilio]              # dummy — GoTrue demands SOME enabled provider
enabled = true                 # before it serves the OTP endpoint at all
account_sid = "AC000...0"      # test numbers bypass it; real numbers fail loudly
```

- Add a test number: add a line under `[auth.sms.test_otp]`, then **`supabase stop` +
  `supabase start`** (config only applies on a full cycle; `db reset` is NOT enough).
- OTP expiry, lockout, session lifetimes: GoTrue defaults locally; tuned in the cloud
  dashboard at launch. Client-side already enforces the spec numbers (30s resend ×3,
  3 wrong = 5-min lock).

**Production SMS — MSG91/Gupshup (launch-time config, not needed until real users):**

GoTrue natively supports only Twilio/MessageBird/Textlocal/Vonage. MSG91 and Gupshup
(the spec's India picks) connect via the **Auth Send-SMS Hook**:

1. **India prerequisite — DLT registration** (start EARLY, takes days-weeks): register as
   Principal Entity on an operator DLT portal (Jio/Airtel/Vi), get a **Sender ID** (6-char,
   e.g. `CONQRA`) and approve an **SMS template** ("CONQR code: {#var#}..."). MSG91 walks
   you through this; without DLT, transactional SMS to Indian numbers is blocked.
2. Create an MSG91 account → get `AUTHKEY`, create an OTP/Flow template mapped to the DLT
   template ID.
3. Write the hook Edge Function (`supabase/functions/send-sms-hook`): receives
   `{ user, sms: { otp } }` from GoTrue, **verifies the hook signature**
   (standardwebhooks secret), calls MSG91's Flow API with the phone + OTP variable,
   returns 200. Secrets via `supabase secrets set MSG91_AUTH_KEY=...`.
4. Cloud dashboard → **Authentication → Hooks → Send SMS** → point at the function URL,
   copy the generated hook secret into the function's env.
5. Turn OFF the dummy Twilio provider in cloud config; the hook replaces providers.
6. Test with your own number before opening signups; watch delivery rates per-operator
   (Jio/Airtel/Vi/BSNL) in the MSG91 dashboard — SRS requires all four to work.

*(Fallback option: **Textlocal is India-native and GoTrue-native** — API key + sender in
config, no hook needed. Good plan-B if MSG91 integration stalls; still needs DLT.)*

### 3.4 Roles & admin

- **Local:** seed already grants avanish (9800000001) `admin` + `operations`.
- **Staging/prod bootstrap:** `psql "$DB_URL" -v phone="'91XXXXXXXXXX'" -v role="'admin'" -f scripts/grant-role.sql`
- After the first admin exists, grants happen in-product (`admin.roles.manage`).
- Role *definitions* (which capability belongs to which role) are code — TS catalog →
  generated seed. Never editable at runtime, self-heal on deploy.

### 3.5 Storage

Buckets are created by migration 0008 (never by hand): `check-ins` (private, 1MB,
signed-URL only) and `avatars` (public-read, 2MB). The upload path
`{pool_id}/{user_id}/{file}` **is** the permission — policies parse it. Signed URLs come
later from the app via `supabase.storage.from('check-ins').createSignedUrl(path, ttl)`.

### 3.6 Handy direct-DB commands

```powershell
# psql shell into the local DB
docker exec -it supabase_db_CONQR psql -U postgres

# Quick checks
docker exec supabase_db_CONQR psql -U postgres -c "select username, xp from public.users;"
docker exec supabase_db_CONQR psql -U postgres -c "select name, status, total_pot from public.pools;"
docker exec supabase_db_CONQR psql -U postgres -c "select * from authz.user_roles;"

# Auth container env (verify SMS/test-OTP config applied)
docker exec supabase_auth_CONQR printenv | findstr /i "SMS TEST_OTP"
```

### 3.7 Cloud go-live sequence (for when we get there — hardening phase)

1. `supabase projects create` (or dashboard) — **Mumbai ap-south-1**, Pro plan.
2. `supabase link --project-ref <ref>` → `supabase db push` (replays our migrations; seed
   is NOT pushed — it's local-only by design).
3. Dashboard: enable Phone auth; configure the Send-SMS hook (§3.3); set OTP expiry 300s;
   set rate limits.
4. `supabase secrets set` for Razorpay/MSG91/Sentry keys (Edge Functions).
5. Storage buckets arrive via the migrations; verify policies in dashboard.
6. Bootstrap admin (§3.4). Point the app's env at the cloud URL + anon key (EAS env).
7. Repeat identically for a separate prod project when staging proves out.

---

## 4. CRON monitoring (F6.7)

Five scheduled jobs move real money. `cron_runs` records what ran — but a job
that **stops** writes no row at all, so silence looks identical to a quiet
night. That is the failure this section exists to catch.

### Two layers, and why both

| Layer | Catches | Dies when |
|---|---|---|
| `cron_watchdog()` — runs in-database every 5 min | one stalled or failing job, and explains why | pg_cron itself stops |
| **outbound heartbeat** → external dead-man's switch | pg_cron, the database, or the whole project going away | nothing — that's the point |

An in-database watchdog cannot detect its own death. The external switch
alerts on the *absence* of a ping, which is the only signal that survives.

### Checking health

```bash
supabase db reset   # local only
```

```sql
-- One row per monitored job. is_overdue is the column that matters.
select job_name, last_status, is_overdue, minutes_since, open_alerts
from public.cron_health order by is_critical desc, job_name;

-- What is currently wrong, and since when
select job_name, kind, detail, raised_at
from public.cron_alerts where cleared_at is null order by raised_at;
```

`cron_health` is readable by anyone with `ops.cron.monitor`. Alerts are
raised once and cleared automatically when the condition resolves, so a job
down for an hour produces one alert, not twelve.

### Three things the watchdog looks for

- **overdue** — no run inside `every_minutes + grace_minutes`. The job died.
- **failing** — the last three runs all failed. It is running but broken.
- **no_progress** — the subtle one. Fines pending more than 45 minutes while
  `charge-fines` reports success. A green run is not the same as a working
  run.

### Wiring the external switch (REQUIRED before real money)

Heartbeats are a **silent no-op until a URL is configured**, which is correct
for local dev and CI. In production they are not optional.

1. Create one check per job at [healthchecks.io](https://healthchecks.io) (or
   Cronitor). Set each check's period and grace to match
   `cron_jobs_expected`.
2. Store the ping URLs — service role only:

```sql
update public.cron_jobs_expected set heartbeat_url = 'https://hc-ping.com/<uuid>'
 where job_name = 'process-checkins';
-- repeat for charge-fines, activate-pools, process-retries, watchdog
```

3. Confirm they are live:

```sql
select job_name, heartbeat_configured from public.cron_health;
```

Each job pings its base URL on success and `…/fail` on failure, so the
external service learns about a *broken* job as well as a silent one.

**Do not skip the `watchdog` check.** It is the one whose silence means the
scheduler is gone — the other four could all be configured and still tell you
nothing if pg_cron stopped.

### Replaying after an outage

Everything is idempotent, so recovery is just running the jobs again:

```sql
select public.process_check_ins('2026-10-11');  -- a specific missed day
select public.charge_pending_fines();           -- drain the queue
select public.cron_watchdog();                  -- re-evaluate and clear alerts
```

### Pre-debit notices (F5.7) — what changes when you go live

Setting `is_live = true` on a provider is **refused** unless
`requires_pre_debit_notice` is also true; the two move together by trigger.
Once on:

- a fine is **not collectable the night it is incurred** — the notice starts
  a 24h clock and the charger refuses until it elapses
- product copy must say *"charged tomorrow"*, not *"charged tonight"*
- `pre_debit_lead_hours` cannot be set below 24 (check constraint)

```sql
-- Going live, both flags together:
update public.payment_config
   set is_live = true, requires_pre_debit_notice = true
 where provider = 'razorpay';

-- Who is waiting on a notice period right now:
select t.id, t.amount, n.debit_after
from public.transactions t
join public.pre_debit_notices n on n.transaction_id = t.id
where t.status = 'pending' and n.debit_after > now();
```

Retries reuse the original notice rather than waiting another 24h each time.
**Confirm that reading with your payment partner** — a stricter
interpretation would require a notice per debit *attempt*.
