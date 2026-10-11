import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';
import type { FontFile } from '../src/theme/font-files';
import { ttfPath } from './font-paths';

export const loadFont = (f: FontFile): opentype.Font => {
  const buf = readFileSync(ttfPath(f));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
