# CONQR — Foundation Milestone Report (F0.0 → F0.7)

**Period:** 2026-07-14 → 2026-07-17 · **Status:** ✅ Complete · **Next:** F1.1 Phone OTP Auth

The Foundation milestone built everything the product stands on: the workspace, the
authorization brain, the entire database, its security envelope, the design language, and the
app chassis. No user-facing feature exists yet by design — but every one that follows now has
rails to run on.

## By the numbers

| Metric | Value |
|---|---|
| SQL migrations | 8 (1,792 lines incl. dev seed) |
| Tables | 19 product + 3 authz, RLS on every one |
| RLS policies | 46 (36 public · 3 authz · 7 storage) |
| Capabilities / roles | 48 capabilities · 7 platform roles · 3 derived pool personas |
| `@conqr/authz` | 752 lines, 27 unit tests |
| Mobile app | 36 TS/TSX files, 2,034 lines — design system, theming, shell |
| Automated checks | 27 unit + 23 schema + 33 RLS-adversarial + storage/seed suite — all green |
| UI components | 11 themed atoms + FloatingDock + ErrorBoundary + motion/haptic foundation |

---

## F0.0 — Spec ingestion & planning

All 8 spec documents (SRS, FRS, Use Cases, HLD, LLD, Build Bible, Extended Spec v2, India
Edition v2) were extracted from .docx (custom ZIP/XML parser — no pandoc on the machine) and
read end-to-end. Products of this phase:

- **[00-implementation-scope.md](../00-implementation-scope.md)** — the exhaustive ~90-item
  feature checklist, every item traceable to a spec section. The living tracker.
- **[01-build-order.md](../01-build-order.md)** — dependency graph + 26-step serial build
  order encoding three mandates: RBAC first, design before screens, "ship the CRON first."

## F0.1 — Monorepo & tooling

pnpm workspace (`apps/*`, `packages/*`) with maximal-strictness TypeScript
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), ESLint 9
flat config, Prettier, vitest. pnpm's strict node_modules prevents phantom imports — a package
can only use what it declares.

## F0.2 — Authorization core (RBAC-first)

**The design:** three layers. *Platform roles* (stored: `user` implicit, `creator`,
`moderator`, `support`, `finance`, `operations`, `admin`) → *pool personas* (derived at
resolve time from data, never stored: organiser/member/spectator) → *capabilities* (48 verbs,
the only thing code ever checks). Deny-by-default resolution with context conditions (pool
status, membership status, visibility) and restrictions where **deny beats grant** — a
delinquent admin still can't join a pool.

**The zero-drift mechanism:** the TypeScript catalog is canonical; the SQL seed
(`authz.role_capabilities`) is *generated* from it (`pnpm gen:authz-seed`). Client, Edge
Functions and RLS can never disagree about what a role can do.

**Deliberate exclusions from admin:** `system.financial.write` (service principals only —
no human can ever write pots/streaks/transactions; unit-tested), creator surface (verification
≠ privilege), pool-participant rights. Role *definitions* are immutable at runtime (SELECT-only
grants); only holders of `admin.roles.manage` can grant/revoke roles, and the seed self-heals
on every deploy.

**Explainability:** every decision carries a reason chain (`granted:persona:member`,
`restriction:delinquent`) for audit logs and support.

## F0.3 — Database schema (migrations 0003–0006)

21 enums, 19 tables, every constraint from the LLD plus the ones the LLD implied but didn't
write. Doctrine: **derived money is a cache, never a counter** (`total_pot`, `xp`,
`reported_count` are recomputed via SUM/COUNT over ledgers — `transactions`, `xp_events`,
`reports`); **integrity lives in the database** (check-ins require a membership row via
composite FK; duplicate fines die on the unique `idempotency_key`; comment depth ≤3 is a
trigger; per-day event dedup is a unique index — CRON idempotency as physics).

Key deviations from the LLD (all documented in [database.md](../architecture/database.md)):
nullable `phone` (Google/Apple sign-in), `onboarded_at` (trigger-created profile skeletons),
explicit `checkin_date` (UTC `DATE()` is wrong for 5½ hours around IST midnight),
`next_retry_at` (retry engine due-scan), pool-less `subscription` transactions, `xp_events`
ledger, `numeric(12,2)` pot headroom, moderation state columns.

Verified against a live local Supabase (Docker) — all migrations applied first-try; 23-check
behavioral smoke test (rolled back, DB left clean). Testing found and fixed a real bug: UUID-
prefix collisions in placeholder usernames would have aborted signups; the trigger now has a
collision-fallback loop.

## F0.4 — Row-Level Security (migration 0007)

The Express-middleware layer, in the database, unbypassable. **Two-axis model:** RLS policies
decide *which rows*; column-level GRANTs decide *which columns* — RLS alone cannot stop a user
from updating `xp` on their own row, so grants fence the columns. Zero client write paths to
`transactions`, `pool_members`, `pool_events`, `xp_events` — money and streaks move only via
service role.

Highlights: `users` readable only by self + staff, with a **`profiles` view** as the safe
public projection (no phone/UPI/Razorpay/push token — app code joins profiles, never users);
check-in inserts constrained to *yourself, active member, active pool, pool-local today* —
**backdating a check-in to erase a miss is structurally impossible**; "report what you can
see" via RLS-filtered EXISTS probes; dispute window (own fine, <24h) encoded in the policy;
spectators react but never comment; delinquents keep social voice but can't create/join;
`anon` can touch nothing.

Verified by a 33-check adversarial suite simulating five JWT users (organiser, member,
outsider, delinquent, spectator) attempting every forbidden action. Full chain replayed from
zero via `supabase db reset` after the fix.

## F0.5 — Storage, seed & environments (migration 0008)

- **Buckets:** `check-ins` (private, 1MB cap, images only — signed URLs per NFR-SEC-06) and
  `avatars` (public-read, 2MB). Path convention `{pool_id}/{user_id}/{file}` is load-bearing:
  7 storage policies authorize by parsing it through the same authz helpers as table RLS.
- **Dev seed:** 7 personas (avanish = admin+ops, priya on a streak, kabir delinquent with a
  written-off fine, meera verified creator…), 3 pools (private-active, public-pending,
  public-creator), check-ins, reactions, Hinglish comments, Wall-of-Shame events,
  notifications, cron_runs — with the pot invariant (`pot = SUM(transactions)`) holding.
  `supabase db reset` restores this world in ~30s.
- **Environments doc + `scripts/grant-role.sql`:** local/staging/prod strategy (Mumbai
  ap-south-1 for RBI data localisation), migration discipline (append-only once pushed,
  Studio is read-only), secrets rules (anon key is RLS-bound and safe to embed; service key
  never leaves Edge Functions). Cloud projects deliberately deferred per Build Bible.

## F0.6 — Design system (two passes)

**v0.1** established the bones: Space Grotesk (display/money) + Inter (UI) type scale, 4pt
spacing, radius tokens, spring motion vocabulary, semantic haptics map, PressableScale, and
the atoms — Text, GlassCard (glass = layered translucency + 1px light-catch sheen; real blur
reserved for overlays), Button, Chip, Avatar (ring language: ember = streak, crimson = missed
yesterday, gold = winner), Skeleton, ProgressRing, MoneyText (`₹1,23,456` Indian grouping,
tabular numerals). Verified visually via Expo web; screenshots caught muddy disabled-gradient
buttons — fixed.

**v0.2** answered the design review ("neon AI" → subtle/professional): every accent
desaturated and deepened (ember `#FF5C38→#D95B3F`, gold `#F7C948→#CFA85C`, sage mint, dulled
crimson), glows and ambient washes halved — and the palette was rebuilt as a **semantic theme
system** (`ThemeProvider`/`useTheme`, dark + light). Raw hexes no longer exist outside
`themes.ts`; components only speak roles (`primary/secondary/muted/ember/gold/mint/blood/violet`).
Typography locked per review. Both themes verified in the gallery (toggle stays for every
future review).

## F0.7 — App shell (+ dock redesign)

expo-router v6 with the HLD's 4-tab structure (Home/Explore/Wallet/Profile). Root layout wires
fonts → theme (system preference + manual override in Profile) → SafeArea → React Query
(defaults tuned for patchy 4G; mutations never auto-retry — money) → ErrorBoundary (designed
crash screen, Sentry hook-point) → toasts (zustand queue, `role="alert"`, auto-dismiss) →
offline banner (NetInfo). Deep-link scheme `conqr://` registered. Every tab ships a designed
empty state; the dev gallery stays reachable from Profile in dev builds.

**Device feedback loop:** on-device testing surfaced the SDK mismatch (project 57 vs Expo Go
54 → pinned to 54, expo-doctor 18/18) and the tab-bar collision with Android's 3-button nav.
The fix became a design upgrade: the **FloatingDock** — a detached liquid-glass pill
(BlurView + theme tint + sheen) hovering at `system inset + 12px`, spring-scaling items,
haptic switches, `DOCK_CLEARANCE` for content. Geometry and navigation verified; edge-anchored
bars are now a banned pattern.

---

## Honest ledger: known caveats & deferred items

| Item | Status |
|---|---|
| Cloud staging/prod Supabase projects | Deferred to hardening phase (Build Bible) — migrations are push-ready |
| Theme preference persistence (AsyncStorage) | Rides with F1.x session persistence |
| Sentry in ErrorBoundary | F12.7 |
| Input / Sheet / EmptyState-variants / Toast-variants | Land with first consumers (Input → F1.1) |
| `shadow*` → `boxShadow` web deprecation warnings | Cosmetic, dev-only |
| Android blur (`dimezisBlurView`) perf on budget devices | Awaiting device verdict; tint-only fallback ready |
| Suspended-user enforcement (`suspended_until`) | F11.x with moderation surfaces |
| Postgres 17 locally vs "15" in HLD | Supabase's current default; SQL is 15-compatible |

## What F1.1 inherits

A new feature starts with: capabilities already named for it, tables + RLS already protecting
it, seed personas to develop against, themed components to build screens from, a shell to
mount into, toasts/errors/offline handled, and a verification pattern (typecheck → unit →
live-DB adversarial → visual in both themes → on-device) already proven seven times.
