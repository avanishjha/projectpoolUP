/**
 * Generates supabase/migrations/00000000000002_authz_seed.sql from the
 * TypeScript capability catalog — the single source of truth.
 *
 * Run via: pnpm gen:authz-seed  (from the repo root)
 * Output is deterministic (sorted) so diffs stay reviewable.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORM_ROLE_GRANTS } from '../src/personas';
import { PLATFORM_ROLES } from '../src/types';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  user: 'Base persona for every authenticated account (implicit, never stored in user_roles)',
  creator: 'Verified creator — runs branded public pools with revenue share',
  moderator: 'Reviews flagged check-ins and comments, suspends abusive users',
  support: 'Customer support — user lookup, read-only transactions, resend notifications',
  finance: 'Financial operations — reconciliation, GST reports, payout retries',
  operations: 'Platform operations — CRON monitoring, feature flags',
  admin: 'Full administrative access (superset of moderation, support, finance, ops)',
};

const header = `-- ============================================================================
-- CONQR · Migration 0002 · Authorization seed (GENERATED — DO NOT EDIT)
-- ----------------------------------------------------------------------------
-- Source of truth: packages/authz/src/{capabilities,personas}.ts
-- Regenerate with: pnpm gen:authz-seed
-- Idempotent: safe to re-run; removes stale grants, upserts current ones.
-- ============================================================================
`;

const lines: string[] = [header];

lines.push('insert into authz.roles (key, description) values');
lines.push(
  [...PLATFORM_ROLES]
    .map((role) => `  ('${role}', '${(ROLE_DESCRIPTIONS[role] ?? role).replace(/'/g, "''")}')`)
    .join(',\n') + '\non conflict (key) do update set description = excluded.description;\n',
);

const pairs: Array<[string, string]> = [];
for (const role of [...PLATFORM_ROLES].sort()) {
  for (const cap of [...PLATFORM_ROLE_GRANTS[role]].sort()) {
    pairs.push([role, cap]);
  }
}

lines.push('-- Reset grants to exactly match the catalog (removes stale rows).');
lines.push('delete from authz.role_capabilities;\n');
lines.push('insert into authz.role_capabilities (role_key, capability) values');
lines.push(pairs.map(([role, cap]) => `  ('${role}', '${cap}')`).join(',\n') + ';');
lines.push('');

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../../../supabase/migrations/00000000000002_authz_seed.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${pairs.length} grants for ${PLATFORM_ROLES.length} roles -> ${outPath}`);
