/**
 * Connectors between actors (spec §3.4). In State A they are dashed danger
 * lines that snap apart with an × in the gap; through the A → B morph the
 * gap closes, the dash fills, and the colour turns primary. In State B they
 * are rails carrying pulses. Endpoints follow the actors' live (rotated)
 * edges, so the links morph with them.
 */
import type { ReactNode } from 'react';
import { mixColor } from '../motion/color';
import { smootherstep } from '../motion/easing';
import { spring, SPRINGS } from '../motion/spring';
import { fade, progress } from '../motion/track';
import { center } from '../layout/geometry';
import { actorPose, type ActorId } from '../timeline/actors';
import { CUE } from '../timeline/cues';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Label } from '../ui/Label';

const PAIRS: readonly (readonly [ActorId, ActorId])[] = [
  ['pact', 'tracker'],
  ['tracker', 'money'],
  ['money', 'pot'],
];

/** Mid-point of an actor's left or right edge, rotation applied. */
const edgePoint = (id: ActorId, t: number, side: 'left' | 'right'): { x: number; y: number } => {
  const p = actorPose(id, t);
  const { cx, cy } = center(p);
  const dx = (side === 'right' ? 1 : -1) * (p.w / 2) * p.scale;
  const rad = (p.rot * Math.PI) / 180;
  return { x: cx + dx * Math.cos(rad), y: cy + dx * Math.sin(rad) };
};

const L = CUE.links;

export const Links = ({ t }: { t: number }): ReactNode => {
  if (t < L.drawFrom || t > L.outTo) return null;
  const solid = smootherstep(progress(t, L.solidFrom, L.solidTo));
  const broken = spring(t, L.breakAt, SPRINGS.snap) * (1 - solid);
  const out = 1 - smootherstep(progress(t, L.outFrom, L.outTo));
  const stroke = mixColor(color.danger, color.primary, solid);
  return (
    <g opacity={out}>
      {PAIRS.map(([a, b], k) => {
        // Rail 3 only exists once the pot does.
        const drawStart = k === 2 ? 22.6 : L.drawFrom;
        const draw = smootherstep(progress(t, drawStart, drawStart + 0.8));
        if (draw <= 0) return null;
        const p0 = edgePoint(a, t, 'right');
        const p1 = edgePoint(b, t, 'left');
        const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2;
        const ux = (p1.x - p0.x) / len;
        const uy = (p1.y - p0.y) / len;
        const gap = k === 2 ? 0 : 18 * broken;
        const dash = 6 * (1 - solid);
        const opacityA = k === 2 ? 1 : 0.75 + 0.25 * solid;
        const label = CUE.pulses[k]!.label;
        const ink = k === 2 ? color.primary : stroke;
        // Draw-on moves the far endpoint; once drawn, the snap opens a gap mid-line.
        const end = { x: p0.x + (p1.x - p0.x) * draw, y: p0.y + (p1.y - p0.y) * draw };
        const d =
          draw < 1
            ? `M${p0.x},${p0.y} L${end.x},${end.y}`
            : `M${p0.x},${p0.y} L${mx - ux * gap},${my - uy * gap} M${mx + ux * gap},${my + uy * gap} L${p1.x},${p1.y}`;
        return (
          <g key={k}>
            <path d={d} stroke={ink} strokeWidth={2} strokeDasharray={dash > 0.05 ? `6 ${dash}` : undefined} strokeLinecap="round" fill="none" opacity={opacityA} />
            <circle cx={p0.x} cy={p0.y} r={4} fill={ink} opacity={draw} />
            <circle cx={p1.x} cy={p1.y} r={4} fill={ink} opacity={smootherstep(progress(draw, 0.8, 1))} />
            {k < 2 && broken > 0.01 && (
              <g opacity={Math.min(1, broken)}>
                <circle cx={mx} cy={my} r={11} fill={color.canvas} stroke={color.danger} strokeWidth={1.5} />
                <Icon name="x" x={mx - 7} y={my - 7} size={14} color={color.danger} strokeWidth={2.2} />
              </g>
            )}
            <Label x={mx} y={my - 16} face="Inter-600" size={13} tracking={0.06} anchor="middle" color={color.muted} opacity={fade(t, L.solidTo, Infinity, 0.5)} maxW={len - 8}>
              {label}
            </Label>
            <Pulse t={t} k={k} p0={p0} p1={p1} />
          </g>
        );
      })}
    </g>
  );
};

/** Pulses: one per beat-2 step, then an ambient relay through all three rails. */
const Pulse = ({ t, k, p0, p1 }: { t: number; k: number; p0: { x: number; y: number }; p1: { x: number; y: number } }): ReactNode => {
  const starts: number[] = [CUE.pulses[k]!.at];
  const { from, to, period } = CUE.ambientPulse;
  for (let s = from + k * (period / 3); s < to; s += period) starts.push(s);
  return (
    <>
      {starts.map((s) => {
        const u = (t - s) / 0.8;
        if (u < 0 || u > 1.15) return null;
        return [0, 0.06, 0.12].map((lag, i) => {
          const v = smootherstep(u - lag);
          if (u - lag < 0) return null;
          return (
            <circle
              key={`${s}-${i}`}
              cx={p0.x + (p1.x - p0.x) * v}
              cy={p0.y + (p1.y - p0.y) * v}
              r={5 - i * 1.2}
              fill={color.primary}
              opacity={(1 - i * 0.35) * (1 - smootherstep((u - 0.9) / 0.25))}
            />
          );
        });
      })}
    </>
  );
};
