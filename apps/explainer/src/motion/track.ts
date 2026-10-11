/** Keyframe tracks and time-window helpers. All pure functions of t. */
import { clamp01, smootherstep, smoothstep, type Ease } from './easing';

export type Lerp<T> = (a: T, b: T, u: number) => T;

export interface Key<T> {
  readonly t: number;
  readonly v: T;
  /** Easing for the segment that starts at this key. Default smootherstep. */
  readonly ease?: Ease;
}

export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** Normalised position of t inside [a, b], clamped. */
export const progress = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));

export const sampleTrack = <T>(keys: readonly Key<T>[], t: number, mix: Lerp<T>): T => {
  const first = keys[0];
  if (!first) throw new Error('empty track');
  if (t <= first.t) return first.v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (t < b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return mix(a.v, b.v, (a.ease ?? smootherstep)(u));
    }
  }
  return keys[keys.length - 1]!.v;
};

export const sampleNumber = (keys: readonly Key<number>[], t: number): number =>
  sampleTrack(keys, t, lerp);

/**
 * Visibility window: rises over [inAt, inAt + dIn], falls over
 * [outAt, outAt + dOut]. Smoothstep both ways.
 */
export const fade = (t: number, inAt: number, outAt = Infinity, dIn = 0.4, dOut = 0.35): number => {
  const rise = smoothstep(progress(t, inAt, inAt + dIn));
  // An open-ended window must not evaluate progress(t, ∞, ∞) — that is NaN,
  // and SVG treats a NaN opacity as fully opaque.
  return Number.isFinite(outAt) ? rise * (1 - smoothstep(progress(t, outAt, outAt + dOut))) : rise;
};

/** Smooth bump: 0 → 1 → 0 across [a, b], peak in the middle. */
export const bump = (t: number, a: number, b: number): number => {
  if (t <= a || t >= b) return 0;
  return Math.sin((Math.PI * (t - a)) / (b - a)) ** 2;
};

/**
 * Cross-fade weights for content B replacing content A at boundary tb. The
 * outgoing content is fully gone by tb; the incoming reaches 50% after tb.
 */
export const crossfade = (t: number, tb: number, width = 0.8): { out: number; in: number } => {
  const half = width / 2;
  return {
    out: 1 - smoothstep(progress(t, tb - half, tb)),
    in: smoothstep(progress(t, tb - half * 0.25, tb + half)),
  };
};
