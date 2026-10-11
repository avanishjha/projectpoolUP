/**
 * The four persistent actors (spec §3.2, §4.3). Each keeps one surface for
 * the whole film. Geometry follows a keyframe track; content cross-fades
 * between phases at fixed boundaries. Pure data + pure functions of t.
 */
import { smootherstep } from '../motion/easing';
import { springEase, SPRINGS } from '../motion/spring';
import { crossfade, fade, lerp, progress, sampleTrack, type Key } from '../motion/track';
import { wobble } from '../motion/noise';
import { lerpPlacement, type Placement } from '../layout/geometry';
import { CUE } from './cues';
import { STAGE } from './stage';

export type ActorId = 'pact' | 'tracker' | 'money' | 'pot';
export const ACTORS: readonly ActorId[] = ['pact', 'tracker', 'money', 'pot'];

export interface Pose extends Placement {
  readonly opacity: number;
  /** Uniform entrance scale about the centre (not a resize). */
  readonly scale: number;
}

const pose = (p: Placement, opacity = 1, scale = 1, dy = 0): Pose => ({
  ...p,
  y: p.y + dy,
  opacity,
  scale,
});

const lerpPose = (a: Pose, b: Pose, u: number): Pose => ({
  ...lerpPlacement(a, b, u),
  opacity: lerp(a.opacity, b.opacity, u),
  scale: lerp(a.scale, b.scale, u),
});

const enter = (d: number) => springEase(SPRINGS.enter, d);
const S = STAGE;

/** Geometry tracks. Hold segments repeat the same value. */
export const TRACKS: Record<ActorId, readonly Key<Pose>[]> = {
  pact: [
    { t: 0.9, v: pose(S['A0.pact'], 0, 0.96, 40), ease: enter(1.6) },
    { t: 2.5, v: pose(S['A0.pact']) },
    { t: 5.6, v: pose(S['A0.pact']), ease: smootherstep },
    { t: 6.8, v: pose(S['A.pact']) },
    { t: 20.0, v: pose(S['A.pact']), ease: smootherstep },
    { t: 22.4, v: pose(S['B.pact']) },
    { t: 50.0, v: pose(S['B.pact']), ease: smootherstep },
    { t: 50.8, v: pose(S['B.pact'], 0, 0.94) },
    { t: 81.6, v: pose(S['C.pact'], 0, 0.94, 24), ease: enter(1.4) },
    { t: 83.0, v: pose(S['C.pact']) },
    { t: 100.0, v: pose(S['C.pact']), ease: smootherstep },
    { t: 100.7, v: pose(S['C.pact'], 0, 1, 16) },
  ],
  tracker: [
    { t: 6.4, v: pose(S['A.tracker'], 0, 0.96, 40), ease: enter(1.6) },
    { t: 8.0, v: pose(S['A.tracker']) },
    { t: 20.0, v: pose(S['A.tracker']), ease: smootherstep },
    { t: 22.4, v: pose(S['B.tracker']) },
    { t: 50.4, v: pose(S['B.tracker']), ease: smootherstep },
    { t: 52.8, v: pose(S['D.tracker']) },
    { t: 80.0, v: pose(S['D.tracker']), ease: smootherstep },
    { t: 82.6, v: pose(S['C.tracker']) },
    { t: 100.1, v: pose(S['C.tracker']), ease: smootherstep },
    { t: 100.8, v: pose(S['C.tracker'], 0, 1, 16) },
  ],
  money: [
    { t: 11.0, v: pose(S['A.money'], 0, 0.96, 40), ease: enter(1.6) },
    { t: 12.6, v: pose(S['A.money']) },
    { t: 20.0, v: pose(S['A.money']), ease: smootherstep },
    { t: 22.4, v: pose(S['B.money']) },
    { t: 50.2, v: pose(S['B.money']), ease: smootherstep },
    { t: 52.8, v: pose(S['D.money']) },
    { t: 80.0, v: pose(S['D.money']), ease: smootherstep },
    { t: 82.6, v: pose(S['C.money']) },
    { t: 100.2, v: pose(S['C.money']), ease: smootherstep },
    { t: 100.9, v: pose(S['C.money'], 0, 1, 16) },
  ],
  pot: [
    { t: 22.2, v: pose(S['B.pot'], 0, 0.94), ease: enter(1.4) },
    { t: 23.6, v: pose(S['B.pot']) },
    { t: 50.0, v: pose(S['B.pot']), ease: smootherstep },
    { t: 53.0, v: pose(S['D.pot']) },
    { t: 80.0, v: pose(S['D.pot']), ease: smootherstep },
    { t: 82.6, v: pose(S['C.pot']) },
    { t: 100.4, v: pose(S['C.pot']), ease: smootherstep },
    { t: 103.0, v: pose(S['E.pot']) },
  ],
};

/** State-A unease (spec §5.4): 0 → 1 over 15–19 s, gone by 21.4 s. */
export const chaosAt = (t: number): number =>
  smootherstep(progress(t, CUE.chaos.riseFrom, CUE.chaos.riseTo)) *
  (1 - smootherstep(progress(t, CUE.chaos.fallFrom, CUE.chaos.fallTo)));

const SEEDS: Record<ActorId, number> = { pact: 1, tracker: 2, money: 3, pot: 4 };

export const actorPose = (id: ActorId, t: number): Pose => {
  const base = sampleTrack(TRACKS[id], t, lerpPose);
  const c = chaosAt(t);
  if (c === 0) return base;
  const s = SEEDS[id];
  return {
    ...base,
    x: base.x + 2 * c * wobble(t, s),
    y: base.y + 1.5 * c * wobble(t, s + 7),
    rot: base.rot + 0.4 * c * wobble(t, s + 13),
  };
};

/** True when the actor is at rest on a stage rect and fully visible. */
export const isSettled = (id: ActorId, t: number): boolean => {
  const keys = TRACKS[id];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (t >= a.t && t < b.t) {
      const moving = (Object.keys(a.v) as (keyof Pose)[]).some((k) => a.v[k] !== b.v[k]);
      if (moving) return false;
    }
  }
  return actorPose(id, t).opacity >= 0.98;
};

// ── Content phases ────────────────────────────────────────────────────────

export type ContentKey =
  | 'chat-silo'
  | 'sheet-silo'
  | 'pay-silo'
  | 'pool-node'
  | 'checkin-node'
  | 'fine-node'
  | 'pot-node'
  | 'live-checkin'
  | 'deadline-engine'
  | 'phone-dashboard'
  | 'pool-tile'
  | 'checkin-tile'
  | 'fines-tile'
  | 'pot-tile'
  | 'payout-screen';

export type SurfaceKind = 'card' | 'device';

export interface Phase {
  readonly content: ContentKey;
  readonly from: number;
  readonly to: number;
  /** The size the content is authored at; it is scaled to fit the live rect. */
  readonly native: { readonly w: number; readonly h: number };
  readonly surface: SurfaceKind;
}

const size = (p: Placement) => ({ w: p.w, h: p.h });
const ph = (content: ContentKey, from: number, to: number, native: Placement, surface: SurfaceKind = 'card'): Phase => ({
  content,
  from,
  to,
  native: size(native),
  surface,
});

export const PHASES: Record<ActorId, readonly Phase[]> = {
  pact: [
    ph('chat-silo', -Infinity, 21.0, S['A.pact']),
    ph('pool-node', 21.0, 50.8, S['B.pact']),
    ph('pool-tile', 81.6, Infinity, S['C.pact']),
  ],
  tracker: [
    ph('sheet-silo', -Infinity, 21.0, S['A.tracker']),
    ph('checkin-node', 21.0, 51.6, S['B.tracker']),
    ph('live-checkin', 51.6, 81.2, S['D.tracker']),
    ph('checkin-tile', 81.2, Infinity, S['C.tracker']),
  ],
  money: [
    ph('pay-silo', -Infinity, 21.0, S['A.money']),
    ph('fine-node', 21.0, 51.6, S['B.money']),
    ph('deadline-engine', 51.6, 81.2, S['D.money']),
    ph('fines-tile', 81.2, Infinity, S['C.money']),
  ],
  pot: [
    ph('pot-node', -Infinity, 51.4, S['B.pot']),
    ph('phone-dashboard', 51.4, 81.2, S['D.pot'], 'device'),
    ph('pot-tile', 81.2, 101.2, S['C.pot']),
    ph('payout-screen', 101.2, Infinity, S['E.pot'], 'device'),
  ],
};

export interface WeightedPhase {
  readonly phase: Phase;
  readonly weight: number;
}

/** Content cross-fade weights at t (spec §4.3). */
export const phaseWeights = (id: ActorId, t: number): WeightedPhase[] =>
  PHASES[id]
    .map((phase) => {
      const wIn = Number.isFinite(phase.from) ? crossfade(t, phase.from).in : 1;
      const wOut = Number.isFinite(phase.to) ? crossfade(t, phase.to).out : 1;
      return { phase, weight: wIn * wOut };
    })
    .filter((x) => x.weight > 0.001);

/** Beat-2 active-node emphasis, 0..1. */
export const highlightAt = (id: ActorId, t: number): number => {
  const [a, b] = CUE.highlight[id];
  return fade(t, a, b, 0.5, 0.5);
};
