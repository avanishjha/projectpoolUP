# CONQR — App Flow & Test Guide

**What this is:** every flow the app supports today, what happens underneath it,
and exactly how to prove it works. This is the document to read before touching
anything, and the document to open when you want to try the app on your phone.

**Maintenance rule (binding):** every feature that lands updates this file in
the same commit — a new section under §3, a new row in §2, and a new walkthrough
in §4. A feature that is not in here is not finished. If a flow changes shape,
the old text is rewritten, not appended to.

Last updated: 2026-10-17 · after **F11.3 Moderation** (migration 0033).

---

## 1. Running it

### 1.1 Cold start

```bash
supabase start
```

```bash
pnpm db:reset
```

```bash
pnpm --dir apps/mobile start
```

`db:reset` reapplies every migration from scratch, loads `supabase/seed.sql`,
and uploads the seed check-in photos to storage. Run it whenever the seed or a
migration changes, and whenever you want the demo data back the way it was.

For the browser instead of a phone:

```bash
pnpm --dir apps/mobile web --port 8090
```

If the browser shows a stale error that does not match the code — the known
Metro trap — restart with `--clear`:

```bash
pnpm --dir apps/mobile web --port 8091 --clear
```

### 1.2 Who to log in as

Every seed number takes the dev OTP **`123456`**.

| Login | Who | What they are good for |
|---|---|---|
| `9800000001` | **Avanish Jha** | admin + operations. The only account that can open the moderation queue. In *75 Hard Boyz*, paid up, 5-day streak. |
| `9800000002` | Priya Sharma | 5-day streak, and one flagged check-in with **no dispute yet** — use this to test the 24h "explain yourself" window. |
| `9800000003` | Rahul Verma | one flagged check-in that **already has a dispute** — use this to see the waiting state, and to see what a moderator reads. |
| `9800000004` | Sneha Kulkarni | pending member of *Subah 5 Baje Club* — pre-start / buy-in states. |
| `9800000005` | Arjun Mehta | active in *No Sugar Squad* (₹99 pool). |
| `9800000006` | Kabir Singh | **delinquent**: one fine collected, one written off after 3 retries. Use for the owed-fines and Pay Now path. |
| `9800000007` | Meera Nair | creator persona, owns *No Sugar Squad*. |

### 1.3 Seed world

- **75 Hard Boyz** (`900d0001…`) — active, ₹499 in, ₹99 a miss, pot ₹2,095,
  4 members (avanish, priya, rahul, kabir).
- **Subah 5 Baje Club** (`900d0002…`) — pending, starts in 2 days.
- **No Sugar Squad** (`900d0003…`) — active, ₹99 pool, meera + arjun.
- Two check-ins start **flagged** (3 reports each) so the moderation queue is
  never empty on a fresh reset.

---

## 2. What exists, at a glance

| Area | Feature | Where it lives | Proof |
|---|---|---|---|
| Identity | Phone OTP, profile, onboarding | `app/(auth)`, `app/(onboarding)` | §4.1 |
| Pools | Create, join by code, detail, leaderboard | `app/create-pool.tsx`, `app/join-pool.tsx`, `app/pool/[id].tsx` | §4.2 |
| Check-ins | Camera-only, liveness prompt, blur score | `app/checkin/[poolId].tsx` | §4.3 |
| Feed | Check-ins + CRON events, reactions, comments, reports | `src/features/feed` | §4.4 |
| Money in | Buy-in, simulated checkout, settlement | `src/features/payments` | §4.5 |
| Money owed | Fines, retries, manual Pay Now | `start_fine_payment`, `my_outstanding_fines` | §4.6 |
| The engine | Nightly judgment, streaks, fines, activation | `process_check_ins`, `activate_pools` | §4.7 |
| Observability | Heartbeat, watchdog, alerts | `cron_health`, `cron_watchdog` | §4.8 |
| Notifications | Queue, quiet hours, daily cap, push tokens | `queue_notification`, `dispatch_notifications` | §4.9 |
| Wallet | Statement, positions, ledger | `app/(tabs)/wallet.tsx` | §4.10 |
| Moderation | Queue, disputes, verdicts, suspensions | `app/admin/moderation.tsx`, `FlaggedCard` | §4.11 |

Counts as of this writing: **36 scope items done, 7 partial, 39 open**
(`docs/00-implementation-scope.md` is the authority).

---

## 3. How the system actually works

### 3.1 The three rules everything obeys

1. **RLS is the boundary.** `useCan()` in the client only decides what to
   render. Every RPC re-checks the capability server-side, and the tests prove
   a non-moderator gets an empty queue rather than a hidden button.
2. **Derived money is a cache.** The pot, fines paid and XP are recomputed with
   `SUM`/`COUNT` over the ledgers, never incremented. A double-processed day
   therefore cannot inflate anything.
3. **The CRON is the single writer** of streaks, misses and compliance.
   Payments are decoupled: the CRON writes fines as `pending`, and a separate
   charger collects them.

### 3.2 Money, and why it cannot go wrong quietly

Every settlement goes through `apply_payment_event`, which is service-role
only — a client cannot mark its own payment succeeded. Four independent layers
of idempotency, all load-bearing:

- unique `provider_event_id` — a replayed webhook is a no-op;
- terminal states are terminal — a late failure cannot un-succeed a settled payment;
- unique `idempotency_key` — one fine per member per day, whoever issues it;
- the pot is recomputed, not incremented.

Participation without paying is legal **only in a free pool**. Paid pools gate
check-ins on a settled buy-in, and `activate_pools` counts only settled members,
so a pool never starts around a pot that does not exist.

### 3.3 Moderation, end to end (F11.3)

1. Three members report a check-in. The existing trigger sets
   `is_verified = false` and it disappears from the feed as *Under review*.
2. The author gets **24h** to explain (`submit_dispute`, minimum 20 characters,
   one dispute per check-in — it is a statement, not an appeal loop).
3. A moderator has **48h**. `moderation_queue` hands them the photo, that day's
   liveness prompt, the blur score, every distinct reason, and the accused's own
   words, in one row.
4. **Upheld** → the check-in stays hidden, the streak resets to 0, the day
   counts as a miss, and **one** ₹fine is queued `pending` — on the same
   idempotency key the CRON uses, so the two can never double-charge. Reporters
   are marked vindicated.
   **Cleared** → the check-in is restored and the reporters are marked wrong.
   Five wrong reports and that person loses the ability to report for 30 days.
5. Either way the author is told, as a **`moderation_verdict`** notification.
   That type is `is_critical`, deliberately: it can cost ₹99, so quiet hours and
   the daily cap must not be able to swallow it.
6. Everything a moderator does lands in `moderation_actions` with the note.

**Known gap, on purpose:** a moderator can still rule on a check-in they
reported themselves. In a 4-person pool, forbidding that would leave nobody able
to moderate at all. The real fix is staff moderators who are not pool members,
and that waits for a moderator roster.

---

## 4. Walkthroughs — tap these on your phone

Each one names the route, the login, and what you should see.

### 4.1 Sign in
`9800000001` → OTP `123456` → Home. Two pools for priya, one for avanish.

### 4.2 Pool detail
Home → **75 Hard Boyz**. Order is deliberate: pot → readiness → anything you owe
→ check-in → invite → feed → rules (collapsed) → destructive actions last.

### 4.3 Check in
Pool → **Replace today's check-in** (or *Check in* if you have not). Camera only —
no gallery. You get a liveness prompt for the day, and a blur score is recorded.

### 4.4 Feed and reporting
Pool → Feed tab → **⋯** on someone's card → the report sheet opens with four
reasons. Three reports hide the check-in. *(This sheet was dead on web before
2026-10-17 — see §6.)*

### 4.5 Buy in
Log in as `9800000004` (sneha) → *Subah 5 Baje Club* → **Pay your buy-in** →
the simulated checkout. Success settles it and you appear in the pot; failure
leaves you outside it and unable to check in.

### 4.6 Pay a fine
Log in as `9800000006` (kabir) → *75 Hard Boyz* → the owed card → **Pay now**.
Customer-initiated, so it bypasses the 24h pre-debit notice by design.

### 4.7 The nightly engine, on demand
```bash
docker exec -i supabase_db_CONQR psql -U postgres -d postgres -c "select public.process_check_ins();"
```
Run it twice. Nothing changes the second time — `last_processed_date` makes it
exactly-once per member-day.

### 4.8 CRON health
```bash
docker exec -i supabase_db_CONQR psql -U postgres -d postgres -c "select public.cron_health();"
```

### 4.9 Notifications
Profile → notifications. Quiet hours are 22:00–07:00 IST and the cap is 4 push a
day — both skipped for `is_critical` types (money, verdicts).

### 4.10 Wallet
Tab bar → **Wallet**. It leads with *In play*, not a balance, and there is no
add-money anywhere: CONQR holds no customer funds, because that would be a
Prepaid Payment Instrument needing an RBI licence.

### 4.11 Moderation — the full round trip

**As the accused:** log in as `9800000002` (priya) → *75 Hard Boyz*. Above the
check-in button: *"Your 16 Oct check-in is under review · 23h left to explain
yourself"* → **Explain what happened** → type at least 20 characters → **Send**.
The card switches to *"Your explanation is with a moderator."*

**As the moderator:** log in as `9800000001` (avanish) → Profile → Settings →
**Staff · Moderation queue** (the row only exists for staff) → both flagged
check-ins, oldest first, with the photo, the reasons, the clock and the
accused's side → **Clear it** or **Uphold**, confirm in the sheet.

Then check the result:

```bash
docker exec -i supabase_db_CONQR psql -U postgres -d postgres -c "select action, verdict, note from public.moderation_actions;"
```

Upholding should leave exactly one `pending` fine:

```bash
docker exec -i supabase_db_CONQR psql -U postgres -d postgres -c "select user_id, amount, status, idempotency_key from public.transactions where transaction_type='fine' and status='pending';"
```

When you are done playing, put the world back:

```bash
pnpm db:reset
```

---

## 5. The test ladder

Run these in order. Nothing is "done" until the rung that applies is green.

```bash
pnpm --dir apps/mobile exec tsc --noEmit
```

```bash
pnpm --dir apps/mobile exec eslint .
```

```bash
pnpm -r test
```

```bash
pnpm test:db
```

`pnpm test:db` runs every harness in `supabase/tests` **twice** — the second
pass is what proves idempotency rather than mere success. Each file is one
transaction that rolls back, so it is safe against a seeded dev database and
leaves nothing behind. A suite that asserts nothing is reported as a failure,
not a pass.

Current state: **216 assertions across 10 suites, green twice.**

| Suite | Assertions | What it defends |
|---|---|---|
| `cron_test` | 18 | streaks, misses, fines, activation, completion |
| `cron_chaos` | 10 | concurrency, partial failure, IST midnight |
| `payments_test` | 30 | the four idempotency layers, the free-pool rule |
| `charger_test` | 21 | retries, write-offs, delinquency, pot recompute |
| `observability_test` | 20 | heartbeat, watchdog, alerting |
| `pre_debit_test` | 19 | the RBI 24h notice gate |
| `manual_pay_test` | 20 | customer-initiated fine payment |
| `notifications_test` | 24 | quiet hours, caps, dedup, critical bypass |
| `wallet_test` | 21 | statement maths, positions, ledger filters |
| `moderation_test` | 33 | the whole of §3.3, including both verdicts |

To run one suite while working on it:

```bash
node scripts/run-sql-tests.mjs moderation --once
```

---

## 6. Things that were wrong, and are not any more

Kept because each one cost real time and would otherwise be rediscovered.

- **`Alert.alert` does nothing on web.** Report-a-check-in and cancel-a-pool
  were dead buttons in the browser preview for as long as they had existed, and
  the first moderation verdict button was too. Replaced by `ConfirmSheet` and
  `ChoiceSheet` in the UI kit — which also look like CONQR rather than like the
  operating system. **Do not reach for `Alert` again.**
- **A verdict notification was being dropped silently.** It used the social
  `verdict` type, so quiet hours ate it. Anything that costs money is
  `is_critical`.
- **The SQL test runner reported 216 suites green while reading zero
  assertions** — `psql` writes `RAISE NOTICE` to stderr and the runner only read
  stdout. It now reads both, and treats a zero-assertion suite as a failure.
- **The ghost organiser.** `create_pool` set `creator_id` but never inserted a
  `pool_members` row, so the organiser could not check in, could not pay, and
  `activate_pools` would *cancel* a pool with creator + 1 joiner. Fixed with a
  backfill in migration 0019.
- **Write grants had leaked to `authenticated`** on seven money and ops tables,
  including the one holding the webhook signing secret. RLS was still blocking
  it, but the second axis mattered; migration 0026 revoked them.
- **Metro serves a stale bundle** after a mid-edit syntax error, and the browser
  console keeps showing the old error. Restart with `--clear`.
- **`expo export` is the definitive check** that code is valid, when the preview
  is lying to you.
