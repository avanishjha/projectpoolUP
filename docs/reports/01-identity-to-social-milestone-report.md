# CONQR — Identity → Social Milestone Report (F1 → F4, F6.1)

**Period:** 2026-07-17 → 2026-10-06 · **Status:** core loop complete · **Next:** F5 Payments (Razorpay)

Foundation gave the product rails. This milestone put a product on them. By the end of it
CONQR has a **closed core loop that runs unattended**: a user signs in with their phone,
creates or joins a pool, posts a camera-only check-in each day, sees their friends' proof and
trash-talk in a live feed — and at 23:30 IST a fine engine judges the day, breaks streaks,
queues fines and writes the Wall of Shame that everyone wakes up to.

The one thing deliberately missing is money movement. Fines are *recorded*, not *charged* —
that is F5, and the split is intentional (see "Payment decoupling" below).

## By the numbers

| Metric | This milestone | Project total |
|---|---|---|
| SQL migrations | 9 (0009–0017, 1,347 lines) | 17 (2,959 lines) |
| RPCs / functions added | 20 | 20 + authz helpers |
| Mobile app | — | 82 TS/TSX files, 7,226 lines |
| App routes | 13 added | 21 |
| Committed SQL test harnesses | 2 (`cron_test`, `cron_chaos`) | 27 assertions |
| `@conqr/authz` unit tests | unchanged | 27, green |
| Scope items | 25 complete · 3 partial | 55 open |

---

## F1 — Identity

**F1.1 Phone OTP auth.** +91 validation (6–9 start), 6-digit OTP with auto-submit, shake on
error, 30s resend cooldown ×3, 3-wrong lockout. Dev OTP is `123456`.

**F1.3 Profile setup.** First/last name, unique username with live availability and conflict
suggestions, avatar upload, timezone capture. The signup trigger includes a username
collision-fallback loop (UUID-prefixed usernames collided in testing).

**F1.4 Auth → authz wiring.** The custom-access-token hook (migration 0009) injects the
`app_roles` claim; `useSubject()` builds the authz Subject from that claim plus the profile,
and `useCan(capability, poolContext?)` is the client check. RLS remains the real boundary —
client checks only gate UI.

**F1.5 Account management** *(partial)*. Deletion flow is complete and E2E-verified: warning
with a real active-pool count → OTP re-verify → soft delete via SECURITY DEFINER RPC, with
financial obligations persisting and a deleted-user re-login backstop. Phone change is SRS
P1/Phase 2. Hard-delete, image purge and username release are a scheduled job still to be
added to the CRON.

**F1.2 Google / Apple Sign-In — not built, externally blocked** on OAuth credentials. Nothing
in the codebase depends on it.

---

## F2 — Pools

**F2.1 Pool creation.** A 4-step wizard (Vibe → Schedule → Stakes → Review) over a typed
`PoolDraft` with per-step validators, 9 challenge templates, and stake tiers.

**F2.2 Invite system.** 6-char invite code, QR deep link, copy-to-clipboard, native/WhatsApp
share with a `conqr://` link.

**F2.3 Pool join.** Code entry and deep link, with a live preview by code that works for
private pools — holding the code *is* the permission (`preview_pool_by_code`).

**F2.4 Home dashboard** *(partial)*. Pool cards with pot, days remaining and status; the
Create/Join gateway empty state; pull-to-refresh; skeletons; card→detail nav. **Gap:** the
card does not yet show per-pool check-in state or streak — the check-in CTA currently lives
only on pool detail.

**F2.5 Pool detail.** Header, rules grid, and a 4-tier ranked leaderboard
(`current_streak DESC → fines_paid ASC → compliance DESC → joined_at ASC`) with medals, fire
progression and the viewer highlighted. Organiser controls (share invite, cancel while
pending).

**F2.6 Pool lifecycle** — *advanced, not finished.* F6.1 delivered activation (≥2 members →
active, else cancelled) and auto-complete on last-member-standing. Still open: the 48h pending
window with reminders, and refunds on cancellation (both need F5/F8).

### The bug worth remembering

"Could not create pool / session expired on one phone but not another" cost hours and produced
the single most important architectural rule in the codebase. A client `insert().select()`
becomes `INSERT … RETURNING`, which **re-checks the SELECT RLS policy on the new row**; our
visibility helpers are STABLE SECURITY DEFINER, so they run under the INSERT's snapshot and
cannot see the uncommitted row — the creator fails to read back their own pool. It appeared to
work on one phone only because that phone was signed in as the admin seed user, and
`can_view_pool` short-circuits on `moderation.queue.view`.

**Rule, now applied everywhere:** privileged or visibility-gated inserts go through a
SECURITY DEFINER RPC that returns the row. Keep the RLS INSERT policy as defence-in-depth.

---

## F3 — Check-in engine

Camera-only by design — **there is no gallery path anywhere**, because that is the anti-cheat
premise. Random liveness prompts (1-in-3, or 1-in-2 when the fine is ≥₹200) overlay the
viewfinder and are stored with the check-in. Capture → compress (1440px cap, stepped JPEG
quality to <500KB) → upload to the private `check-ins` bucket at `{pool}/{user}/{ts}.jpg`,
where the path itself is the permission → `submit_check_in` RPC → streak celebration.

`submit_check_in` validates pool-active, membership-active and the window, computes the
**pool-local day server-side** (device clocks are untrusted), and **replaces** an existing
same-day check-in rather than duplicating it (FR-CI-07).

Verified through the real API, not just SQL: upload to own path 200 → RPC writes the row →
upload to another user's path **rejected 400**.

**F3.4 offline queue — not built** (SRS P1/Phase 2).

---

## F6.1 — The CRON fine engine

The most important code in the product, built to be safe by construction rather than by luck.
It is **PL/pgSQL called by pg_cron**, not an Edge Function: transactional, no network hop, no
timeout ceiling, and replayable. Entry point `process_check_ins(p_force_date, p_force_pool)`;
both arguments exist for testing and for replaying a missed day.

**Four layers of failsafe, in order:**

1. `pool_members.last_processed_date` — exactly-once per member-day. Re-runs are no-ops.
2. `transactions.idempotency_key` UNIQUE (`pool:user:date:fine`) + `ON CONFLICT DO NOTHING`.
3. `pg_advisory_xact_lock(pool)` — concurrent runs cannot interleave on one pool.
4. Per-pool `BEGIN/EXCEPTION` — a crashing pool rolls back alone, is logged in
   `cron_runs.errors`, and heals on the next tick; siblings are unaffected.

**Invariants:** the pot is ALWAYS `recalc_pool_pot()` = SUM(succeeded deposits + fines), never
incremented. The CRON is the **single writer** of streaks/XP/compliance — which is why the
check-in success screen shows a *projected* streak "confirmed at tonight's deadline".

**Payment decoupling (deliberate — keep it):** the CRON only writes fines as `status='pending'`;
the Razorpay worker will charge them. A payment outage cannot corrupt streak or elimination
state, and a state bug cannot double-charge a card.

**Proof.** 27 assertions across two committed harnesses (`supabase/tests/`). Core: a double run
charges exactly 2 fines/₹200 not 4; pot = SUM; streak 6→7 exactly once; elimination at
threshold; shield consumed without a fine; grace consumed once; streak-freeze preserves the
streak *and* still fines; every event type deduped. Chaos: a pool that **raises mid-processing**
leaves its healthy sibling fully processed, writes zero partial fines, is recorded as `failed`
rather than failing silently, and processes correctly on retry while the already-done pool is
untouched. Live: pg_cron fires every minute and correctly processes 0 pools before the deadline
hour.

Schedules: `process-checkins` every minute · `activate-pools` every 10 min · log pruning 03:17.

Per FRS §4.1 `handleMiss`, shield and grace **return before** `missed_day` is written —
protected members get `shield_used`/`grace_used` events instead. That is correct, not a bug.

---

## F4 — Feed & Social

One unified reverse-chronological feed per pool (`pool_feed`), interleaving check-ins with the
CRON's events. Check-in cards carry the author, streak ring, signed-URL photo, liveness badge,
"Under review" flag, reactions and comments. Event cards render the engine's output in Hinglish:
Wall of Shame ("🚨 Rahul missed a day · Kya hua bhai?"), the fine ("💸 ₹99 added to the pot ·
his miss just made everyone else richer"), milestones, shield/grace, elimination, lifecycle.

**Reactions** — Fire/Flex/Crown/Skull/Respect, one per user; re-tap removes, a different tap
switches; optimistic with rollback. Spectators may react.
**Comments** — threaded ≤3 levels, **members-only** (`post_comment` rejects spectators).
**Reporting** — four reasons, "report what you can see" enforced, suspension-aware; the
existing trigger auto-flags at 3 reports.

Not built: Realtime push (the feed refreshes on pull/focus), F4.5 pot ticker animation,
double-tap shortcut, thumbnails (they need the watermark Edge Function).

---

## Honest ledger

Things a future session should not assume are done:

- **F6.7 external heartbeat is REQUIRED before real money.** The engine is proven under crash,
  concurrency and replay, but if the *scheduler itself* stops, nothing inside the database will
  notice. Internal `cron_runs` logging cannot page anyone. This is NFR-REL-02's top risk and is
  deliberately left open.
- **The blur heuristic is a proxy**, not a Laplacian variance — RN gives no pixel access, so it
  infers from compressed-size entropy. It catches obviously-bad photos; it is not precise.
- **No watermark or thumbnail.** Feed cards load full images via signed URL. Both need an Edge
  Function (F5-era).
- **F3/F4 tests were run inline and are not committed** — only the CRON harnesses are in
  `supabase/tests/`. Re-create them if touching check-ins or the feed.
- Seed check-in rows reference placeholder image paths, so they render "Photo unavailable" in
  the feed. Real camera check-ins display correctly.
- Open by section: F2.6 (lifecycle), F2.7 (free pools), F3.4 (offline queue), F4.5 (pot
  ticker), and all of F5 (payments), F7 (wallet), F8 (notifications), F9 (gamification),
  F10 (growth), F11 (admin/moderation), F12 (platform quality).

## Resuming

Dev loop: `supabase start`, then `pnpm --dir apps/mobile start -- --clear` with Expo Go
(SDK 54). Full ops guide in `docs/02-dev-runbook.md`; the live checklist is
`docs/00-implementation-scope.md`.

Seed logins, OTP `123456`:

| Phone | Who | Exercises |
|---|---|---|
| 9800000003 | rahul | Fresh check-in CTA, full camera flow |

(All seven seed numbers 919800000001-007 are registered in `supabase/config.toml` under
`[auth.sms.test_otp]`. A number absent from that list cannot receive an OTP locally -- it is
routed to the dummy Twilio provider and fails with `sms_send_failed`.)
| 9800000001 | avanish | Admin surfaces, organiser controls |
| 9800000002 | priya | Replace-today's-check-in; a pending pool she owns |
| 9800000006 | kabir | Rejection paths (delinquent) |
| 9999999999 | fresh | Onboarding, create/join from zero |

**Note the engine is live.** Missed days now generate pending fines and break streaks each
night at 23:30 IST. Keep a pool in `pending` if you want it to sit still while testing.

## What F5 inherits

A queue of `status='pending'` fine transactions with a dedicated index
(`transactions_pending_fines_idx`) waiting for a charger, buy-in amounts recorded on every
pool, `total_pot` already correct by construction, and a completion state machine that closes
pools but does not yet pay them out. F5's job: Razorpay customer + UPI Autopay mandate at
join, the fine charger reading that queue, retries, pre-debit notices, and Route payouts at
completion.
