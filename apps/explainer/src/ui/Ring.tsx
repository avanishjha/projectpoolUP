import type { ReactNode } from 'react';
import { soft } from '../theme/tokens';

export interface RingProps {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  /** 0..1 */
  readonly progress: number;
  readonly color: string;
  readonly width?: number;
}

/** Progress ring: track + arc, starting at 12 o'clock. */
export const Ring = ({ cx, cy, r, progress, color, width = 6 }: RingProps): ReactNode => {
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={soft.ink} strokeWidth={width} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={p > 0.002 ? 1 : 0}
      />
    </g>
  );
};
