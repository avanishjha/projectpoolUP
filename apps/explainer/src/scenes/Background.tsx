/**
 * Background plane (camera depth 1.0): canvas, 32px dot grid, one primary
 * wash at 0.10, a soft vignette. The grid scaling with the camera is what
 * sells the push-ins (spec §3.4).
 */
import type { ReactNode } from 'react';
import { easeInOutSine } from '../motion/easing';
import { progress, sampleTrack, type Key } from '../motion/track';
import { FRAME } from '../layout/frame';
import { color } from '../theme/tokens';
import { CUE } from '../timeline/cues';

interface Wash {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

const WASH: readonly Key<Wash>[] = [
  { t: 0, v: { x: 420, y: 240, r: 900 }, ease: easeInOutSine },
  { t: 20, v: { x: 560, y: 300, r: 980 } },
  { t: 24, v: { x: 960, y: 420, r: 1100 }, ease: easeInOutSine },
  { t: 50, v: { x: 1100, y: 420, r: 1100 } },
  { t: 53, v: { x: 1500, y: 520, r: 900 }, ease: easeInOutSine },
  { t: 80, v: { x: 1480, y: 520, r: 900 } },
  { t: 83, v: { x: 960, y: 380, r: 1150 }, ease: easeInOutSine },
  { t: 100, v: { x: 960, y: 380, r: 1150 } },
  { t: 103, v: { x: 1450, y: 520, r: 950 } },
];

const lerpWash = (a: Wash, b: Wash, u: number): Wash => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
  r: a.r + (b.r - a.r) * u,
});

/** Full-frame canvas fill — drawn outside the camera so edges never show. */
export const Canvas = (): ReactNode => <rect x={0} y={0} width={FRAME.w} height={FRAME.h} fill={color.canvas} />;

export const Background = ({ t }: { t: number }): ReactNode => {
  const fadeUp = progress(t, CUE.bg.in, CUE.bg.full);
  const wash = sampleTrack(WASH, t, lerpWash);
  const m = 400; // bleed beyond the frame so pans never reveal an edge
  return (
    <g opacity={fadeUp}>
      <defs>
        <pattern id="dot-grid" width={32} height={32} patternUnits="userSpaceOnUse">
          <circle cx={16} cy={16} r={1.15} fill={color.ink} opacity={0.055} />
        </pattern>
        <radialGradient id="wash" cx={wash.x} cy={wash.y} r={wash.r} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color.primary} stopOpacity={0.1} />
          <stop offset="1" stopColor={color.primary} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vignette" cx={FRAME.w / 2} cy={FRAME.h / 2} r={1250} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.35} />
        </radialGradient>
      </defs>
      <rect x={-m} y={-m} width={FRAME.w + 2 * m} height={FRAME.h + 2 * m} fill="url(#wash)" />
      <rect x={-m} y={-m} width={FRAME.w + 2 * m} height={FRAME.h + 2 * m} fill="url(#dot-grid)" />
      <rect x={-m} y={-m} width={FRAME.w + 2 * m} height={FRAME.h + 2 * m} fill="url(#vignette)" />
    </g>
  );
};
