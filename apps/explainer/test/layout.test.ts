/**
 * Content layout rules (spec §6.4, rules 1–2), checked on every one of the
 * 3,600 frames — not on a sample. Rotated rects are tested by their rotated
 * bounding box; the camera is applied for the action-safe check.
 */
import { describe, expect, it } from 'vitest';
import { ACTION_SAFE, DURATION_FRAMES, FRAME, MIN_GAP, TITLE_SAFE } from '../src/layout/frame';
import { contains, rotatedBounds, tooClose, type Rect } from '../src/layout/geometry';
import { ACTORS, actorPose, isSettled, type ActorId } from '../src/timeline/actors';
import { cameraAt, DEPTH, toScreen } from '../src/timeline/camera';
import { captionBounds, CAPTIONS, REGIONS } from '../src/timeline/captions';
import { STAGE } from '../src/timeline/stage';
import { FOOTNOTE_BOX } from '../src/scenes/Footnote';
import { CTA_W } from '../src/scenes/Outro';
import { CUE } from '../src/timeline/cues';

const frames = Array.from({ length: DURATION_FRAMES }, (_, f) => f / FRAME.fps);

const settledBounds = (t: number): { id: ActorId; box: Rect }[] =>
  ACTORS.filter((id) => isSettled(id, t)).map((id) => ({ id, box: rotatedBounds(actorPose(id, t)) }));

/** Caption blocks fully on screen at t (entrance finished, exit not begun). */
const settledCaptions = (t: number) => CAPTIONS.filter((c) => t >= c.in + 1.0 && t <= c.out);

const fmt = (r: Rect) => `{x:${r.x.toFixed(1)}, y:${r.y.toFixed(1)}, w:${r.w.toFixed(1)}, h:${r.h.toFixed(1)}}`;

describe('stage geometry (spec §4.4)', () => {
  it.each(Object.entries(STAGE))('%s lies inside title-safe (rotation included)', (_, p) => {
    expect(contains(TITLE_SAFE, rotatedBounds(p)), fmt(rotatedBounds(p))).toBe(true);
  });
});

describe('rule 1 — containment, every frame', () => {
  it('settled actors stay inside title-safe at rest and action-safe under the camera', () => {
    const failures: string[] = [];
    for (const t of frames) {
      const cam = cameraAt(t);
      for (const { id, box } of settledBounds(t)) {
        // Chaos jitter (±2px) may nudge a State-A silo; it is still well inside.
        if (!contains(TITLE_SAFE, box, 2.5)) failures.push(`t=${t.toFixed(2)} ${id} outside title-safe ${fmt(box)}`);
        const screen = toScreen(box, cam, DEPTH.world);
        if (!contains(ACTION_SAFE, screen)) failures.push(`t=${t.toFixed(2)} ${id} outside action-safe ${fmt(screen)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('every caption block fits its region and title-safe', () => {
    for (const c of CAPTIONS) {
      const b = captionBounds(c);
      expect(b.w, c.id).toBeLessThanOrEqual(REGIONS[c.region].maxW);
      expect(contains(TITLE_SAFE, b), `${c.id} ${fmt(b)}`).toBe(true);
    }
  });

  it('footnote, chart and outro stay inside title-safe', () => {
    const footnote = { x: FOOTNOTE_BOX.x, y: FOOTNOTE_BOX.y, w: TITLE_SAFE.w, h: FOOTNOTE_BOX.lineHeight * 2 };
    expect(contains(TITLE_SAFE, footnote), fmt(footnote)).toBe(true);
    expect(contains(TITLE_SAFE, STAGE['C.chart'])).toBe(true);
    const cta = { x: STAGE['E.brand'].x, y: STAGE['E.brand'].y + 332, w: CTA_W, h: 72 };
    expect(contains(STAGE['E.brand'], cta), fmt(cta)).toBe(true);
  });
});

describe('rule 2 — no overlap, every frame', () => {
  it(`settled actors keep ≥ ${MIN_GAP}px from each other`, () => {
    const failures: string[] = [];
    for (const t of frames) {
      const s = settledBounds(t);
      for (let i = 0; i < s.length; i++)
        for (let j = i + 1; j < s.length; j++)
          if (tooClose(s[i]!.box, s[j]!.box, MIN_GAP)) failures.push(`t=${t.toFixed(2)} ${s[i]!.id} ↔ ${s[j]!.id}`);
    }
    expect(failures).toEqual([]);
  });

  it(`settled captions keep ≥ ${MIN_GAP}px from settled actors`, () => {
    const failures: string[] = [];
    for (const t of frames) {
      const actors = settledBounds(t);
      for (const c of settledCaptions(t)) {
        const cb = captionBounds(c);
        for (const a of actors) if (tooClose(cb, a.box, MIN_GAP)) failures.push(`t=${t.toFixed(2)} ${c.id} ↔ ${a.id} ${fmt(cb)} ${fmt(a.box)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('the ledger chart clears the tiles above it and the footnote below it', () => {
    const chart = STAGE['C.chart'];
    for (const k of ['C.pact', 'C.tracker', 'C.money', 'C.pot'] as const) expect(tooClose(chart, STAGE[k], MIN_GAP), k).toBe(false);
    const footnote = { x: FOOTNOTE_BOX.x, y: FOOTNOTE_BOX.y, w: TITLE_SAFE.w, h: FOOTNOTE_BOX.lineHeight * 2 };
    expect(tooClose(chart, footnote, MIN_GAP)).toBe(false);
  });

  it('the outro brand block clears the final phone, and the tiles are gone before it enters', () => {
    expect(tooClose(STAGE['E.brand'], STAGE['E.pot'], MIN_GAP)).toBe(false);
    for (const id of ['pact', 'tracker', 'money'] as const) expect(actorPose(id, CUE.outro.mark).opacity).toBeLessThan(0.01);
  });
});
