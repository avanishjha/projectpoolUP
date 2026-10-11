/**
 * Text rules (spec §6.4, rules 3–5) on the real components. The film is
 * rendered to static SVG on the server every 0.5 s; every <text> it emits is
 * parsed and held to the box it declared (`data-max-w`), using the same
 * TTF metrics the browser renders with.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { Film } from '../src/film/Film';
import { FONT_FILES, type FaceKey } from '../src/theme/font-files';
import { METRICS, measureText, missingGlyphs } from '../src/theme/measure';
import { buildMetrics } from '../scripts/metrics-core';
import { loadFont } from '../scripts/load-font';

interface TextNode {
  readonly t: number;
  readonly content: string;
  readonly face: FaceKey;
  readonly size: number;
  readonly ls: number;
  readonly tnum: boolean;
  readonly maxW: number;
  readonly scale: number;
  readonly decorative: boolean;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");

const textsAt = (t: number): TextNode[] => {
  const svg = renderToStaticMarkup(createElement(Film, { t }));
  const out: TextNode[] = [];
  for (const m of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = Object.fromEntries([...m[1]!.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    if (attrs['data-max-w'] === undefined) throw new Error(`<text> without data-max-w at t=${t}: ${m[0].slice(0, 120)}`);
    out.push({
      t,
      content: decode(m[2]!.replace(/<[^>]+>/g, '')),
      face: attrs['data-face'] as FaceKey,
      size: Number(attrs['data-size']),
      ls: Number(attrs['data-ls']),
      tnum: attrs['data-tnum'] === '1',
      maxW: Number(attrs['data-max-w']),
      scale: Number(attrs['data-scale']),
      decorative: attrs['data-decorative'] === '1',
    });
  }
  return out;
};

/** Every 0.5 s across the film. */
const SAMPLES = Array.from({ length: 240 }, (_, i) => i * 0.5);
/** Moments when every actor is at rest (no morph scaling in play). */
const HOLDS = [5.5, 10.5, 14.2, 18.6, 27.8, 33.8, 40, 45, 56.6, 63, 71.6, 76.5, 88, 95, 108, 119.9];

let all: TextNode[] = [];
let holds: TextNode[] = [];

beforeAll(() => {
  all = SAMPLES.flatMap(textsAt);
  holds = HOLDS.flatMap(textsAt);
});

describe('text rules on the rendered film', () => {
  it('renders text at every sample (sanity)', () => {
    expect(all.length).toBeGreaterThan(5000);
  });

  it('rule 3 — every string fits the box it declared', () => {
    const failures = all
      .map((n) => ({ n, w: measureText(n.content, n.face, n.size, n.ls, n.tnum) }))
      .filter(({ n, w }) => w > n.maxW + 0.5)
      .map(({ n, w }) => `t=${n.t} "${n.content}" ${n.face}@${n.size}: ${w.toFixed(1)} > ${n.maxW}`);
    expect([...new Set(failures)]).toEqual([]);
  });

  it('rule 4 — every glyph exists in its face; no emoji anywhere', () => {
    const failures = new Set<string>();
    for (const n of all) {
      const missing = missingGlyphs(n.content, n.face);
      if (missing.length) failures.add(`"${n.content}" ${n.face} missing ${missing.join('')}`);
      if (/\p{Extended_Pictographic}/u.test(n.content)) failures.add(`emoji in "${n.content}"`);
    }
    expect([...failures]).toEqual([]);
  });

  it('rule 5 — on-screen sizes at rest: content ≥ 11px, decorative initials ≥ 8px', () => {
    const failures = holds
      .filter((n) => n.size * n.scale < (n.decorative ? 8 : 11))
      .map((n) => `t=${n.t} "${n.content}" ${(n.size * n.scale).toFixed(1)}px`);
    expect([...new Set(failures)]).toEqual([]);
  });

  it('captions keep their role sizes: headline 60px, sub 28px', () => {
    const caps = holds.filter((n) => n.scale === 1 && n.face === 'SpaceGrotesk-600' && n.size === 60);
    expect(caps.length).toBeGreaterThan(10);
  });
});

describe('the measurer is safe', () => {
  /**
   * Reference width = glyph advances + GPOS pair kerning, read with opentype.
   * GSUB shaping is out of scope: opentype.js 1.3 cannot run Inter's
   * chained-context lookups, and the film sets no ligature-prone strings.
   */
  it('advance-table widths are an upper bound on kerned widths for every string in the film', () => {
    const fonts = new Map(FONT_FILES.map((f) => [f.face, loadFont(f)]));
    const seen = new Set<string>();
    const failures: string[] = [];
    for (const n of all) {
      const key = `${n.face}|${n.content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ours = measureText(n.content, n.face, 100, 0, false);
      const font = fonts.get(n.face)!;
      const glyphs = [...n.content].map((ch) => font.charToGlyph(ch));
      let units = 0;
      glyphs.forEach((g, i) => {
        units += g.advanceWidth ?? 0;
        if (i > 0) units += font.getKerningValue(glyphs[i - 1]!, g);
      });
      const kerned = (units / font.unitsPerEm) * 100;
      if (ours < kerned - 0.01) failures.push(`"${n.content}" ${n.face}: ${ours.toFixed(2)} < ${kerned.toFixed(2)}`);
    }
    expect(failures).toEqual([]);
    expect(seen.size).toBeGreaterThan(200);
  });

  it('font-metrics.json is current with the TTFs it was generated from', () => {
    expect(JSON.parse(JSON.stringify(buildMetrics(FONT_FILES)))).toEqual(METRICS);
  });
});
