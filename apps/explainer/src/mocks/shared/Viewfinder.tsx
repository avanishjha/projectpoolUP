/**
 * Camera viewfinder: an abstract gym scene (rack, barbell, floor), corner
 * brackets, optional liveness hand, shutter flash and a frozen-frame state.
 * Drawn from primitives — no imagery — so it stays crisp at any scale.
 */
import type { ReactNode } from 'react';
import { roundedRectPath } from '../../layout/geometry';
import { bump } from '../../motion/track';
import { color } from '../../theme/tokens';

export interface ViewfinderProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly t: number;
  readonly clipId: string;
  readonly flashAt?: number;
  /** 0..1 — the captured frame dims slightly once frozen. */
  readonly frozen?: number;
  /** 0..1 — the liveness hand (two fingers) in frame. */
  readonly hand?: number;
}

export const Viewfinder = ({ x, y, w, h, r, t, clipId, flashAt, frozen = 0, hand = 0 }: ViewfinderProps): ReactNode => {
  const floor = y + h * 0.78;
  const barY = y + h * 0.5;
  const plateH = h * 0.36;
  const ink = 'rgba(156,163,175,0.22)';
  const inkStrong = 'rgba(156,163,175,0.34)';
  const flash = flashAt === undefined ? 0 : bump(t, flashAt, flashAt + 0.45);
  const b = Math.min(w, h) * 0.09;
  const corners = [
    `M${x + 14},${y + 14 + b} V${y + 14} H${x + 14 + b}`,
    `M${x + w - 14 - b},${y + 14} H${x + w - 14} V${y + 14 + b}`,
    `M${x + w - 14},${y + h - 14 - b} V${y + h - 14} H${x + w - 14 - b}`,
    `M${x + 14 + b},${y + h - 14} H${x + 14} V${y + h - 14 - b}`,
  ];
  // Hand: palm + two raised fingers, abstract strokes.
  const hx = x + w * 0.74;
  const hy = y + h * 0.62;
  const u = h / 380;
  return (
    <g>
      <clipPath id={clipId}>
        <path d={roundedRectPath(x, y, w, h, r)} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={w} height={h} fill="#080B12" />
        {/* rack uprights */}
        <rect x={x + w * 0.16} y={y + h * 0.12} width={w * 0.025} height={floor - y - h * 0.12} fill={ink} />
        <rect x={x + w * 0.815} y={y + h * 0.12} width={w * 0.025} height={floor - y - h * 0.12} fill={ink} />
        {/* floor */}
        <rect x={x} y={floor} width={w} height={h - (floor - y)} fill="rgba(156,163,175,0.06)" />
        <line x1={x} y1={floor} x2={x + w} y2={floor} stroke={ink} strokeWidth={1.5} />
        {/* barbell */}
        <rect x={x + w * 0.08} y={barY - 3} width={w * 0.84} height={6} rx={3} fill={inkStrong} />
        <rect x={x + w * 0.2} y={barY - plateH / 2} width={w * 0.05} height={plateH} rx={6} fill={inkStrong} />
        <rect x={x + w * 0.255} y={barY - plateH * 0.38} width={w * 0.035} height={plateH * 0.76} rx={5} fill={ink} />
        <rect x={x + w * 0.75} y={barY - plateH / 2} width={w * 0.05} height={plateH} rx={6} fill={inkStrong} />
        <rect x={x + w * 0.71} y={barY - plateH * 0.38} width={w * 0.035} height={plateH * 0.76} rx={5} fill={ink} />
        {hand > 0.001 && (
          <g opacity={hand} fill="none" stroke="rgba(249,250,251,0.55)" strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round">
            <path d={`M${hx - 22 * u},${hy + 60 * u} v-46 q0,-16 16,-16 h28 q16,0 16,16 v46`} />
            <path d={`M${hx - 10 * u},${hy - 2 * u} v-58 q0,-9 9,-9 q9,0 9,9 v54`} />
            <path d={`M${hx + 8 * u},${hy - 6 * u} v-62 q0,-9 9,-9 q9,0 9,9 v66`} />
            <path d={`M${hx - 22 * u},${hy + 12 * u} q-14,-4 -12,-16 q4,-10 14,-4`} />
          </g>
        )}
        <rect x={x} y={y} width={w} height={h} fill="#000" opacity={0.28 * frozen} />
        {corners.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(249,250,251,0.7)" strokeWidth={2.5} strokeLinecap="round" />
        ))}
        <rect x={x} y={y} width={w} height={h} fill={color.ink} opacity={0.85 * flash} />
      </g>
    </g>
  );
};
