/**
 * spec.md is the blueprint; these three tables in it must equal the code
 * that runs the film (beats §4.2, stage §4.4, copy deck §4.7).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BEATS } from '../src/timeline/beats';
import { CAPTIONS } from '../src/timeline/captions';
import { STAGE } from '../src/timeline/stage';

const spec = readFileSync(fileURLToPath(new URL('../spec.md', import.meta.url)), 'utf8');

const table = (name: string): Record<string, string>[] => {
  const m = spec.match(new RegExp(`<!-- ${name}:begin -->([\\s\\S]*?)<!-- ${name}:end -->`));
  if (!m) throw new Error(`spec.md has no ${name} table`);
  const rows = m[1]!
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .map((l) =>
      l
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
  const [head, , ...body] = rows;
  return body.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i] ?? ''])));
};

describe('spec.md ⇄ code', () => {
  it('§4.2 beats', () => {
    const rows = table('beats');
    expect(rows.map((r) => ({ id: r.id, start: Number(r.start), end: Number(r.end), state: r.state, name: r.name }))).toEqual(
      BEATS.map((b) => ({ id: b.id, start: b.start, end: b.end, state: b.state, name: b.name })),
    );
  });

  it('§4.4 stage', () => {
    const rows = table('stage');
    const fromSpec = Object.fromEntries(
      rows.map((r) => [r.key, { x: Number(r.x), y: Number(r.y), w: Number(r.w), h: Number(r.h), r: Number(r.r), rot: Number(r.rot) }]),
    );
    expect(fromSpec).toEqual(STAGE);
  });

  it('§4.7 copy deck', () => {
    const rows = table('copy');
    expect(
      rows.map((r) => ({
        id: r.id,
        in: Number(r.in),
        out: Number(r.out),
        region: r.region,
        eyebrow: r.eyebrow,
        headline: r.headline!.split(' / '),
        sub: r.sub,
      })),
    ).toEqual(CAPTIONS.map(({ id, in: i, out, region, eyebrow, headline, sub }) => ({ id, in: i, out, region, eyebrow, headline: [...headline], sub })));
  });
});
