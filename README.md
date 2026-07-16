# CONQR

**Accountability through consequence.** Friend groups create challenge pools with real-money
stakes — daily photo check-ins, automated UPI-Autopay fines for missed days, and the pot goes
to the most disciplined. India-first: UPI backbone, WhatsApp distribution, Hinglish voice.

> Specs (source of truth) live in the root `.docx` documents (SRS, FRS, Use Cases, HLD, LLD,
> Build Bible, Extended Spec v2, India Edition v2). The product was speced as "PoolUp" and is
> shipping as **CONQR**.

## Workspace

| Path | What |
|---|---|
| `apps/mobile` | Expo React Native app — design system + gallery live (`pnpm --dir apps/mobile web`); navigation shell lands F0.7 |
| `packages/authz` | Authorization core: capability catalog, Scope & Persona Resolver |
| `supabase/migrations` | PostgreSQL migrations (authz foundation + generated seed so far) |
| `supabase/functions` | Edge Functions (CRON engine, payments, webhooks — coming) |
| `docs/` | Implementation scope, build order, architecture docs |

## Stack

React Native + Expo · Supabase (Postgres 15, Mumbai `ap-south-1`) · Razorpay (UPI Autopay,
Route payouts) · Edge Functions (Deno) · Expo Push + WhatsApp Business API · TypeScript strict.

## Commands

```bash
pnpm install          # bootstrap workspace
pnpm test             # all package tests
pnpm typecheck        # all packages
pnpm lint             # eslint across the repo
pnpm gen:authz-seed   # regenerate authz SQL seed from the TS catalog
```

## Engineering rules

- **RBAC first** — every screen, API and RLS policy resolves permissions through `@conqr/authz`
  ([docs/architecture/authorization.md](docs/architecture/authorization.md)).
- **Design first** — every screen ships production-ready: loading/empty/error/success states,
  skeletons, motion, haptics.
- **One feature at a time** — serial execution per
  [docs/01-build-order.md](docs/01-build-order.md); scope tracked in
  [docs/00-implementation-scope.md](docs/00-implementation-scope.md).
- **Money is sacred** — idempotency keys on every transaction, pot is always `SUM()` (never
  incremented), financial fields writable only by the service role.
