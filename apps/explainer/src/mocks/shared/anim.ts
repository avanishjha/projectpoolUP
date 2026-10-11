/** Small animation vocab shared by the mocks. All closed-form in t. */
import { smootherstep } from '../../motion/easing';
import { spring, SPRINGS } from '../../motion/spring';
import { progress } from '../../motion/track';

/** Rise-in: opacity 0→1 and a y offset that settles to 0 on the `enter` spring. */
export const riseIn = (t: number, at: number, dist = 10): { o: number; dy: number } => {
  const s = spring(t, at, SPRINGS.enter);
  return { o: Math.min(1, Math.max(0, s * 1.4)), dy: (1 - s) * dist };
};

/** Pop-in scale for badges and marks (one small overshoot). */
export const popIn = (t: number, at: number): number => Math.max(0, spring(t, at, SPRINGS.snap));

/** Count-up progress: C² ease over `dur` seconds. */
export const countUp = (t: number, at: number, dur = 1.4): number => smootherstep(progress(t, at, at + dur));

/** Fade 0→1 over `dur` from `at`. */
export const fadeIn = (t: number, at: number, dur = 0.35): number => smootherstep(progress(t, at, at + dur));

/** Swap weight: 0 before `at`, 1 after, smooth across `dur`. For state, not for text. */
export const swap = (t: number, at: number, dur = 0.4): number => smootherstep(progress(t, at - dur / 2, at + dur / 2));

/**
 * Sequential swap for text in the same place: the old fades out over
 * [at − d, at], the new fades in over [at, at + d]. They never overlap, so
 * two strings are never legible on top of each other.
 */
export const seq = (t: number, at: number, d = 0.25): { out: number; in: number } => ({
  out: 1 - smootherstep(progress(t, at - d, at)),
  in: smootherstep(progress(t, at, at + d)),
});

/** Transform that scales a group about a point. */
export const scaleAt = (cx: number, cy: number, s: number): string =>
  `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
