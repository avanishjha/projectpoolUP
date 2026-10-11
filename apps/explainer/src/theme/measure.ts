/**
 * Text measurement from the real TTF advance tables (font-metrics.json).
 * Identical in the browser and in Node, so the layout the tests check is the
 * layout the film renders. Kerning is ignored on purpose: Inter's and Space
 * Grotesk's kerning is overwhelmingly negative, so advances alone are a safe
 * upper bound (test/text.test.ts proves it against opentype's kerned width).
 */
import rawMetrics from './font-metrics.json';
import type { FaceKey } from './font-files';
import type { FaceMetrics, FontMetrics } from './metrics-types';

export const METRICS = rawMetrics as unknown as FontMetrics;

const faceMetrics = (face: FaceKey): FaceMetrics => METRICS.faces[face];

const DIGITS = /[0-9]/;

export const measureText = (
  text: string,
  face: FaceKey,
  size: number,
  trackingEm = 0,
  tnum = false,
): number => {
  const m = faceMetrics(face);
  const fallback = Math.max(...Object.values(m.advances));
  let units = 0;
  let n = 0;
  for (const ch of text) {
    n++;
    if (tnum && DIGITS.test(ch)) units += m.tnum;
    else units += m.advances[ch] ?? fallback;
  }
  // Chrome adds letter-spacing after every glyph; when tracking is negative,
  // assuming n − 1 gaps gives the larger (safer) width.
  const gaps = trackingEm > 0 ? n : Math.max(0, n - 1);
  return (units / m.upm) * size + trackingEm * size * gaps;
};

/** Baseline y for a line box whose top edge is `top`. */
export const baselineIn = (top: number, face: FaceKey, size: number, lineHeight: number): number => {
  const m = faceMetrics(face);
  const asc = (m.ascender / m.upm) * size;
  const desc = (-m.descender / m.upm) * size;
  return top + (lineHeight - (asc + desc)) / 2 + asc;
};

/** Cap height in px — for optically centring text against icons. */
export const capHeight = (face: FaceKey, size: number): number => {
  const m = faceMetrics(face);
  return (m.capHeight / m.upm) * size;
};

/** Characters in `text` that `face` cannot render. */
export const missingGlyphs = (text: string, face: FaceKey): string[] => {
  const m = faceMetrics(face);
  return [...new Set([...text].filter((ch) => m.advances[ch] === undefined))];
};
