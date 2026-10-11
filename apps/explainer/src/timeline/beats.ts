/** Global beats and states (spec §4.1–4.2). Mirrored by spec.md; see spec-sync test. */
export type GlobalState = 'A' | 'B' | 'C';

export type BeatId = 'friction' | 'solution' | 'deep-dive' | 'impact' | 'resolution';

export interface Beat {
  readonly id: BeatId;
  readonly start: number;
  readonly end: number;
  readonly state: GlobalState;
  readonly name: string;
}

export const BEATS: readonly Beat[] = [
  { id: 'friction', start: 0, end: 20, state: 'A', name: 'The Friction' },
  { id: 'solution', start: 20, end: 50, state: 'B', name: 'The Structural Solution' },
  { id: 'deep-dive', start: 50, end: 80, state: 'B', name: 'Deep Dive' },
  { id: 'impact', start: 80, end: 100, state: 'C', name: 'Measured Impact' },
  { id: 'resolution', start: 100, end: 120, state: 'C', name: 'Resolution & CTA' },
];

export const beatAt = (t: number): Beat =>
  BEATS.find((b) => t >= b.start && t < b.end) ?? BEATS[BEATS.length - 1]!;

export const stateAt = (t: number): GlobalState => beatAt(t).state;

/** The global transitions (spec §4.1): trigger time and morph duration. */
export const TRANSITIONS = [
  { from: 'S0', to: 'A', at: 0, duration: 1.2 },
  { from: 'A', to: 'B', at: 20, duration: 2.4 },
  { from: 'B', to: "B'", at: 50, duration: 3.0 },
  { from: "B'", to: 'C', at: 80, duration: 2.6 },
  { from: 'C', to: "C'", at: 100, duration: 3.0 },
] as const;
