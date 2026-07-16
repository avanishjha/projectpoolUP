# CONQR Authorization Architecture — Scope & Persona Resolver

**Status:** Implemented (F0.2) · **Package:** `@conqr/authz` · **Migrations:** `0001_authz_foundation.sql`, `0002_authz_seed.sql` (generated)

## Design goals

1. **Capability-based, not role-checked.** Application code, Edge Functions and RLS policies ask
   *"can this subject `checkin.create` in this pool?"* — never *"is this user an admin?"*.
   Roles are just named bundles of capabilities; adding a role never touches call sites.
2. **One source of truth.** The TypeScript catalog (`packages/authz/src/capabilities.ts` +
   `personas.ts`) is canonical. The Postgres seed (`authz.role_capabilities`) is **generated**
   from it (`pnpm gen:authz-seed`), so client, server and database can never drift.
3. **Deny by default.** Every decision starts from the empty set. Restrictions (deny) always
   beat grants — a delinquent admin still cannot join a pool.
4. **Explainable.** Every decision carries a reason chain
   (`granted:persona:member`, `restriction:delinquent`) for audit logs and debugging.

## The three layers

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PLATFORM ROLES (stored: authz.user_roles)                    │
│    user (implicit) · creator · moderator · support · finance ·  │
│    operations · admin                                           │
├─────────────────────────────────────────────────────────────────┤
│ 2. POOL PERSONAS (derived at resolve time, never stored)        │
│    organiser  ← pools.creator_id = subject                      │
│    member     ← pool_members row exists (any status)            │
│    spectator  ← no membership + pool.visibility = 'public'      │
├─────────────────────────────────────────────────────────────────┤
│ 3. CAPABILITIES (the only thing code checks)                    │
│    48 verbs across 15 domains — see capabilities.ts             │
└─────────────────────────────────────────────────────────────────┘
```

**Service principals** (`cron_service`, `webhook_service`) are non-human actors holding
`system.financial.write` — the capability behind every write to `total_pot`, `fines_paid`,
`current_streak`, `transactions`. No human role can ever hold it (enforced by a unit test).
In the database these run as `service_role`, which bypasses RLS; the catalog entry exists so
Edge Functions self-document and self-check with the same engine.

## Resolution algorithm

`resolve(subject, poolContext?) → CapabilitySet`

1. Soft-deleted subject → empty set (account is logged out anyway; defence in depth).
2. Union grants from all platform roles (`user` always implied).
3. If pool context provided: derive personas, union their grants, then apply **context conditions**:

| Condition | Effect |
|---|---|
| pool not active OR membership not active | remove `checkin.create`, `checkin.replace_own`, `powerup.use` |
| pool not pending | remove `pool.update_settings`, `pool.cancel`, `pool.invite`, `pool.join` |
| already a member | remove `pool.join` |
| visibility ≠ public & no membership & not organiser | no personas at all → no pool access |

4. Apply platform restrictions: **delinquent** subjects lose `pool.create`, `pool.join`,
   `powerup.purchase`, `pro.subscribe` (UC-09: locked from new financial commitments,
   social + wallet visibility retained).

## Persona capability matrix (summary)

| Capability | user | member† | organiser† | spectator† | creator | moderator | support | finance | ops | admin |
|---|---|---|---|---|---|---|---|---|---|---|
| pool.create / join | ✅ | — | — | — | | | | | | |
| pool.view / feed.view / leaderboard.view | | ✅ | ✅ | ✅ (public) | | | | | | |
| checkin.create / powerup.use | | ✅ (active+active) | | | | | | | | |
| reaction.add / comment.create | | ✅ | | react only | | | | | | |
| pool.update_settings / cancel / invite | | | ✅ (pending) | | | | | | | |
| wallet.\*_own / transaction.view_own | ✅ | | | | | | | | | |
| creator.pool.create / dashboard | | | | | ✅ | | | | | ✅* |
| moderation.\* | | | | | | ✅ | | | | ✅ |
| support.\* | | | | | | | ✅ | | | ✅ |
| finance.\* + admin.finance.view | | | | | | | | ✅ | | ✅ |
| ops.\* | | | | | | | | | ✅ | ✅ |
| admin.\* | | | | | | | | | | ✅ |
| system.financial.write | — | — | — | — | — | — | — | — | — | — |

† contextual persona, conditions in parentheses. \* admin does not get creator surface by default — verify creators explicitly.

## Database integration

- `authz.roles`, `authz.role_capabilities` (generated seed), `authz.user_roles` — RLS-protected.
- `authz.has_capability(cap, uid default auth.uid())` — the choke point RLS policies call.
- `authz.has_role(role, uid)`, `authz.user_capabilities(uid)` — helpers.
- All functions: `SECURITY DEFINER`, `STABLE`, `search_path = ''`.
- **Pool-contextual SQL helpers** (`authz.is_pool_member`, `authz.is_active_pool_member`,
  `authz.is_pool_organiser`, `authz.can_view_pool`) ship in the product-schema migration (F0.3)
  because they reference `pools` / `pool_members`. RLS policies will compose both:
  e.g. check-in INSERT policy = `is_active_pool_member(pool_id)` + own `user_id` + pool active.
- Financial columns are writable by `service_role` only — no RLS policy grants client writes,
  matching the HLD's "Critical RLS Rule".

## App & Edge Function integration (upcoming features)

- **F0.7 App shell:** `useCan(capability, poolContext?)` hook wrapping `resolve()` with the
  session subject; UI hides/disables what the subject cannot do (server still enforces).
- **F1.4 Auth:** Supabase custom access token hook mirrors `authz.user_roles` into a
  `platform_roles` JWT claim so the client builds its `Subject` without an extra query;
  DB remains the source of truth.
- **Edge Functions:** `assertCan(subject, capability, poolContext)` at the top of every
  mutation handler; `AuthorizationError` maps to HTTP 403 with the reason chain logged
  (user_id + capability only — no PII, per NFR-SEC-08).

## Extending the system

1. Add the capability string to `capabilities.ts` (and grants in `personas.ts`).
2. `pnpm gen:authz-seed` → commit the regenerated migration.
3. Write/extend tests in `resolver.test.ts`.
4. RLS policies referencing `authz.has_capability(...)` pick the change up with zero edits.

New roles (e.g. a future `auditor`): add to `PLATFORM_ROLES`, add grants, regenerate. Done.
