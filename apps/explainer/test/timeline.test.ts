/** The state machine (spec §4): beats, phases, captions, cues and the story clock agree. */
import { describe, expect, it } from 'vitest';
import { clockLabel } from '../src/data/format';
import { DURATION_FRAMES, FRAME } from '../src/layout/frame';
import { ACTORS, PHASES, TRACKS } from '../src/timeline/actors';
import { BEATS, stateAt } from '../src/timeline/beats';
import { CAPTIONS } from '../src/timeline/captions';
import { cameraAt, DEPTH } from '../src/timeline/camera';
import { DEADLINE, storyClock, storySecondsOfDay } from '../src/timeline/clock';
import { CUE } from '../src/timeline/cues';
import { STAGE } from '../src/timeline/stage';

describe('beats and states', () => {
  it('are contiguous over exactly 0–120 s', () => {
    expect(BEATS[0]!.start).toBe(0);
    expect(BEATS.at(-1)!.end).toBe(FRAME.seconds);
    for (let i = 1; i < BEATS.length; i++) expect(BEATS[i]!.start).toBe(BEATS[i - 1]!.end);
    expect(DURATION_FRAMES).toBe(3600);
  });

  it('run A → B → C in order and never go back', () => {
    const order = { A: 0, B: 1, C: 2 } as const;
    let prev = 0;
    for (let f = 0; f < DURATION_FRAMES; f++) {
      const s = order[stateAt(f / FRAME.fps)];
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe('actors', () => {
  it('keyframes are strictly time-ordered and inside the film', () => {
    for (const id of ACTORS) {
      const keys = TRACKS[id];
      for (let i = 1; i < keys.length; i++) expect(keys[i]!.t).toBeGreaterThan(keys[i - 1]!.t);
      for (const k of keys) {
        expect(k.t).toBeGreaterThanOrEqual(0);
        expect(k.t).toBeLessThanOrEqual(120);
      }
    }
  });

  it('content phases never overlap and each is authored at a stage size', () => {
    const sizes = new Set(Object.values(STAGE).map((p) => `${p.w}x${p.h}`));
    for (const id of ACTORS) {
      const phases = PHASES[id];
      for (let i = 1; i < phases.length; i++) expect(phases[i]!.from).toBeGreaterThanOrEqual(phases[i - 1]!.to);
      for (const p of phases) expect(sizes.has(`${p.native.w}x${p.native.h}`)).toBe(true);
    }
  });
});

describe('captions', () => {
  it('fit inside the film and never collide in the same region (exit included)', () => {
    for (const c of CAPTIONS) {
      expect(c.in).toBeGreaterThanOrEqual(0);
      expect(c.out + 0.35).toBeLessThanOrEqual(120);
      expect(c.out).toBeGreaterThan(c.in);
    }
    for (const region of ['top', 'left'] as const) {
      const list = CAPTIONS.filter((c) => c.region === region);
      for (let i = 1; i < list.length; i++) expect(list[i]!.in).toBeGreaterThanOrEqual(list[i - 1]!.out + 0.35);
    }
  });

  it('every beat-3 eyebrow names the time the phone shows when it appears', () => {
    const at = (id: string) => CAPTIONS.find((c) => c.id === id)!;
    expect(at('c10').eyebrow).toContain(clockLabel(storySecondsOfDay(at('c10').in), false));
    expect(at('c11').eyebrow).toContain(clockLabel(storySecondsOfDay(at('c11').in), false));
    expect(at('c12').eyebrow).toContain(clockLabel(storySecondsOfDay(at('c12').in), false));
  });
});

describe('story clock (spec §4.8)', () => {
  it('is monotonic and lands on the 23:30 deadline exactly as the engine starts', () => {
    let prev = -Infinity;
    for (let t = 50; t <= 80; t += 1 / 120) {
      const c = storyClock(t);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
    expect(storyClock(66)).toBe(DEADLINE);
    expect(storyClock(CUE.engine.runAt)).toBeGreaterThanOrEqual(DEADLINE);
    expect(clockLabel(storySecondsOfDay(58.2))).toBe('23:29:00');
  });
});

describe('cue consistency between the engine and the phone', () => {
  const row = (i: number) => CUE.engine.rowStart + i * CUE.engine.rowGap;
  it('Kabir turns red with the Fine row; the pot ticks after the Pot row; settled after the last row', () => {
    expect(CUE.phone.kabirMissed).toBeCloseTo(row(5), 9);
    expect(CUE.phone.potTick).toBeGreaterThan(row(7));
    expect(CUE.engine.doneAt).toBeGreaterThan(row(7));
    expect(CUE.phone.resort).toBeGreaterThan(CUE.engine.doneAt);
    expect(CUE.phone.shame).toBeGreaterThan(CUE.phone.resort);
  });

  it('the chat script is in order', () => {
    const at = CUE.chat.script.map((s) => s.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

describe('camera', () => {
  it('never pushes the world plane past 1.03× (safe-area headroom)', () => {
    for (let f = 0; f < DURATION_FRAMES; f++) {
      const z = 1 + (cameraAt(f / FRAME.fps).zoom - 1) * DEPTH.world.zoom;
      expect(z).toBeLessThanOrEqual(1.03);
    }
  });

  it('is perfectly still for the poster frame', () => {
    const a = cameraAt(118.5);
    const b = cameraAt(119.95);
    expect(a.panX).toBeCloseTo(0, 12);
    expect(b.panY).toBeCloseTo(0, 12);
    expect(a.zoom).toBe(b.zoom);
  });
});
