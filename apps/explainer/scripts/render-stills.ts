/**
 * Renders PNG stills at the film's key moments (or at times passed as args,
 * in seconds) into out/stills/. Bundles once, then renders each frame.
 *
 *   pnpm stills            # the default review set
 *   pnpm stills 51.6 63    # specific times
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

/** One per settled state and the mid-point of every global transition. */
const REVIEW_SET = [
  5.5, 10.5, 14.2, 18.6, 21.2, 27.8, 33.8, 40.0, 45.0, 51.6, 56.6, 63.0, 71.6, 76.5, 81.3, 88.0, 95.0, 101.6, 108.0, 119.9,
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'out', 'stills');
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const times = args.length ? args : REVIEW_SET;

const serveUrl = await bundle({ entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public') });
const composition = await selectComposition({ serveUrl, id: 'ConqrExplainer' });

for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = join(outDir, `t${s.toFixed(1).padStart(5, '0')}.png`);
  await renderStill({ composition, serveUrl, frame, output, imageFormat: 'png' });
  console.log(`still ${s.toFixed(1)}s (frame ${frame}) → ${output}`);
}
