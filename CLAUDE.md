# CONQR — working agreement

India-first accountability app: friend pools, real-money stakes, daily photo
check-ins, automated UPI-Autopay fines, pot payouts. INR only.

## Source of truth
The 8 `.docx` specs in `docs/` (SRS, FRS, UseCases, HLD, LLD, BuildBible,
Extended Spec v2 India, India Edition v2) are **canonical**. Read them; do not
guess. Working trackers I keep current:
- `docs/00-implementation-scope.md` — F-numbered checklist. **Update the
  checkboxes as features complete**, and record what was deliberately deferred
  and why (don't silently mark a partial item done).
- `docs/01-build-order.md` — dependency graph + serial order.
- `docs/02-dev-runbook.md` — daily commands, troubleshooting, Supabase ops.
- `docs/architecture/{authorization,database,environments}.md`

## How to work
Build the **real production product**, not an MVP prototype. No shortcuts for
free-tier limits. One feature at a time — never silently batch large modules.

**Before each feature**, show a `Current Feature` card:
Goal · Files affected · Database changes · Backend · Frontend · Edge Functions ·
Components · Expected Result. Name anything being deferred, with the spec
reason.

**After each feature**, give an implementation report:
✅ Completed · Files Added · Files Updated · Database Changes · APIs Created ·
UI Screens · Components · Testing Status · Pending Items · Next Feature.
Then **pause** and state the next feature — don't roll on.

## Don't claim done until it's verified
Work the ladder that applies: typecheck → lint → unit tests → live-DB SQL
(including adversarial/negative cases) → REST with a real JWT → web E2E →
on-device. For anything touching money or permissions, write an actual
assertion harness and run it twice to prove idempotency. Clean up test data
afterwards.

Report outcomes faithfully. If a test fails, show it. If a heuristic is a
proxy rather than the real algorithm, say so. If something can't be closed in
code (e.g. an external CRON heartbeat), leave the scope item open and say why
rather than rounding up to done. A wrong statement about money is worse than
an unfinished feature.

Close a feature by telling Avanish **how to try it on their phone** — the route
to tap, and which seed login exercises the path (`123456` is the dev OTP).

## Engineering invariants
- **RBAC first.** Everything resolves through `@conqr/authz` (capability +
  scope/persona). RLS is the real boundary; client `useCan()` only gates UI.
- **Never** rely on client `insert().select()` where the SELECT policy depends
  on the new row — use a `SECURITY DEFINER` RPC that returns it. See
  `create_pool` (0012), `join_pool` (0011), `submit_check_in` (0014).
- **Derived money is a cache, never a counter.** Pot/XP/counts are recomputed
  with SUM/COUNT over ledgers.
- The **CRON is the single writer** of streaks/XP/compliance. Payments stay
  decoupled: the CRON writes fines as `pending`; the Razorpay worker charges.
- IST-aware dates: store `checkin_date`/`event_date` explicitly — UTC `DATE()`
  is wrong for 5.5h around IST midnight.
- Clean Architecture, SOLID, feature-first folders, atomic UI, strict TS.
  No God components, no duplicated logic, no huge files.

## Design is a core feature
Reference feel: Apple Liquid Glass × Linear/Revolut restraint × Snapchat
playfulness × BeReal. **Subtle and professional — never neon/gradient-AI.**
Typography is locked (Space Grotesk display/money, Inter UI). Colors come from
semantic theme roles via `useTheme()` — **never hardcode hexes in screens** —
and dark + light are both first-class; check both. Floating dock, not an
edge-anchored tab bar. Every screen ships loading / empty / error / success
states, skeletons, haptics, transitions, accessibility. No ugly placeholders.

Product voice is Hinglish and a bit savage, never cruel ("Kya hua bhai?",
"Aaj ka kaam done").

## Platform notes
Expo **SDK 54** (pinned to Avanish's Expo Go) — see `apps/mobile/AGENTS.md`.
Known preview traps (Reanimated `entering` blank on web, Metro HMR staleness
needing `--clear`, `goBack()` over `router.back()`) are in the runbook.
