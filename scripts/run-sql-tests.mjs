#!/usr/bin/env node
/**
 * Runs every assertion harness in supabase/tests against the LOCAL database.
 *
 * Each file is one transaction that rolls back at the end, so the suites are
 * safe to run against a seeded dev DB and leave nothing behind. Anything that
 * touches money is run twice by default: the second pass proves the operation
 * is idempotent rather than merely successful.
 *
 *   node scripts/run-sql-tests.mjs                # everything, twice
 *   node scripts/run-sql-tests.mjs moderation     # just the matching suites
 *   node scripts/run-sql-tests.mjs --once         # single pass
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TESTS_DIR = join(process.cwd(), 'supabase', 'tests');
const CONTAINER = process.env.CONQR_DB_CONTAINER ?? 'supabase_db_CONQR';

const args = process.argv.slice(2);
const once = args.includes('--once');
const filters = args.filter((a) => !a.startsWith('--'));

const files = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => filters.length === 0 || filters.some((p) => f.includes(p)))
  .sort();

if (files.length === 0) {
  console.error(`No suites matched ${filters.join(', ')} in supabase/tests`);
  process.exit(1);
}

function run(file) {
  const sql = readFileSync(join(TESTS_DIR, file), 'utf8');
  // psql writes RAISE NOTICE to stderr, so both streams have to be read: an
  // earlier version of this runner read only stdout and cheerfully reported
  // every suite green with zero assertions.
  const r = spawnSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const passes = (text.match(/PASS:/g) ?? []).length;
  // A suite that asserts nothing is a failure, not a pass.
  const ok = r.status === 0 && !/\bERROR:/.test(text) && passes > 0;
  return { ok, passes, text };
}

const passes = [1, 2].slice(0, once ? 1 : 2);
let total = 0;
let failed = 0;

for (const pass of passes) {
  console.log(`\n── pass ${pass}${once ? '' : ' of 2'} ───────────────────────────────`);
  let passTotal = 0;
  for (const file of files) {
    const r = run(file);
    passTotal += r.passes;
    const name = file.replace(/\.sql$/, '').padEnd(22);
    if (r.ok) {
      console.log(`  PASS  ${name} ${r.passes} assertions`);
    } else {
      failed += 1;
      console.log(`  FAIL  ${name} ${r.passes} assertions before the failure`);
      const lines = r.text.split('\n').filter((l) => /ERROR|FAIL/.test(l));
      lines.slice(0, 6).forEach((l) => console.log(`        ${l.trim()}`));
    }
  }
  console.log(`  ${passTotal} assertions across ${files.length} suites`);
  total = passTotal;
}

console.log(
  failed === 0
    ? `\nGreen: ${total} assertions, ${files.length} suites${once ? '' : ', twice'}.`
    : `\n${failed} suite run(s) failed.`,
);
process.exit(failed === 0 ? 0 : 1);
