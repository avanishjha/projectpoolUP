/**
 * ─── TIMELINE ORCHESTRATOR ──────────────────────────────────────────────
 *
 * Film(t) is the whole explainer as a pure function of time. It ties the
 * spec's state machine to the screen:
 *
 *   spec §4.1–4.2  beats & global states  → timeline/beats.ts
 *   spec §4.3–4.4  actor phases & stage    → timeline/actors.ts, stage.ts
 *   spec §4.5      camera                  → timeline/camera.ts
 *   spec §4.6      cue sheet               → timeline/cues.ts
 *   spec §4.7      copy deck               → timeline/captions.ts
 *   spec §4.8      story clock             → timeline/clock.ts
 *
 * Planes, back to front (spec §6.2): background (camera depth 1.0) → world
 * (links, chart, the four actors; depth 0.03) → HUD (captions, footnote,
 * outro; never moves). There is no state anywhere: render frame 2,400
 * before frame 12 and both come out right. That determinism is what lets
 * Remotion render frames in parallel, and lets the tests render any
 * instant on the server.
 */
import type { ReactNode } from 'react';
import { FRAME } from '../layout/frame';
import { ACTORS } from '../timeline/actors';
import { cameraAt, DEPTH, planeTransform } from '../timeline/camera';
import { Defs } from '../ui/Defs';
import { ActorView } from '../scenes/ActorView';
import { Background, Canvas } from '../scenes/Background';
import { Captions } from '../scenes/Captions';
import { Footnote } from '../scenes/Footnote';
import { LedgerChart } from '../scenes/LedgerChart';
import { Links } from '../scenes/Links';
import { Outro } from '../scenes/Outro';

export interface FilmProps {
  /** Film time in seconds, 0 ≤ t < 120. */
  readonly t: number;
}

export const Film = ({ t }: FilmProps): ReactNode => {
  const cam = cameraAt(t);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      <Defs />
      <Canvas />
      <g transform={planeTransform(cam, DEPTH.bg)}>
        <Background t={t} />
      </g>
      <g transform={planeTransform(cam, DEPTH.world)}>
        <Links t={t} />
        <LedgerChart t={t} />
        {ACTORS.map((id) => (
          <ActorView key={id} id={id} t={t} />
        ))}
      </g>
      <Captions t={t} />
      <Footnote t={t} />
      <Outro t={t} />
    </svg>
  );
};
