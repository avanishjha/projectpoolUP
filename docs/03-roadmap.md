# CONQR — Feature Roadmap

**Updated 2026-10-12.** Status is read from `docs/00-implementation-scope.md`, which stays the
authoritative checklist. This file adds what the checklist doesn't: sequence, what blocks what,
and an honest read on what is left before this can take real money from real people.

Legend: **✅ done** · **◑ partial** (shipped with a named gap) · **⏸ blocked externally** · **○ not started**

---

## Where it stands

| Section | Done | Partial | Open |
|---|---|---|---|
| 0 · Foundation | 7 | 0 | 0 |
| 1 · Auth & Identity | 3 | 1 | 1 |
| 2 · Pools | 4 | 2 | 1 |
| 3 · Check-ins | 4 | 0 | 1 |
| 4 · Feed & Social | 5 | 0 | 1 |
| 5 · Payments | 3 | 1 | 7 |
| 6 · CRON Engine | 5 | 0 | 1 |
| 7 · Wallet | 0 | 0 | 4 |
| 8 · Notifications | 0 | 0 | 4 |
| 9 · Gamification | 0 | 0 | 5 |
| 10 · Growth & Discovery | 0 | 0 | 6 |
| 11 · Trust, Safety & Admin | 0 | 0 | 5 |
| 12 · Platform Quality | 0 | 0 | 10 |
| **Total** | **30** | **4** | **48** |

**The engine is complete.** Section 6 is effectively finished and section 5's core —
charging, retries, compliance — runs end to end against a simulator. What remains in
payments is mostly the real provider integration, which is blocked on credentials, plus
payouts.

---

## What is built

**The full money loop runs unattended.** Sign in → create or join a pool → pay the buy-in →
post a camera-only check-in → see it in a live feed → at 23:30 IST the engine judges the day,
breaks streaks, queues fines, issues the legally required pre-debit notice, and 24h later
collects the money, growing the pot and marking non-payers delinquent.

- **✅ Foundation** — `@conqr/authz` (48 capabilities, 7 roles, 3 derived personas), 28
  migrations, RLS on every table, design system, app shell.
- **✅ Identity** — phone OTP, profile, JWT `app_roles` claim. ◑ deletion ships; phone change
  is SRS P1. ⏸ Google/Apple blocked on OAuth credentials (**Apple Sign-In is an App Store
  requirement** once any social login exists).
- **✅ Pools** — 4-step wizard, invites + QR + deep links, join with private preview, detail
  with a ranked leaderboard, and a **start-readiness warning** so a pool can no longer be
  cancelled silently for being short of members.
- **✅ Check-ins** — camera-only, liveness prompts, compression, private-bucket upload,
  same-day replace, **gated on the buy-in having settled** (free pools excepted).
- **✅ Feed & Social** — unified feed of check-ins + engine events, reactions, threaded
  comments, reporting with auto-flag at 3.
- **✅ The engine (F6.1, 6.2, 6.4, 6.5, 6.7)** — four layers of idempotency, per-pool crash
  isolation, pot always recomputed as SUM, plus a watchdog and an outbound dead-man's switch.
- **✅ Money (F5.1, 5.4, 5.5, 5.7)** — provider-agnostic payment layer, the fine charger,
  the 6h/24h/72h retry ladder, delinquency, and RBI pre-debit notices.

**118 assertions** across six SQL suites, run against a live database.

---

## Phase 1 — Connect the real provider

Everything here is **blocked on Razorpay credentials**, and all of it has a working
simulated equivalent today. Swapping in the real provider is a credentials + transport
change, not a rewrite: the signature scheme, state machine, retry ladder and compliance gate
are already real code under test.

| | Item | Note |
|---|---|---|
| ⏸ | **F5.1** real keys + webhook Edge Function | A thin HTTPS shell over `apply_payment_event`. The logic is done. |
| ⏸ | **F5.2** Buy-in via Checkout | Replaces the simulator sheet. |
| ⏸ | **F5.3** UPI Autopay mandate | The riskiest integration left. Registration, in-app approval, failure modes, cancellation. |
| ○ | **F5.6** Manual "Pay Now" | **Not blocked — do this next.** A fine with no mandate or exhausted retries currently has no user-facing way to clear it, and clearing it is what lifts delinquency. |
| ○ | **F5.8** Payouts | Razorpay Route, all 3 payout rules. Pools complete without paying out. |
| ○ | **F5.9** Refunds | Cancelled pools; mandates cancelled. |
| ○ | **F5.10/5.11** GST invoices, reconciliation | |

**Before any live provider:** set `requires_pre_debit_notice` (enforced by trigger), configure
the heartbeat URLs (runbook §4), and **revoke `simulate_payment` from `authenticated`** — it
is guarded by the `is_live` flag today, but that should not be the only thing standing between
a user and free money.

---

## Phase 2 — Give the engine a voice

The engine works and is completely silent. It already queues `pre_debit` notification rows
that nothing delivers.

| | Item | Note |
|---|---|---|
| ○ | **F6.3** send-reminders | 3h push, 1h final warning, quiet hours, caps. The recipient list is already derivable. |
| ○ | **F8.1–8.4** Notifications | Expo Push, WhatsApp for the final warning, preferences, deep links. **The lock-screen / Live Activity work lands here** — notification actions work on the current stack; Live Activities need the dev build. |
| ○ | **F7.1–7.4** Wallet | Balance, history, payout method. Users cannot see their own money. |
| ◑ | **F2.6** Pool lifecycle | Activation and auto-complete done; 48h pending window and cancellation refunds open. |

---

## Phase 3 — Safe to put in front of strangers

| | Item | Note |
|---|---|---|
| ○ | **F11.1–11.5** Trust, Safety & Admin | F4.6 is producing flagged check-ins **right now** and no interface reviews them. Capabilities exist in authz; no UI does. |
| ○ | **F12.1–12.10** Platform Quality | Crash reporting, analytics, legal pages, store assets, accessibility (incl. F3.1's prompt-off mode). |
| ○ | **F2.7** Free pools (₹0) | The buy-in gate already treats them correctly; the dedicated flow is not built. Also the safest pre-payments onboarding. |
| ⏸ | **F1.2** Apple Sign-In | App Store requirement. |
| ○ | **F6.6** cleanup-images | 90-day retention; storage cost and a privacy commitment. |

---

## Phase 4 — Make it spread

Nothing here blocks launch. **F9 gamification is cheaper than it looks** — the `xp_events`
ledger has been accumulating since F6.1, and the engine already honours shields and freezes.

F9 XP/badges/power-ups/seasons · F10 public pools, Explore, spectators, share cards,
referrals · F3.4 offline queue · F4.5 pot ticker.

---

## Critical path

**F5.6 manual pay → Razorpay credentials → F5.2/F5.3 → F5.8 payouts → F6.3/F8 → F11 → launch.**

F5.6 is first because it is the only Phase 1 item not blocked, and it closes a real hole:
today a user can be made delinquent with no way to pay their way out.

## The honest risks

1. **UPI Autopay mandates are the hardest thing left.** Budget more than feels reasonable.
2. **Nothing has touched real money.** Every Phase 1 estimate is softer than the ones for
   work already verified.
3. **Heartbeat URLs are unconfigured.** The watchdog catches a single stalled job; only the
   external switch catches pg_cron dying. Runbook §4, and it is a production step.
4. **Enabling the RBI gate delays every fine by 24h.** That is the rule, not a setting. The
   product copy must say "charged tomorrow", not "charged tonight".
5. **Retries reuse their original pre-debit notice.** A stricter reading would require a
   notice per debit attempt — confirm with the payment partner.
