/**
 * Closed-form step response of a damped harmonic oscillator, parameterised
 * the Apple way: damping ratio ζ and response R (undamped period, seconds).
 * x(0) = 0, x'(0) = 0, x(∞) = 1. No integration — any t, any order.
 */
import { smootherstep, type Ease } from './easing';

export interface SpringParams {
  /** Damping ratio ζ. 1 = critically damped (no overshoot). */
  readonly damping: number;
  /** Response R: the undamped period in seconds. */
  readonly response: number;
}

export const SPRINGS = {
  /** Chips, rows, counters — no overshoot. */
  ui: { damping: 1, response: 0.45 },
  /** Actor and card entrances. */
  enter: { damping: 0.82, response: 0.6 },
  /** Caption word reveal. */
  word: { damping: 0.9, response: 0.5 },
  /** Shutter, check badges — one small overshoot. */
  snap: { damping: 0.7, response: 0.35 },
} as const satisfies Record<string, SpringParams>;

export const springStep = (t: number, p: SpringParams): number => {
  if (t <= 0) return 0;
  const w0 = (2 * Math.PI) / p.response;
  const z = p.damping;
  if (Math.abs(z - 1) < 1e-9) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  // Overdamped, written as two decaying exponentials so cosh/sinh never overflow.
  const wh = w0 * Math.sqrt(z * z - 1);
  const k = (z * w0) / wh;
  return (
    1 - 0.5 * (1 + k) * Math.exp((-z * w0 + wh) * t) - 0.5 * (1 - k) * Math.exp((-z * w0 - wh) * t)
  );
};

/** Smallest t after which |x(t) − 1| < eps forever. */
export const settleTime = (p: SpringParams, eps = 1e-3): number => {
  const w0 = (2 * Math.PI) / p.response;
  const z = p.damping;
  if (z < 1) {
    // Envelope of the oscillating error: e^(−ζω₀t) / √(1 − ζ²).
    return Math.log(1 / (eps * Math.sqrt(1 - z * z))) / (z * w0);
  }
  // ζ ≥ 1: the error 1 − x(t) is positive and monotonically decreasing.
  let lo = 0;
  let hi = 1;
  while (1 - springStep(hi, p) > eps) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (1 - springStep(mid, p) > eps) lo = mid;
    else hi = mid;
  }
  return hi;
};

/** Spring progress since t0 (0 before t0). */
export const spring = (t: number, t0: number, p: SpringParams = SPRINGS.ui): number =>
  springStep(t - t0, p);

/**
 * A spring confined to a keyframe segment of duration D, endpoint-corrected:
 * s*(u) = x(uD) + (1 − x(D))·smootherstep(u). Exactly 1 at u = 1, C² ends.
 */
export const springEase =
  (p: SpringParams, duration: number): Ease =>
  (u) => {
    const x = u <= 0 ? 0 : u >= 1 ? 1 : u;
    return springStep(x * duration, p) + (1 - springStep(duration, p)) * smootherstep(x);
  };
