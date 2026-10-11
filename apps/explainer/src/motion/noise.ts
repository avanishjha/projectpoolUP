/**
 * Deterministic pseudo-noise: a sum of sines at incommensurate frequencies
 * (Hz). Never repeats within the film; identical on every render.
 */
const FREQS = [0.43, 0.71, 1.13] as const;
const AMPS = [0.55, 0.3, 0.15] as const;

/** Value in [−1, 1]. Different seeds give uncorrelated streams. */
export const wobble = (t: number, seed: number): number => {
  let v = 0;
  for (let i = 0; i < FREQS.length; i++) {
    const phase = (seed * 2.399963 * (i + 1)) % (2 * Math.PI);
    v += AMPS[i]! * Math.sin(2 * Math.PI * FREQS[i]! * t + phase);
  }
  return v;
};
