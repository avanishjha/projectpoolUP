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
- [ ] **F1.5 Account management** — phone change with re-verification, account deletion (OTP re-verify → soft delete 30d → hard delete, images purged, username released, financial obligations persist)

## 2. Pools

- [ ] **F2.1 Pool creation (4-step flow)** — Name/Vibe (3–40 chars, emoji, description ≤200), Challenge type templates (75 Hard, Gym Streak, Run, Surya Namaskar, No Sugar, Steps, Meditation, Cold Plunge, Custom), Duration (21/30/60/75/custom 7–365d), start date (+1d to +14d), deadline hour, check-in window (full day/morning/custom), Stakes (buy-in ₹99–₹5,000, fine ₹25–₹500 ≤ buy-in, elimination threshold, payout rule, grace tokens 0–3), Review screen
- [ ] **F2.2 Invite system** — 6-char unique invite code, deep links, WhatsApp share, copy link, QR code
- [ ] **F2.3 Pool join** — full validation chain (code valid → pending → not full → not member), rules + legal consent screen, mandate → buy-in → member row (atomic, rollback paths), delinquent-user lock
- [ ] **F2.4 Home dashboard** — pool cards (name, pot, streak, days remaining, check-in state), gateway empty state (Create/Join), pull-to-refresh, skeletons
- [ ] **F2.5 Pool detail** — sticky header (pot animated ₹ counter, days left, member count), member list, leaderboard (streak DESC → fines ASC → compliance DESC → joined ASC), rules sheet, settings (organiser)
- [ ] **F2.6 Pool lifecycle** — activation CRON (≥2 members → active, else cancel+refund), 48h pending window w/ reminders, cancellation (pending only, full refund, mandates cancelled), auto-complete when 1 active member remains, completion flow
- [ ] **F2.7 Free pools (₹0)** — separate flow, no Razorpay, social-only

## 3. Check-ins

- [ ] **F3.1 Camera** — camera-only (no gallery), front/rear toggle, liveness prompts (1-in-3 random; 1-in-2 high stakes), accessibility mode (prompts off, spot-check flag)
- [ ] **F3.2 Preview & submit** — caption ≤200 chars, client blur detection (Laplacian variance, warn >0.7), compression <500KB (JPEG q70)
- [ ] **F3.3 Upload pipeline** — Supabase Storage signed upload, server watermark (timestamp + pool hash), 200×200 thumbnail edge function, check_ins row, one-per-day (replace with confirm), client-initiation timestamp for deadline, server clock = truth
- [ ] **F3.4 Offline queue** — local queue with client timestamp, auto-upload on reconnect, 3 retries w/ backoff, past deadline = real miss
- [ ] **F3.5 Success moment** — streak celebration screen, auto-navigate to feed, "yesterday's top check-in" hook

## 4. Feed & Social

- [ ] **F4.1 Feed** — reverse-chron check-in cards (avatar, caption, watermarked image, timestamp), realtime inserts (Supabase Realtime), lazy image loading (thumbnails), skeletons/empty states
- [ ] **F4.2 Reactions** — Fire/Flex/Crown/Skull/Respect, one per user per check-in (upsert), double-tap = Fire, long-press picker, realtime counts, push to owner
- [ ] **F4.3 Comments** — threaded ≤3 levels, Hinglish-friendly, report/hide (3 reports = auto-hide + review)
- [ ] **F4.4 Pool events in feed** — Wall of Shame cards (red border, 24h profile ring), streak milestone cards (7/14/21/30/50/75), shield/grace used, elimination, pool started/completed
- [ ] **F4.5 Pot ticker** — animated ₹ counter, ticks on fine events
- [ ] **F4.6 Reporting** — reasons (not real / reused / wrong person / other), reported_count ≥3 → is_verified=false + admin queue, false-reporter suspension (5 cleared = 30d)

## 5. Payments (Razorpay)

- [ ] **F5.1 Razorpay foundation** — server-side keys (Supabase secrets), customer creation on first join, webhook endpoint w/ signature verification, webhook event router (payment.captured / payment.failed / subscription.charged / subscription.halted / transfer.processed / refund.processed / payment.dispute.created), idempotent handlers
- [ ] **F5.2 Buy-in** — create order edge function, Razorpay Checkout (UPI/Card/Netbanking), capture webhook → transaction + membership (atomic), failure rollback
- [ ] **F5.3 UPI Autopay mandate** — Emandate/subscription registration at join (before buy-in), UPI app approval flow, subscription.authenticated → store mandate_id, card tokenisation fallback, revocation handling
- [ ] **F5.4 Fines auto-debit** — CRON-initiated charge against mandate, Razorpay idempotency keys, transaction lifecycle (pending → succeeded/failed)
- [ ] **F5.5 Retry engine** — 6h/24h/72h schedule, retry_count ≤3, failure_reason logging, NPCI-outage detection (no delinquency for infra), delinquent state + lockout + write-off
- [ ] **F5.6 Manual pay fallback** — "Pay Now" checkout for failed fines, transaction settlement, removal from retry queue
- [ ] **F5.7 Pre-debit notifications (RBI)** — 24h-before notification, dedup, compliance guard (no notification sent = skip debit, charge next day)
- [ ] **F5.8 Payouts** — Razorpay Route, fund account creation (UPI ID / bank), all 3 payout rules (winner_takes_all w/ tiebreakers, top_3_split 50/30/20, proportional by compliance), platform fee 5% (Pro 3%, min ₹50), GST 18% on fee, creator fee 5%, unclaimed 30d hold → redistribute, transfer retry + admin alert
- [ ] **F5.9 Refunds** — pool cancellation full refunds, no-fee, mandate cancellation
- [ ] **F5.10 GST invoices** — auto-generate for platform fees & power-ups, visible in wallet
- [ ] **F5.11 Reconciliation** — daily Razorpay settlement reconciliation report, UTR tracking

## 6. CRON Engine

- [ ] **F6.1 process-checkins** (every minute) — deadline-hour pool selection, per-member miss detection, shield → grace → streak-freeze → fine cascade, streak/longest/compliance updates, elimination threshold, pot recalculation (SUM, never increment), pool_events, notifications, end-date → payout trigger; idempotent at every step
- [ ] **F6.2 process-retries** (every 6h) — failed txn retries per schedule
- [ ] **F6.3 send-reminders** (hourly) — 3h push, 1h push+WhatsApp final warning, quiet hours, caps
- [ ] **F6.4 activate-pools** (hourly) — pending → active/cancelled
- [ ] **F6.5 pre-debit-notifications** (daily) — RBI notices for tomorrow's potential debits
- [ ] **F6.6 cleanup-images** (daily 3am IST) — 90-day retention on completed pools
- [ ] **F6.7 CRON observability** — cron_runs table (timestamp, pools_processed, fines_issued, errors, duration), external heartbeat (Cronitor/Healthchecks), alerting (missed run >5min, errors>0, zero-processed anomaly)

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
