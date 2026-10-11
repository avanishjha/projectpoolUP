/**
 * Generates src/theme/font-metrics.json: per-face advance widths for the
 * film's charset, read from the real TTFs. The runtime `measureText` and the
 * text-fit tests both use this table, so browser and Node agree exactly.
 * `test/text.test.ts` regenerates it in memory and fails if the file is stale.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_FILES } from '../src/theme/font-files';
import { buildMetrics } from './metrics-core';

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'theme', 'font-metrics.json');
writeFileSync(target, JSON.stringify(buildMetrics(FONT_FILES), null, 1) + '\n');
console.log(`metrics: wrote ${target}`);
