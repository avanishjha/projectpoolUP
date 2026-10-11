# CONQR Database Architecture

**Status:** Implemented and extended · **Migrations:** `0001`–`0028` · **Updated:** 2026-10-12

> **RLS access matrix (F0.4, migration 0007):** every table is default-deny; 36 policies open
> exactly the documented paths, all composed from `authz.*` helpers. Two-axis model:
> **RLS policies decide which rows; column-level GRANTs decide which columns.** Clients have
> zero write path to transactions, pool_members, pool_events, xp, pot, or any financial state.
> `public.profiles` is the safe projection of `users` (no phone/UPI/Razorpay/push token) —
> app code joins profiles, never users. Full policy walkthrough in the migration file itself.

## Principles

1. **Derived money is a cache, never a counter.** `pools.total_pot`, `users.xp`,
   `check_ins.reported_count` are caches over ledgers (`transactions`, `xp_events`, `reports`).
   Anything that matters is recomputed with `SUM()`/`COUNT()` — never incremented (NFR-REL-04).
2. **Integrity lives in the database.** If a rule can be a constraint, it is one: check-ins
   require a membership row (composite FK), a user can't join twice (composite PK), a fine
   can't be charged twice (unique `idempotency_key`), a reply can't exceed 3 levels (trigger).
3. **Deny from birth.** Every table has RLS enabled in the same migration that creates it,
   with zero policies. Until F0.4 lands, only the service role can touch anything.
4. **Time is IST-aware.** Check-ins and pool events store the pool-local *day* explicitly
   (`checkin_date`, `event_date`) because `DATE(created_at)` is UTC and wrong for 5.5 hours
   around IST midnight — exactly when most deadlines fire (23:30 IST).

## Table inventory (19)

| Table | Role | Key integrity |
|---|---|---|
| `users` | Profile extension of `auth.users` | unique username/referral/phone(partial); trigger-created |
| `pools` | Challenge definition + lifecycle | stakes check (₹99–5,000 / ₹25–500 / fine ≤ buy-in / free-pool pair), ≥7-day duration, unique invite code |
| `pool_members` | Membership + competitive state | PK `(user_id, pool_id)`, mandate id, compliance 0–100 |
| `transactions` | **The financial ledger** | unique `idempotency_key`, positive amounts, pool required except subscriptions, retry ≤3 |
| `check_ins` | Daily proof | FK → `pool_members` (only members check in), unique `(user, pool, checkin_date)` |
| `reactions` | One per user per check-in | PK `(check_in_id, user_id)` |
| `comments` | Threaded ≤3 levels | depth 0–2 derived by trigger, same-thread check, soft delete |
| `pool_events` | Wall of Shame / milestones / lifecycle | per-day dedup unique indexes (CRON idempotency) |
| `power_up_inventory` | Purchased consumables | lifecycle status, linked purchase txn |
| `badges` / `user_badges` | Catalog (seeded) + awards | PK `(user_id, badge_key)` |
| `xp_events` | XP ledger | `users.xp` = SUM of this |
| `notifications` | Sent/queued messages | partial-unique `dedup_key` (CRON dedup), cap-counting index |
| `notification_preferences` | Per-type mutes | PK `(user_id, type)` |
| `reports` | Check-in/comment flags | exactly-one-target check, one report per user per item |
| `disputes` | Fine disputes | one per transaction |
| `subscriptions` | CONQR Pro | unique Razorpay subscription id |
| `pool_spectators` | Public-pool followers | PK `(pool_id, user_id)` |
| `cron_runs` | CRON observability | per-job history index |

## Index strategy (query-driven)

| Query | Index |
|---|---|
| process-checkins CRON: active pools at deadline hour | `pools (status, check_in_deadline_utc)` |
| activate-pools CRON: pending pools past start | `pools (status, start_date)` |
| CRON member scan + leaderboard | `pool_members (pool_id, status)` |
| Home dashboard: my pools | `pool_members (user_id, status)` |
| Pot recalculation `SUM()` | `transactions (pool_id, status, transaction_type)` |
| Wallet ledger | `transactions (user_id, created_at desc)` |
| Retry CRON due-scan | partial `transactions (next_retry_at) where status in (failed, retry_scheduled)` |
| Feed | `check_ins (pool_id, checkin_date desc, created_at desc)`, `pool_events (pool_id, created_at desc)` |
| Admin flag queue | partial `check_ins (is_verified) where false`, partial `reports/disputes (status) where open` |
| Explore | partial `pools (visibility, status, created_at desc) where public` |

## Deviations from the LLD (each deliberate, each documented)

| LLD says | We do | Why |
|---|---|---|
| `users.phone NOT NULL` | Nullable + partial unique | Google/Apple sign-ins (P0 per SRS) have no phone at signup; India Edition itself says phone is mutable metadata, `auth.users.id` is the identity |
| — | `users.onboarded_at` | HLD requires users INSERT via auth trigger only; trigger creates a skeleton row (placeholder username `user_<hex12>`), profile setup completes it. Null = route to onboarding |
| `UNIQUE(user, pool, DATE(created_at))` | Explicit `checkin_date date` column | UTC `DATE()` mis-buckets IST evenings; the pool-local day is business data, not a derivation |
| — | `transactions.next_retry_at` | The 6h/24h/72h retry engine needs a due-time to scan; deriving it from `created_at + retry_count` maths in every query is fragile |
| `transactions.pool_id NOT NULL` | Nullable, CHECK non-null unless `subscription` | Pro subscriptions are pool-less by definition |
| — | `xp_events` ledger | Same recalculate-don't-increment doctrine as money; XP disputes become auditable |
| `total_pot DECIMAL(10,2)` | `numeric(12,2)` | 50 members × ₹5,000 + fines approaches 10,2's 8-digit ceiling; headroom is free |
| — | `comments`, `reports`, `disputes`, `pool_spectators`, `cron_runs`, `subscriptions`, `notification_preferences` tables | LLD §1.6 delegates these to the Extended Spec, which describes behaviour but not DDL; these implement that behaviour |
| — | `users.suspended_until / banned_at / reporting_suspended_until` | Moderation capabilities (authz catalog) need state to act on; false-reporter 30-day lock is spec'd in §8.1 |

Deferred to their features (schema evolves by migration, not speculation): seasons/season passes
(F9.5), sponsored challenges, corporate. `challenge_type` enum and `criteria` JSONB absorb most
future variance without DDL churn.

## Trigger inventory

| Trigger | Table | Purpose |
|---|---|---|
| `on_auth_user_created` | `auth.users` | Skeleton profile + referral code at signup |
| `set_updated_at` | 7 tables | Timestamp maintenance |
| `comments_set_depth` | `comments` | Derive depth from parent, cap 3 levels, same-thread check |
| `reports_apply` | `reports` | Recount `reported_count`; auto-flag at 3 (check-in → `is_verified=false`, comment → `is_hidden=true`) |

## Authz integration (delivered with this feature)

`authz.is_pool_member`, `authz.is_active_pool_member`, `authz.is_pool_organiser`,
`authz.can_view_pool` — the SQL mirrors of the resolver's persona derivation. F0.4 policies
compose these + `authz.has_capability(...)`; no policy will ever inline a role name.

---

## What was added after F0.4 (migrations `0009`–`0028`)

The principles above held. Everything below is an application of them rather than
an exception, with two exceptions called out explicitly.

### RPC layer — why business writes are functions, not table writes

**The INSERT…RETURNING snapshot trap** (found in F2.1, cost hours, now a project rule):
a client `insert().select()` becomes `INSERT … RETURNING`, which re-checks the **SELECT**
policy on the new row. Our visibility helpers are `STABLE SECURITY DEFINER`, so they run
under the INSERT's snapshot and cannot see the uncommitted row — the creator fails to read
back their own record and gets `42501`.

It presented as "pools create on one phone but not another", because `can_view_pool`
short-circuits on `moderation.queue.view` and the working phone was signed in as an admin.

**Rule:** any privileged or visibility-gated write goes through a `SECURITY DEFINER` RPC
that returns the row. The RLS INSERT policy stays as defence in depth.

| Area | Functions |
|---|---|
| Pools | `create_pool` · `join_pool` · `preview_pool_by_code` · `pool_detail` · `pool_leaderboard` · `cancel_pool` · `pool_start_readiness` |
| Check-ins | `submit_check_in` · `my_check_in_today` |
| Feed | `pool_feed` · `toggle_reaction` · `post_comment` · `check_in_comments` · `report_check_in` |
| Engine | `process_check_ins` · `process_pool_day` · `activate_pools` · `complete_pool` · `recalc_pool_pot` |
| Money | `start_checkout` · `apply_payment_event` · `simulate_payment` · `charge_pending_fines` · `process_retries` · `issue_pre_debit_notices` · `has_settled_buy_in` · `my_pool_payment` |
| Ops | `cron_watchdog` · `cron_heartbeat` · `format_inr` |

### Tables added

| Table | Migration | Role |
|---|---|---|
| `payment_customers` | 0018 | One per user per provider |
| `payment_mandates` | 0018 | UPI Autopay mandates (simulated until F5.3) |
| `payment_events` | 0018 | Webhook log; **unique `provider_event_id` is the replay defence** |
| `payment_config` | 0018 | Signing secrets. Service role only, on both axes |
| `pre_debit_notices` | 0022 | RBI notice per fine; `debit_after` gates the debit |
| `cron_jobs_expected` | 0024 | Cadence, grace and heartbeat URL per job |
| `cron_alerts` | 0024 | Open/cleared alerts, deduped by partial unique index |

### Columns added

`pool_members.last_processed_date` (0015) — the CRON's exactly-once guard.
`transactions.provider` / `provider_order_id` / `provider_payment_id` /
`provider_transfer_id` (0018) — renamed from `razorpay_*` so the schema is honest about
supporting more than one provider.

### The money state machine

`apply_payment_event()` is the only thing that settles a transaction, and it is service-role
only — a client can never mark its own payment succeeded. Four layers of idempotency:

1. `payment_events.provider_event_id` UNIQUE — a replayed webhook is a no-op
2. terminal states are terminal — a late failure cannot un-succeed a settled payment
3. `transactions.idempotency_key` UNIQUE — a duplicate charge bounces off the constraint
4. the pot is recomputed by `recalc_pool_pot()`, never incremented

The same shape governs the CRON: `last_processed_date` for exactly-once per member-day,
`pg_advisory_xact_lock(pool)` so concurrent runs cannot interleave, and a per-pool
`BEGIN/EXCEPTION` so one crashing pool rolls back alone and heals on the next tick.

### Triggers added

| Trigger | Table | Purpose |
|---|---|---|
| `admit_paid_member_trigger` | `transactions` | A deposit settling on a running pool promotes that member pending → active |
| `ensure_simulated_mandate_trigger` | `transactions` | Mints a simulated mandate on buy-in settlement; refuses to for a live provider |
| `sync_fine_side_effects_trigger` | `transactions` | Recomputes `fines_paid` and delinquency whenever a fine changes state |
| `enforce_live_requires_notice_trigger` | `payment_config` | A live provider **cannot** be configured with the RBI gate off |

### Two deliberate deviations from the principles

**1. The buy-in gate changes who counts as a member.** Since 0020, participation without
paying is only allowed in a **free** pool. `activate_pools` counts only *settled* members,
so a paid pool with fewer than two who have paid is cancelled rather than started around a
pot that does not exist. Unpaid members stay `pending` and are admitted the moment they pay.

**2. Delinquency is derived, not latched.** `pool_members.status = 'delinquent'` is
recomputed from the ledger — set when a fine goes terminally failed, lifted when the debt
clears. Before 0022 nothing set it at all, so `authz.is_delinquent()` could never fire and
non-payment had no consequence.

### Test harnesses

`supabase/tests/` — 118 assertions over six suites, run against a live database:
`cron_test` (18) · `cron_chaos` (10) · `payments_test` (30) · `charger_test` (21) ·
`observability_test` (20) · `pre_debit_test` (19). They cover replay, crash isolation,
heal-on-retry, forged and tampered signatures, the retry ladder, the RBI gate both ways,
and detection of a job that has silently stopped.
