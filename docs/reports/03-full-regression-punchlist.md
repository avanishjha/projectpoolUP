# CONQR — Full Regression & Punch List

**Date:** 2026-10-11 · **Trigger:** F5.1 payment foundation, followed by a full sweep of
everything built so far. Findings are from running the app, not from reading it.

## What was run

| Suite | Result |
|---|---|
| `tsc --noEmit` (mobile) | clean |
| `eslint` (workspace) | clean |
| `@conqr/authz` unit tests | 27 / 27 |
| `supabase/tests/cron_test.sql` | 17 / 17 |
| `supabase/tests/cron_chaos.sql` | 10 / 10 |
| `supabase/tests/payments_test.sql` | 30 / 30 |
| RPC regression (pools, check-ins, feed, guards) | 21 / 21 |
| Browser E2E — login → create pool → buy-in → pot | passed |

All test data created during the sweep was deleted afterwards.

---

## Status at 2026-10-12

**16 of 17 resolved.** The only genuinely outstanding item is **#3** — revoking
`simulate_payment` from `authenticated`, which is on the go-live checklist and guarded by the
`is_live` flag until then. #5 turned out to be a product decision rather than a bug and was
answered by the buy-in gate (migration 0020).

| # | Item | Status |
|---|---|---|
| 1 | Ghost organiser — creator not a member of their own pool | ✅ migration 0019 + backfill |
| 2 | Dev logins broken for 5 of 7 seed users | ✅ `config.toml` |
| 3 | `simulate_payment` callable by clients | ⏳ **go-live checklist** |
| 4 | Two buttons both labelled "Pay ₹499" | ✅ |
| 5 | Unpaid members could participate | ✅ buy-in gate, migration 0020 |
| 6 | Leaderboard listed never-started members | ✅ |
| 7 | Empty-leaderboard copy only true at zero | ✅ |
| 8 | Pool cancelled silently when short of members | ✅ `pool_start_readiness` + banner |
| 9 | Buy-in advisory rather than a gate | ✅ now enforced |
| 10 | No next step after a payment failure | ✅ attempt count + pay-now |
| 11 | Wizard showed duration, not real dates | ✅ |
| 12 | The daily action sat below the fold | ✅ reordered; rules collapsed |
| 13 | Cards only ~4% above the canvas | ✅ elevation ladder + shadows restored |
| 14 | `textMuted` failed WCAG AA | ✅ 38% → 52% |
| 15 | Buy-in card used the shame tone from day zero | ✅ neutral until it actually fails |
| 16 | Seed check-ins rendered "Photo unavailable" | ✅ `pnpm seed:images` |
| 17 | Hinglish in shipped copy | ✅ including two strings in seed data |

Everything still open is tracked in `docs/03-roadmap.md`.

---

## 🔴 Fixed during this pass

### 1. The organiser was a ghost in their own pool — *shipped bug, now fixed*

`create_pool` (migration 0012) set `creator_id` but **never inserted a `pool_members` row**.
Everything downstream keys off `pool_members`, not `creator_id`, so for any pool created
through the app:

- `submit_check_in` → `not_a_member`. **The organiser could never check in to their own pool.**
- `start_checkout` → `not_a_member`. They could never pay their buy-in.
- `pool_leaderboard` was empty and the member count read **0**.
- `process_pool_day` iterates `pool_members`, so the organiser was never judged, never fined,
  never credited a streak.
- **Worst:** `activate_pools` counts `pool_members` and needs ≥ 2. A pool with a creator *and*
  one joiner had **one** row — so on its start date it would be **cancelled instead of
  activated**.

It hid from every earlier test because `seed.sql` inserts `pool_members` directly, so seeded
pools were always well-formed; only RPC-created pools were broken. Found the moment the payment
regression tried to open a checkout as a pool's creator.

Fixed in migration **0019**, with a backfill for any pool already in that state. Verified in the
browser: a freshly created pool now reads "1/20 members", shows "YOU'RE PENDING", and the
organiser can pay.

### 2. Dev logins didn't work for 5 of 7 seed users

`[auth.sms.test_otp]` registered only `...0001` and `...0002`, so the seed accounts recommended
in the milestone report could not receive an OTP locally. All seven are now registered.

---

## 🟠 Needs fixing — correctness

### 3. `simulate_payment` is callable by any authenticated user
Deliberate for now (the client drives the simulator), and guarded by `is_live` on
`payment_config`. **Before Razorpay goes live this grant must be revoked**, not just relied on
by the flag. Add it to the F5 go-live checklist.

### 4. Two buttons on the pool screen read exactly "Pay ₹499"
The banner CTA and the sheet CTA are indistinguishable by label. Confused my own E2E script,
and it will confuse screen-reader users for the same reason. The sheet's should read
**"Pay now"** or **"Confirm ₹499"**.

### 5. No reconciliation between `pool_members` and settled buy-ins
A member can be `active` with no settled deposit. Nothing currently blocks a non-paying member
from taking part, and the pot under-reports relative to the roster. Needs a decision: block
check-ins until paid, or let it ride and chase the debt. **Product call, not a code call.**

### 6. `pool_leaderboard` has no status filter
Eliminated and cancelled members appear in the standings. Right today, probably wrong once
pools get long.

---

## 🟡 Needs better UX

### 7. The empty leaderboard lies
When a pending pool has members, the leaderboard reads *"No members yet. Share the invite to
fill the pool."* That copy is only correct at zero. With the 0019 fix it's rarer, but the
pending-state copy should say how many are in and what's still needed to start.

### 8. Nothing tells you the pool needs 2 people to start
`activate_pools` cancels a pool that has fewer than 2 members on its start date. **The UI never
says this.** A user can create a pool, pay a buy-in, and have it silently cancelled. This is the
highest-impact UX gap found: it should be on the review step, the created screen, and the pool
header.

### 9. The buy-in is advisory, not a gate
The banner appears, but nothing stops you using the pool without paying. Either enforce it or
reword it — right now it reads as a demand with no consequence.

### 10. Payment failure gives no next step
On a declined payment the toast says we'll retry in 6 hours, and then nothing in the UI shows
a pending retry, a countdown, or a "pay now instead" path. The data is there
(`retry_count`, `next_retry_at`); the screen just doesn't use it.

### 11. The create wizard never shows the real dates
Step 2 picks a duration but the review step shows "30 days", not "6 Oct → 5 Nov". People commit
to money against dates, not durations.

### 12. Pool detail is a long scroll with the action at the bottom
Buy-in, check-in CTA and organiser controls all sit below the rules grid and the feed. The one
thing you came to do should not require scrolling past reference material.

---

## 🔵 Needs better UI

### 13. Cards sit ~4% above the canvas
Already written up in `02-design-audit.md` and still unfixed — `cardShadow: {}` on dark plus a
4.5% white fill means nothing reads as a separate plane. Single highest-value visual fix.

### 14. `textMuted` fails WCAG
38% opacity computes to ~2.4:1 and is used for timestamps and helper copy. Should be 52%.

### 15. The buy-in banner uses the "shame" tone
It renders crimson, the same treatment as a missed day. Owing your own buy-in on day zero is not
shameful. It should be neutral-informational until it has actually failed.

### 16. Seed check-ins show "Photo unavailable"
Seeded rows point at placeholder paths with no uploaded object. Harmless but it makes the feed
look broken on first run. Either upload real fixture images or have the seed omit photos.

### 17. Hinglish still in shipped copy
Flagged earlier and still present: the sign-in tagline *"Paisa lagao, discipline dikhao"*, the
feed event copy in `EventCard.tsx`, and `checkin-success.tsx`. Ruled out on 2026-10-06; about
ten minutes to change.

---

## Suggested order

1. **#8** pool needs 2 members (silent cancellation destroys trust, and money is involved)
2. **#5** decide whether unpaid members can participate — blocks the rest of F5
3. **#13 / #14** elevation + contrast — one edit to `themes.ts`, affects every screen
4. **#4 / #15 / #17** copy and tone fixes — cheap
5. **#10 / #11** payment-failure state and real dates
6. **#3** revoke the simulator grant — goes on the F5 go-live checklist
7. **#6 / #7 / #12 / #16** the rest
