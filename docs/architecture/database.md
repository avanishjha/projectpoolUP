# CONQR Database Architecture

**Status:** Implemented (F0.3 + F0.4) · **Migrations:** `0003`–`0007`

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
