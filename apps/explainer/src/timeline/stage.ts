/**
 * Settled geometry for every state (spec §4.4). An actor rests on one of
 * these between morphs. Mirrored by spec.md; see the spec-sync test.
 */
import type { Placement } from '../layout/geometry';

const p = (x: number, y: number, w: number, h: number, r: number, rot = 0): Placement => ({
  x,
  y,
  w,
  h,
  r,
  rot,
});

export const STAGE = {
  // State A — silos, tilted and disconnected. The chat opens centred (A0).
  'A0.pact': p(720, 335, 480, 640, 28, -1.5),
  'A.pact': p(140, 335, 480, 640, 28, -2.5),
  'A.tracker': p(700, 370, 520, 460, 24, 1.8),
  'A.money': p(1300, 360, 480, 560, 28, -1.6),

  // State B — four mechanic nodes on one rail.
  'B.pact': p(96, 360, 360, 540, 28),
  'B.tracker': p(552, 360, 360, 540, 28),
  'B.money': p(1008, 360, 360, 540, 28),
  'B.pot': p(1464, 360, 360, 540, 28),

  // B′ — the deep dive.
  'D.tracker': p(96, 380, 460, 600, 28),
  'D.money': p(588, 380, 704, 600, 28),
  'D.pot': p(1340, 88, 432, 904, 68),

  // State C — the ledger.
  'C.pact': p(96, 300, 402, 220, 24),
  'C.tracker': p(538, 300, 402, 220, 24),
  'C.money': p(980, 300, 402, 220, 24),
  'C.pot': p(1422, 300, 402, 220, 24),
  'C.chart': p(96, 560, 1728, 376, 24),

  // C′ — the end state.
  'E.pot': p(1300, 88, 432, 904, 68),
  'E.brand': p(96, 338, 1000, 404, 0),
} as const satisfies Record<string, Placement>;

export type StageKey = keyof typeof STAGE;

/** Phone screens are authored in iOS points and scaled into a 412px-wide screen. */
export const PHONE = {
  bezel: 10,
  points: { w: 390, h: 836 },
  /** 412 / 390 */
  scale: (432 - 20) / 390,
  screenRadius: 58,
} as const;
