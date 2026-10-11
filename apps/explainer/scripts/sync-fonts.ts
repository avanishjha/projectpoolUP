/** Copies the app's TTFs into public/fonts so Remotion can serve them. */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_FILES } from '../src/theme/font-files';
import { ttfPath } from './font-paths';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');
mkdirSync(out, { recursive: true });
for (const f of FONT_FILES) copyFileSync(ttfPath(f), join(out, f.file));
console.log(`fonts: ${FONT_FILES.length} faces → public/fonts`);
