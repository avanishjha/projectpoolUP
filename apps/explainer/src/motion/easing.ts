/** Closed-form easings on u ∈ [0, 1]. Inputs outside the range clamp. */
export type Ease = (u: number) => number;

/** Clamp to [0, 1]. NaN is a bug upstream: fail loudly rather than render it. */
export const clamp01 = (u: number): number => {
  if (Number.isNaN(u)) throw new Error('clamp01(NaN): an animation input is undefined');
  return u <= 0 ? 0 : u >= 1 ? 1 : u;
};

export const linear: Ease = (u) => clamp01(u);

/** 3u² − 2u³ — C¹: zero velocity at both ends. */
export const smoothstep: Ease = (u) => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};

/** 6u⁵ − 15u⁴ + 10u³ — C²: zero velocity and acceleration at both ends. */
export const smootherstep: Ease = (u) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};

export const easeOutCubic: Ease = (u) => 1 - (1 - clamp01(u)) ** 3;

export const easeInOutSine: Ease = (u) => (1 - Math.cos(Math.PI * clamp01(u))) / 2;
