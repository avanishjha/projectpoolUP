# CONQR — Feature Roadmap

**As of 2026-10-11.** Status is read from `docs/00-implementation-scope.md`, which stays the
authoritative checklist. This file adds what the checklist doesn't: sequence, what blocks what,
and an honest read on what is actually left before this can take real money from real people.

Legend: **✅ done** · **◑ partial** (shipped with a named gap) · **○ not started**

---

## Where it stands

| Section | Done | Partial | Open |
|---|---|---|---|
| 0 · Foundation | 7 | 0 | 0 |
| 1 · Auth & Identity | 3 | 1 | 1 |
| 2 · Pools | 4 | 1 | 2 |
| 3 · Check-ins | 4 | 0 | 1 |
| 4 · Feed & Social | 5 | 0 | 1 |
| 5 · Payments | 0 | 0 | **11** |
| 6 · CRON Engine | 2 | 1 | 4 |
| 7 · Wallet | 0 | 0 | 4 |
| 8 · Notifications | 0 | 0 | 4 |
| 9 · Gamification | 0 | 0 | 5 |
| 10 · Growth & Discovery | 0 | 0 | 6 |
| 11 · Trust, Safety & Admin | 0 | 0 | 5 |
| 12 · Platform Quality | 0 | 0 | 10 |
| **Total** | **25** | **3** | **54** |

Item counts flatter the remaining work in one direction and understate it in another. The
**hardest architectural problems are solved** — authorization, the database and its security
envelope, the idempotent fine engine. What's left is mostly breadth, with one genuinely hard
block (payments) sitting directly on the critical path.

---

## What is built

**The core loop runs unattended today.** Sign in with a phone → create or join a pool → post a
camera-only check-in → see it and everyone else's in a live feed → at 23:30 IST the engine
judges the day, breaks streaks, queues fines and writes the Wall of Shame.

- **✅ Foundation** — monorepo, `@conqr/authz` (48 capabilities, 7 roles, 3 derived personas),
  17 migrations, RLS on every table, storage buckets, design system, app shell.
- **✅ Identity** — phone OTP, profile setup, JWT `app_roles` claim wired to authz.
  ◑ account deletion ships; phone change deferred (SRS P1).
- **✅ Pools** — 4-step creation wizard, invite codes + QR + deep links, join with private-pool
  preview, pool detail with a 4-tier leaderboard.
  ◑ Home dashboard ships without per-card check-in state.
- **✅ Check-ins** — camera-only (no gallery path anywhere), liveness prompts, compression under
  500KB, private-bucket upload where the path is the permission, same-day replace.
- **✅ Feed & Social** — unified feed of check-ins + engine events, reactions, threaded comments,
  reporting with auto-flag at 3.
- **✅ The fine engine (F6.1, F6.4)** — four layers of idempotency, per-pool crash isolation,
  pot always recomputed as SUM. 27 assertions including chaos tests. Running live on pg_cron.

---

## Phase 1 — Make the money real

**This is the only phase that is strictly blocking.** The engine queues `status='pending'`
fines right now and nothing charges them. Until this ships, every fine in the product is
theatre and the pot number is fiction.

| | Item | Note |
|---|---|---|
| ○ | **F5.1** Razorpay foundation | Keys in Supabase secrets, customer on first join, webhook endpoint + signature verification. Everything below hangs off this. |
| ○ | **F5.3** UPI Autopay mandate | Registered at join, *before* buy-in. The riskiest integration in the product. |
| ○ | **F5.2** Buy-in | Order edge function, Checkout, capture webhook → transaction. |
| ○ | **F5.4** Fines auto-debit | The worker that drains the pending queue. `transactions_pending_fines_idx` already exists for it. |
| ○ | **F5.5** Retry engine + **F6.2** process-retries | 6h/24h/72h, ≤3 attempts, NPCI-outage detection. |
| ○ | **F5.6** Manual pay fallback | "Pay Now" for failed fines. |
| ○ | **F5.7** Pre-debit notices + **F6.5** cron | **RBI compliance, not optional.** 24h before any debit. |
| ○ | **F5.8** Payouts | Razorpay Route, all 3 payout rules. Pools currently complete without paying out. |
| ○ | **F5.9** Refunds | Cancelled pools refund in full; mandates cancelled. |
| ◑ | **F6.7** external heartbeat | Cronitor/Healthchecks. **Must land before real money** — if the scheduler stops, nothing inside the DB notices. |

Also needs the **development build** (expo-dev-client is already a dependency) — Razorpay needs
native modules and will not run in Expo Go.

*Rough size: the largest block in the project. The Build Bible budgets two weeks; treat that as
a floor given mandate edge cases.*

---

## Phase 2 — Close the loop around the user

The engine works but is silent, and users cannot see their own money.

| | Item | Note |
|---|---|---|
| ○ | **F6.3** send-reminders | Hourly: 3h push, 1h final warning, quiet hours, caps. The recipient list is already derivable from `last_processed_date` + today's check-ins. |
| ○ | **F8.1–8.4** Notifications | Expo Push tokens, WhatsApp Business for the final warning, preferences, deep links. |
| ○ | **F7.1–7.4** Wallet | Balance, transaction history, payout method, GST invoices (**F5.10**). |
| ○ | **F2.6** Pool lifecycle | 48h pending window + reminders, cancellation refunds. Activation and auto-complete already done by F6.4. |
| ○ | **F5.11** Reconciliation | Daily settlement report, UTR tracking. |

The **lock screen / Live Activity** work designed on the canvas lands here — notification
actions work on the current stack, Live Activities need the dev build.

---

## Phase 3 — Safe to put in front of strangers

Cannot launch publicly without this, regardless of how good the loop feels.

| | Item | Note |
|---|---|---|
| ○ | **F11.1–11.5** Trust, Safety & Admin | Admin dashboard, moderation queue for the flagged check-ins F4.6 already produces, dispute resolution, user bans, false-reporter suspension. The capabilities exist in authz; no UI does. |
| ○ | **F12.1–12.10** Platform Quality | Crash reporting, analytics, performance budgets, legal pages, app-store assets, accessibility pass (incl. **F3.1**'s prompt-off mode), error boundaries, offline handling. |
| ○ | **F2.7** Free pools (₹0) | Social-only flow, no Razorpay. Also the safest way to onboard users pre-payments. |
| ○ | **F1.2** Google / Apple Sign-In | Apple Sign-In is an **App Store requirement** if any social login exists. Currently blocked on OAuth credentials. |
| ○ | **F6.6** cleanup-images | 90-day retention. Storage cost and a privacy commitment. |

---

## Phase 4 — Make it spread

Nothing here blocks launch; all of it compounds afterwards.

| | Item | Note |
|---|---|---|
| ○ | **F9.1–9.5** Gamification | XP levels, badges, power-ups (shields/freezes the engine already honours), seasons. The `xp_events` ledger is already being written. |
| ○ | **F10.1–10.6** Growth & Discovery | Public pools, Explore tab (currently an empty state), spectator mode, share cards, referrals. |
| ○ | **F3.4** Offline queue | SRS P1. Matters more as usage grows on patchy connections. |
| ○ | **F4.5** Pot ticker | Animated counter on fine events. |

---

## Critical path, in one line

**F5.1 → F5.3 → F5.2 → F5.4 → F6.7 heartbeat → F6.3/F8 → F11 → launch.**

Everything in Phase 4, and most of Phase 3's polish, can run in parallel or after. The single
decision that moves the launch date is when Razorpay starts.

## The honest risks

1. **UPI Autopay mandates are the hardest thing left.** Registration, approval in the user's UPI
   app, debit authorization, failure modes, cancellation. Budget more than feels reasonable.
2. **Nothing has been tested with real money.** Every payment path is unwritten, so every
   estimate above is less certain than the ones for work already done.
3. **The engine is live and charging nobody.** Fines accumulate as `pending` rows every night.
   That is correct and intentional, but it means the pending queue will have real-looking
   history in it before the charger exists — the backfill decision (charge them or void them)
   should be made deliberately, not by accident.
4. **No external monitoring exists.** Until F6.7's heartbeat lands, a silent scheduler failure
   is invisible.
