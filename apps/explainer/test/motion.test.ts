/**
 * The motion engine (spec §5). Closed forms are checked against first
 * principles: the spring against a numerical ODE solution, easings against
 * their boundary conditions, colour against a round trip.
 */
import { describe, expect, it } from 'vitest';
import { clamp01, easeInOutSine, easeOutCubic, linear, smootherstep, smoothstep, type Ease } from '../src/motion/easing';
import { settleTime, springEase, springStep, SPRINGS, type SpringParams } from '../src/motion/spring';
import { crossfade, fade, sampleNumber } from '../src/motion/track';
import { mixColor, parseColor, fromOklab, toOklab } from '../src/motion/color';
import { wobble } from '../src/motion/noise';

const d = (f: Ease, u: number, h = 1e-4) => (f(Math.min(1, u + h)) - f(Math.max(0, u - h))) / (Math.min(1, u + h) - Math.max(0, u - h));
const d2 = (f: Ease, u: number, h = 1e-3) => (f(u + h) - 2 * f(u) + f(u - h)) / (h * h);

describe('easings', () => {
  const all: Record<string, Ease> = { linear, smoothstep, smootherstep, easeOutCubic, easeInOutSine };
  it.each(Object.entries(all))('%s maps 0→0 and 1→1 and clamps', (_, f) => {
    expect(f(0)).toBe(0);
    expect(f(1)).toBeCloseTo(1, 12);
    expect(f(-3)).toBe(f(0));
    expect(f(7)).toBe(f(1));
  });

  it('smootherstep is C²: zero velocity and acceleration at both ends', () => {
    expect(Math.abs(d(smootherstep, 0))).toBeLessThan(1e-6);
    expect(Math.abs(d(smootherstep, 1))).toBeLessThan(1e-6);
    // second derivative 60u − 180u² + 120u³ → 0 at the ends (sampled just inside)
    expect(Math.abs(d2(smootherstep, 0.002))).toBeLessThan(0.15);
    expect(Math.abs(d2(smootherstep, 0.998))).toBeLessThan(0.15);
  });

  it('smootherstep is monotonic', () => {
    let prev = -1;
    for (let u = 0; u <= 1; u += 0.001) {
      const v = smootherstep(u);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('clamp01 refuses NaN instead of letting SVG render it as opaque', () => {
    expect(() => clamp01(Number.NaN)).toThrow();
  });
});

/** RK4 integration of x'' = −ω₀²(x − 1) − 2ζω₀x', x(0) = 0, x'(0) = 0. */
const integrate = (p: SpringParams, tEnd: number, dt = 1e-4): Map<number, number> => {
  const w0 = (2 * Math.PI) / p.response;
  const z = p.damping;
  const acc = (x: number, v: number) => -w0 * w0 * (x - 1) - 2 * z * w0 * v;
  const out = new Map<number, number>();
  let x = 0;
  let v = 0;
  const steps = Math.round(tEnd / dt);
  for (let i = 1; i <= steps; i++) {
    const k1x = v;
    const k1v = acc(x, v);
    const k2x = v + (dt / 2) * k1v;
    const k2v = acc(x + (dt / 2) * k1x, v + (dt / 2) * k1v);
    const k3x = v + (dt / 2) * k2v;
    const k3v = acc(x + (dt / 2) * k2x, v + (dt / 2) * k2v);
    const k4x = v + dt * k3v;
    const k4v = acc(x + dt * k3x, v + dt * k3v);
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (i % 100 === 0) out.set(Math.round(i * dt * 1e6) / 1e6, x);
  }
  return out;
};

describe('spring (closed form)', () => {
  const cases: SpringParams[] = [
    { damping: 0.5, response: 0.4 },
    SPRINGS.snap,
    SPRINGS.enter,
    SPRINGS.word,
    SPRINGS.ui,
    { damping: 1.6, response: 0.5 },
  ];

  it.each(cases)('matches an RK4 solution of the ODE (ζ=$damping, R=$response)', (p) => {
    for (const [t, x] of integrate(p, 2)) expect(Math.abs(springStep(t, p) - x)).toBeLessThan(1e-7);
  });

  it.each(cases)('settleTime bounds the error for all later t (ζ=$damping)', (p) => {
    const ts = settleTime(p, 1e-3);
    for (let t = ts; t < ts + 5; t += 0.001) expect(Math.abs(springStep(t, p) - 1)).toBeLessThan(1e-3 + 1e-12);
  });

  it('is zero (with zero velocity) before it starts', () => {
    expect(springStep(-1, SPRINGS.enter)).toBe(0);
    expect(springStep(0, SPRINGS.enter)).toBe(0);
    expect(springStep(1e-6, SPRINGS.enter)).toBeLessThan(1e-8);
  });

  it('springEase hits both endpoints exactly and stays within 0.1% of the free spring', () => {
    for (const p of cases) {
      const D = Math.max(1.4, settleTime(p));
      const e = springEase(p, D);
      expect(e(0)).toBe(0);
      expect(e(1)).toBe(1);
      for (let u = 0; u <= 1; u += 0.01) expect(Math.abs(e(u) - springStep(u * D, p))).toBeLessThan(1e-3);
    }
  });

  it('every spring the film uses settles inside the shortest segment it drives (1.4 s)', () => {
    for (const p of Object.values(SPRINGS)) expect(settleTime(p, 1e-3)).toBeLessThan(1.4);
  });
});

describe('tracks and windows', () => {
  it('sampleNumber is continuous at every key', () => {
    const keys = [
      { t: 0, v: 0 },
      { t: 1, v: 10 },
      { t: 1, v: 10 },
      { t: 3, v: -4 },
    ];
    for (const k of keys) expect(Math.abs(sampleNumber(keys, k.t - 1e-9) - sampleNumber(keys, k.t + 1e-9))).toBeLessThan(1e-6);
  });

  it('fade with an open end never returns NaN (regression: NaN opacity renders opaque)', () => {
    for (let t = 0; t < 120; t += 0.25) {
      const v = fade(t, 23.4, Infinity, 0.5);
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(fade(18.6, 23.4)).toBe(0);
  });

  it('crossfade: outgoing content is gone before the incoming reaches 50%', () => {
    for (let t = 9; t < 11; t += 0.001) {
      const w = crossfade(t, 10);
      if (w.in >= 0.5) expect(w.out).toBe(0);
    }
  });
});

describe('colour', () => {
  it('OKLab round-trips sRGB within one code value', () => {
    for (const hex of ['#0B0F19', '#6366F1', '#10B981', '#F9FAFB', '#9CA3AF', '#E0626E', '#06080D']) {
      const c = parseColor(hex);
      const back = fromOklab(toOklab(c));
      expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(1);
    }
  });

  it('mixColor returns the exact endpoints', () => {
    expect(mixColor('#6366F1', '#10B981', 0)).toBe('rgba(99,102,241,1)');
    expect(mixColor('#6366F1', '#10B981', 1)).toBe('rgba(16,185,129,1)');
  });

  it('card → device midpoint stays a neutral dark blue (no green cast)', () => {
    const mid = parseColor(mixColor('#141A28', '#06080D', 0.5));
    expect(mid.b).toBeGreaterThan(mid.g);
    expect(mid.g).toBeGreaterThanOrEqual(mid.r);
  });
});

describe('noise', () => {
  it('wobble stays in [−1, 1] and is deterministic', () => {
    for (let t = 0; t < 120; t += 0.07) {
      const v = wobble(t, 3);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(wobble(t, 3)).toBe(v);
    }
  });
});
