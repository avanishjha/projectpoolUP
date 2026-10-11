import type { FontFile } from '../src/theme/font-files';
import type { FaceMetrics, FontMetrics } from '../src/theme/metrics-types';
import { loadFont } from './load-font';

/** Printable ASCII plus the typographic marks the film uses. */
export const CHARSET =
  Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '₹·—–…×−•’‘“”→';

export const buildMetrics = (files: readonly FontFile[]): FontMetrics => {
  const faces: Record<string, FaceMetrics> = {};
  for (const f of files) {
    const font = loadFont(f);
    const advances: Record<string, number> = {};
    const missing: string[] = [];
    for (const ch of CHARSET) {
      const g = font.charToGlyph(ch);
      if (g.index === 0) missing.push(ch);
      else advances[ch] = g.advanceWidth ?? 0;
    }
    const digitMax = Math.max(...[...'0123456789'].map((d) => advances[d] ?? 0));
    // Tabular figures are separate glyphs reached through GSUB `tnum`; their
    // advance can exceed every proportional digit (Inter 400: 1328 > 1323).
    const subs = (font as unknown as { substitution: { getSingle: (f: string, s: string, l: string) => { sub: number; by: number }[] } }).substitution.getSingle('tnum', 'DFLT', 'dflt');
    const tnum = Math.max(
      ...[...'0123456789'].map((d) => {
        const g = font.charToGlyph(d);
        const s = subs.find((x) => x.sub === g.index);
        return (s ? font.glyphs.get(s.by).advanceWidth : g.advanceWidth) ?? 0;
      }),
    );
    const os2 = font.tables.os2 as unknown as { sCapHeight: number };
    const hhea = font.tables.hhea as unknown as { ascender: number; descender: number };
    faces[f.face] = {
      upm: font.unitsPerEm,
      ascender: hhea.ascender,
      descender: hhea.descender,
      capHeight: os2.sCapHeight,
      digitMax,
      tnum,
      advances,
      missing: missing.join(''),
    };
  }
  return { charset: CHARSET, faces: faces as FontMetrics['faces'] };
};
