import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { FontFile } from '../src/theme/font-files';

const require = createRequire(import.meta.url);

/** Absolute path of a face's TTF inside node_modules. */
export const ttfPath = (f: FontFile): string =>
  join(dirname(require.resolve(`${f.pkg}/package.json`)), f.path);
