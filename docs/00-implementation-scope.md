# CONQR — Complete Implementation Scope

> CONQR (working title; specs refer to the product as "PoolUp") — friend-group accountability
> challenges with real-money stakes. India-first. React Native (Expo) · Supabase · Razorpay.
>
> This checklist is the exhaustive feature inventory derived from the 8 spec documents
> (SRS, FRS, Use Cases, HLD, LLD, Build Bible, Extended Spec v2 India, India Edition v2).
> Nothing ships until its box is checked. Status legend: `[ ]` not started · `[~]` in progress · `[x]` done.

---

## 0. Foundation

- [x] **F0.1 Monorepo & tooling** — pnpm workspaces, TypeScript strict, ESLint + Prettier, vitest, folder architecture (feature-first), CI-ready scripts
- [x] **F0.2 Authorization core (RBAC-first)** — capability/scope permission model, Scope & Persona Resolver (`@conqr/authz`), authz SQL schema (roles, role_capabilities, user_roles, helper functions), seed generator (TS catalog = single source of truth)
- [x] **F0.3 Database schema** — all enums, tables (users, pools, pool_members, transactions, check_ins, reactions, comments, pool_events, power_up_inventory, badges, user_badges, notifications, cron_runs, reports, disputes, subscriptions, pool_spectators, xp_events), constraints, indexes, triggers, pool-contextual authz helpers — verified against live local Supabase (23-check smoke test)
- [x] **F0.4 RLS policies** — 36 policies + column-level grants on all 19 tables, financial fields service-role-only, all policies composed from authz helpers, profiles view for safe public projection — verified by 33-check adversarial suite simulating 5 JWT users
- [x] **F0.5 Supabase project setup** — local stack live, storage buckets (check-ins private 1MB / avatars public 2MB) with 7 path-based policies, dev seed (7 personas, 3 pools, pot invariant holds), env strategy doc, role-bootstrap script — cloud staging/prod deliberately deferred to hardening phase per Build Bible
- [x] **F0.6 Design system** — semantic theme system (dark + light, ThemeProvider/useTheme, muted professional palette per Avanish's direction: burnt ember, brass gold, sage mint, dulled crimson), Space Grotesk + Inter type scale (locked), 4pt spacing, radii, spring motion, haptic vocabulary, PressableScale, atoms (Text, GlassCard, Button, Chip, Avatar+rings, Skeleton, ProgressRing, MoneyText, formatINR), gallery with theme toggle — both themes verified visually via Expo web (Input/Sheet/Toast/EmptyState land with their first consumers)
- [x] **F0.7 App shell** — expo-router v6 (4 tabs: Home / Explore / Wallet / Profile, glass tab bar, haptic tab switch), designed empty states on every tab, splash handling, root ErrorBoundary (designed crash screen), OfflineBanner (NetInfo), toast system (zustand queue + animated host, role=alert), theme provider w/ system preference + manual override (Profile → Appearance), React Query defaults tuned for patchy 4G, deep-link scheme `conqr://`, dev gallery route — functionally verified on web (tabs, toasts, theme switch via computed styles)

## 1. Authentication & Identity

- [x] **F1.1 Phone OTP auth** — +91 validation (starts 6-9), 6-digit OTP flow (auto-submit, shake on error, 30s resend cooldown ×3, 3 wrong = 5-min lock), AsyncStorage session persistence, auth-guarded routing, sign-out, Input + OTP components, LAN-IP auto-derivation for on-device dev, local test-OTPs via config.toml (prod MSG91 = GoTrue send-SMS hook at launch config) — E2E verified on web incl. wrong-code path, session reload, sign-out
- [ ] **F1.2 Google Sign-In** (one-tap) & **Apple Sign-In** (iOS requirement); no email/password
- [x] **F1.3 Profile setup** — first/last name (2–30, letters+spaces), unique username (live availability via profiles view, conflict suggestions incl. race-on-submit 23505 handling), optional avatar (square-crop picker → avatars bucket, non-blocking on failure), explicit 18+ confirmation, onboarded_at gate in 3-state root guard (auth → onboarding → tabs, fail-open on profile errors) — E2E verified: fresh user held at onboarding, @priya_s conflict + suggestions, submit → Home + DB row, reload skips onboarding
- [x] **F1.4 Auth wiring to authz** — JWT custom-access-token hook injects `app_roles` claim (migration 0009, granted to supabase_auth_admin only), mobile app consumes `@conqr/authz` (Metro monorepo config), `useSubject()` builds Subject from JWT roles + profile, `useCan(capability, poolContext?)` client capability hook, role badge on Profile — E2E verified: avanish JWT = [admin,operations] → Admin badge renders; base user = [] → no badge
- [~] **F1.5 Account management** — account deletion (Settings screen → warning w/ real active-pool count → OTP re-verify → soft delete via SECURITY DEFINER RPC, financial obligations persist; deleted-user re-login backstop; reusable OtpBoxes component) — E2E verified. Phone change deferred (SRS P1/Phase 2). Hard-delete/image-purge/username-release = scheduled job with F6 CRON.

## 2. Pools

- [x] **F2.1 Pool creation (4-step flow)** — Vibe (name 3–40, emoji picker, 9 challenge templates w/ prefill, description ≤200) → Schedule (duration presets+custom, 14-day start picker, deadline presets, window) → Stakes (India tier presets + custom buy-in/fine w/ ≤buy-in validation, payout rule, elimination, grace) → Review (summary + visibility + fee disclosure) → real INSERT through pools RLS (invite code auto-gen), success reveal screen w/ share. Home lists created pools via PoolCard. Per-step validators gate progress. Verified E2E: wizard → DB row → success → Home card. (Joined-pool listing + Pool Detail are F2.3/F2.5.)
- [x] **F2.2 Invite system** — 6-char auto invite code, QR code (deep link), copy-to-clipboard, native/WhatsApp share w/ `conqr://` deep link, on the pool-created reveal screen
- [x] **F2.3 Pool join** — code entry + deep-link, live pool preview by code (`preview_pool_by_code` RPC, works for private pools), rules + commitment consent, `join_pool` RPC with full validation chain (invalid/already-started/full/already-member/delinquent — all row-locked & verified), joined pools appear on Home. Payment (mandate→buy-in→atomic member) deferred to F5; members join 'pending' per Build Bible
- [~] **F2.4 Home dashboard** — pool cards (name, pot, days remaining, status dot), gateway empty state (Create/Join), pull-to-refresh, skeletons, card→detail nav. Verified E2E. **Gap: per-card check-in state + streak not yet shown** (the CTA lives only on pool detail) — finish with F4.5/polish.
- [x] **F2.5 Pool detail** — header (pot, status dot, days, members), rules grid, ranked leaderboard (streak DESC → fines ASC → compliance DESC → joined ASC, you highlighted, medals + fire progression), membership state chip, organiser controls (share invite + cancel while pending) — via `pool_detail`/`pool_leaderboard`/`cancel_pool` RPCs (RLS-aware), card→detail wired. Verified E2E. (Real-time pot ticker = F4.5; member kick/settings = later.)
- [ ] **F2.6 Pool lifecycle** — activation CRON (≥2 members → active, else cancel+refund), 48h pending window w/ reminders, cancellation (pending only, full refund, mandates cancelled), auto-complete when 1 active member remains, completion flow
- [ ] **F2.7 Free pools (₹0)** — separate flow, no Razorpay, social-only

## 3. Check-ins

- [x] **F3.1 Camera** — camera-only via expo-camera (NO gallery access), front/rear toggle, liveness prompts (1-in-3, 1-in-2 when fine ≥₹200), permission gate explaining the anti-cheat rationale. (Accessibility prompt-off mode → F12.4.)
- [x] **F3.2 Preview & submit** — full-screen preview, retake, caption ≤200, blur heuristic w/ warning >0.7, compression to <500KB (stepped JPEG quality, 1440px cap), live KB readout, >1MB hard reject
- [x] **F3.3 Upload pipeline** — base64→bytes upload to private `check-ins` bucket at `{pool}/{user}/{ts}.jpg` (path IS the permission), `submit_check_in` RPC (SECURITY DEFINER, avoids the snapshot trap) validating pool-active + membership-active + window, one-per-pool-local-day with REPLACE semantics, client capture timestamp stored, server clock authoritative. (Server watermark + thumbnail edge function → deferred to F5-era Edge Functions.)
- [ ] **F3.4 Offline queue** — local queue with client timestamp, auto-upload on reconnect, 3 retries w/ backoff, past deadline = real miss
- [x] **F3.5 Success moment** — streak celebration (fire progression 🔥/🔥🔥/🔥🔥🔥, projected streak, next-milestone countdown, replace-aware copy), routes back to pool. ("Yesterday's top check-in" hook lands with the feed, F4.1.)

## 4. Feed & Social

- [x] **F4.1 Feed** — unified reverse-chron feed via `pool_feed` RPC (check-ins + CRON events in one stream, cursor-paginated), check-in cards w/ signed-URL photos (private bucket), author + streak ring, liveness badge, "under review" flag, skeletons + empty states, pull-to-refresh. (Supabase Realtime push → F4 polish; thumbnails need the watermark Edge Function.)
- [x] **F4.2 Reactions** — Fire/Flex/Crown/Skull/Respect via `toggle_reaction` RPC (one per user; re-tap removes, different tap switches), optimistic UI w/ rollback, +2 XP on new reaction. Spectators may react (spec §4.4). (Long-press picker/double-tap shortcut → polish.)
- [x] **F4.3 Comments** — threaded ≤3 levels (depth trigger-enforced), members-only (`post_comment` rejects spectators), reply-to UX, hidden-comment handling, +3 XP. Sheet UI w/ keyboard handling.
- [x] **F4.4 Pool events in feed** — Wall of Shame (missed_day / fine_issued, crimson tone + shame avatar ring), streak milestones, shield/grace used, member eliminated, pool started/completed — all Hinglish-voiced, rendering the CRON's real events. (24h profile ring on avatars → polish.)
- [ ] **F4.5 Pot ticker** — animated ₹ counter, ticks on fine events
- [x] **F4.6 Reporting** — reasons (not real / reused / wrong person / other) via `report_check_in` RPC, "report what you can see" enforced, reporting-suspension respected, one report per user per item; existing trigger recounts and auto-flags at 3 (`is_verified=false` → admin queue, surfaced as "Under review" on the card). (Admin review UI → F11.4; false-reporter auto-suspension → F11.x.)

## 5. Payments (Razorpay)

- [~] **F5.1 Payment foundation** — provider-agnostic layer running end to end on a built-in SIMULATOR (migration 0018): `payment_customers`, `payment_mandates` (shape only, F5.3 registers them), `payment_events` webhook log with UNIQUE provider_event_id as the replay defence, `verify_payment_signature` (real HMAC-SHA256, same scheme Razorpay uses), `start_checkout`, `apply_payment_event` (the state machine — service-role only), `simulate_payment` (guarded by `is_live`). Transactions are provider-agnostic (`provider`, `provider_order_id/payment_id`). 30 assertions incl. forged/tampered signatures, webhook replay, late-failure-after-success, and the 6h/24h/72h retry ladder. **Pending: real Razorpay keys, the webhook Edge Function (thin HTTP shell over `apply_payment_event`), and revoking the `simulate_payment` grant before go-live.**
- [ ] **F5.2 Buy-in** — create order edge function, Razorpay Checkout (UPI/Card/Netbanking), capture webhook → transaction + membership (atomic), failure rollback
- [ ] **F5.3 UPI Autopay mandate** — Emandate/subscription registration at join (before buy-in), UPI app approval flow, subscription.authenticated → store mandate_id, card tokenisation fallback, revocation handling
- [~] **F5.4 Fines auto-debit** — `charge_pending_fines()` drains pending + due-for-retry fines against an active mandate, every 10 min via pg_cron. Settles through `apply_payment_event` so a re-run cannot double-charge; `FOR UPDATE SKIP LOCKED` keeps concurrent runs apart; one bad fine cannot stop the queue. No mandate → terminal `no_mandate` (manual pay, no retries burned); above the mandate cap → `exceeds_mandate`. **Pending: real Razorpay debit call (this charges via the simulator).**
- [x] **F5.5 Retry engine** — 6h/24h/72h ladder, retry_count capped at 3, `failure_reason` recorded, terminal `failed` after exhaustion → member marked **delinquent** (which gates check-ins and pool creation; this status was never set by anything before). Clearing the debt restores them. (NPCI-outage detection → with the live provider.)
- [x] **F5.6 Manual pay fallback** — `my_outstanding_fines` / `my_debt_summary` / `start_fine_payment`, plus a "you owe" card on pool detail with per-fine reasons. Settles through `apply_payment_event` like everything else, so paying by hand removes the fine from the retry queue and the existing trigger lifts delinquency immediately. **Deliberately bypasses the RBI pre-debit gate** — that governs auto-debits pulled without the customer present, not a payment they are making themselves. Only your own fine is payable. 20 assertions + browser E2E of the full escape.
- [x] **F5.7 Pre-debit notifications (RBI)** — `issue_pre_debit_notices()` issues a notice the moment the verdict creates a fine (inline in `process_check_ins`, plus a 15-min sweep as a safety net), stating amount, pool and debit date in Indian digit grouping. `debit_after = now + pre_debit_lead_hours` (floor of 24, check-constrained). Deduped twice: unique transaction_id and unique notification dedup_key. **A live provider cannot be configured without the gate** — trigger-enforced, not documented. Retries reuse the original notice (confirm this reading with the payment partner). Consequence: enabling the gate DELAYS every fine by 24h, which is what the rule means.
- [ ] **F5.8 Payouts** — Razorpay Route, fund account creation (UPI ID / bank), all 3 payout rules (winner_takes_all w/ tiebreakers, top_3_split 50/30/20, proportional by compliance), platform fee 5% (Pro 3%, min ₹50), GST 18% on fee, creator fee 5%, unclaimed 30d hold → redistribute, transfer retry + admin alert
- [ ] **F5.9 Refunds** — pool cancellation full refunds, no-fee, mandate cancellation
- [ ] **F5.10 GST invoices** — auto-generate for platform fees & power-ups, visible in wallet
- [ ] **F5.11 Reconciliation** — daily Razorpay settlement reconciliation report, UTR tracking

## 6. CRON Engine

- [x] **F6.1 process-checkins** (every minute, pg_cron) — deadline-hour pool selection, per-member miss detection, shield → grace → streak-freeze → fine cascade, streak/longest/compliance updates, elimination threshold, pot recalculation (SUM, never increment), pool_events (dedup-indexed), XP ledger, pool completion + auto-complete on last-member-standing. **Exactly-once per member-day** via `pool_members.last_processed_date`; unique `idempotency_key` as second line of defence; `pg_advisory_xact_lock` per pool; per-pool error isolation. Payment movement deliberately decoupled — fines are written 'pending' for the F5 Razorpay worker. Proven by 27 assertions incl. crash-mid-pool isolation + heal-on-retry. (Notifications → F8; payout calc → F5.)
- [x] **F6.2 process-retries** —  sweeps due retries, scheduled every 6h via pg_cron.
- [ ] **F6.3 send-reminders** (hourly) — 3h push, 1h push+WhatsApp final warning, quiet hours, caps
- [x] **F6.4 activate-pools** (every 10 min, pg_cron) — pending pools past start_date: ≥2 members → active + members promoted to active + `pool_started` event; <2 → cancelled. `FOR UPDATE SKIP LOCKED` so concurrent runs can't double-activate. (Refunds on cancellation → F5.)
- [x] **F6.5 pre-debit-notifications** — scheduled every 15 min rather than daily (scope said daily): notices are already issued inline by the verdict, so this is the net for replays and inline errors, and a daily net would leave such a fine uncollectable for a day on top of its mandatory 24h wait.
- [ ] **F6.6 cleanup-images** (daily 3am IST) — 90-day retention on completed pools
- [x] **F6.7 CRON observability** — two layers, because an in-database watchdog cannot detect its own death. (1) `cron_watchdog()` every 5 min catches **overdue** (a job that stopped writing runs — the failure `cron_runs` alone cannot show), **failing** (3 consecutive failures), and **no_progress** (fines pending >45 min while the charger reports success). Alerts raised once, cleared automatically, retained as history. (2) `cron_heartbeat()` pings an external dead-man's switch via pg_net on every run, success and failure — the only layer that survives pg_cron or the project dying. `cron_health` view for the ops dashboard. Silent no-op until URLs are configured. **Wiring the real URLs is a production step — see `docs/02-dev-runbook.md` §4.**

## 7. Wallet

- [ ] **F7.1 Wallet dashboard** — active pool balances (locked buy-in, fines paid, pot, estimated payout), lifetime stats (deposited/fined/won/net P&L/pools completed/win rate)
- [ ] **F7.2 Ledger** — full transaction list w/ status chips, detail view (Razorpay payment ID, UTR, GST)
- [ ] **F7.3 Payment methods** — default UPI ID management, tokenised cards, add-method flow
- [ ] **F7.4 Payout history** — transfers with UTR + settlement dates

## 8. Notifications

- [ ] **F8.1 Expo push** — token registration, notification center screen, deep-link routing on tap
- [ ] **F8.2 Rules engine** — quiet hours 10pm–7am IST, caps (4 push + 2 WhatsApp/day), per-type mute settings, dedup table, open-rate tracking
- [ ] **F8.3 WhatsApp Business API** — Gupshup/Wati integration, pre-approved templates (fine alert, payout, reminder, pool live, mandate failure), Hinglish copy catalog
- [ ] **F8.4 Full copy catalog** — all Hinglish notification strings from spec §9/§10

## 9. Gamification

- [ ] **F9.1 XP engine** — +10 check-in, streak bonuses (+5/+10/+20), +100 complete, +250 win, +50 referral, +2 reaction, +3 comment, +5 early bird; level thresholds & profile frames
- [ ] **F9.2 Badges** — Pehla Kadam, Iron Will, Diamond Hands, Pot Raja, Untouchable, Centurion, Lakhpati, Social Butterfly, Early Bird, IPL Survivor; award engine in CRON + triggers
- [ ] **F9.3 Streak system** — per-pool streaks, fire progression (🔥/🔥🔥/🔥🔥🔥), milestone events + share cards
- [ ] **F9.4 Power-up store** — Shield ₹49, Double Down ₹99, Spotlight ₹29, Alarm Bomb ₹29, Streak Freeze ₹149, Ghost Mode ₹49; purchase via Razorpay, inventory, CRON consumption logic, fairness guardrails
- [ ] **F9.5 Seasons** — 90-day festival-aligned cycles, season leaderboard (Discipline Score), top-10% rewards, Season Pass ₹149 (1.5x XP, cosmetics, free Shield)

## 10. Growth & Discovery

- [ ] **F10.1 Public pools + Explore tab** — trending, featured creators, category filters, starting-soon, nearby (city-level), search
- [ ] **F10.2 Spectator mode** — watch public pools, react but not comment, spectator count, Join Next Round CTA, interested prompt
- [ ] **F10.3 Referrals** — code at signup, deep-link autofill, +50 XP + badge on referred first join
- [ ] **F10.4 Share cards** — check-in, streak milestone, pool win (₹ money shot), Wall of Shame, pool invite; WhatsApp-optimised, deep links
- [ ] **F10.5 Creator platform** — verification, creator pools (5% creator + 5% platform), Explore branding, creator dashboard (pools, participants, earnings, analytics)
- [ ] **F10.6 CONQR Pro** — ₹199/mo / ₹1,499/yr via Razorpay Subscription + IAP; 3% fee, unlimited pools, custom windows, advanced stats, custom templates, 2 grace tokens, Pro badge, ad-free, priority support; never gate core loop

## 11. Trust, Safety & Admin

- [ ] **F11.1 Anti-cheat MVP** — camera-only, liveness prompts, blur detection, server watermark, server timestamp truth, rate limit 1/pool/day
- [ ] **F11.2 Anti-cheat Phase 2** — EXIF validation, perceptual hash vs prior check-ins, device fingerprinting, NSFW detection (hide + warn + 3 strikes)
- [ ] **F11.3 Moderation** — report queues (check-ins, comments), dispute window (24h submit, 48h review), admin actions (verify/reject → fine + streak reset/ban)
- [ ] **F11.4 Admin panel** — dispute review queue (photo, liveness prompt, blur score, reports), CRON health dashboard, financial dashboard (GMV, fees + GST, outstanding fines, delinquents, reconciliation), user management
- [ ] **F11.5 Abuse limits** — pool creation rate limit (5/week), max active pools (3 free / unlimited Pro), duplicate device flagging, money-laundering pattern flags

## 12. Platform Quality

- [ ] **F12.1 Security hardening** — rate limiting (60 req/min, 5/min check-in), signed URLs (7-day), no PII in logs, secrets audit, webhook replay protection
- [ ] **F12.2 Offline & error handling** — global error boundaries, retry policies, offline banners, optimistic updates w/ rollback
- [ ] **F12.3 Performance** — cold start <3s on 3GB RAM, feed <2s, upload <5s on 4G, image lazy loading, list virtualisation, bundle audit
- [ ] **F12.4 Accessibility** — screen-reader labels, touch targets, reduced motion, liveness accessibility mode
- [ ] **F12.5 Localisation scaffold** — EN + HI (Hinglish voice), i18n infrastructure for ta/te/mr/bn
- [ ] **F12.6 Analytics** — Mixpanel events (full funnel), North Star metrics instrumentation, India-specific metrics (autopay success, WhatsApp rates)
- [ ] **F12.7 Error monitoring** — Sentry (app + edge functions)
- [ ] **F12.8 Testing** — unit (authz, algorithms, CRON logic), integration (edge functions vs local Supabase), E2E happy paths, idempotency tests (double-run CRON, kill mid-run), load test (5K concurrent check-ins)
- [ ] **F12.9 Compliance** — DPDP consent framework, data localisation, breach SOP, 18+ gate, consent copy integration points, TDS disclaimer
- [ ] **F12.10 Deployment** — EAS Build + Update (OTA), env promotion (dev → staging → prod), store submissions, Razorpay go-live checklist

---

*Owner: founding engineer (Claude) · Directed by: Avanish · Last updated: 2026-07-14*
