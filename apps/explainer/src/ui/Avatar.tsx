/**
 * Initials avatar with a state ring. Ring states differ in dash pattern as
 * well as colour (spec §6.4 rule 7): done = solid accent, pending = dashed
 * muted, shame = solid danger with a gap, primary = solid primary.
 */
import type { ReactNode } from 'react';
import { color } from '../theme/tokens';
import { baselineIn } from '../theme/measure';
import { Label } from './Label';

export type RingState = 'none' | 'done' | 'pending' | 'shame' | 'primary';

const RING: Record<Exclude<RingState, 'none'>, { stroke: string; dash?: string }> = {
  done: { stroke: color.accent },
  pending: { stroke: color.muted, dash: '2.5 3' },
  shame: { stroke: color.danger },
  primary: { stroke: color.primary },
};

export interface AvatarProps {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly initials: string;
  readonly ring?: RingState;
  /** 0..1 — fades the ring in/out between states. */
  readonly ringOpacity?: number;
  readonly highlight?: boolean;
  readonly opacity?: number;
}

export const Avatar = ({ cx, cy, r, initials, ring = 'none', ringOpacity = 1, highlight, opacity }: AvatarProps): ReactNode => {
  const size = Math.round(r * 0.74 * 10) / 10;
  const ringSpec = ring === 'none' ? null : RING[ring];
  const sw = Math.max(1.5, r * 0.11);
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={highlight ? color.primary : color.avatar} />
      <Label
        x={cx}
        y={baselineIn(cy - size * 0.6, 'Inter-600', size, size * 1.2)}
        face="Inter-600"
        size={size}
        tracking={0.01}
        anchor="middle"
        maxW={r * 1.7}
        color={color.ink}
        decorative
      >
        {initials}
      </Label>
      {ringSpec && (
        <circle
          cx={cx}
          cy={cy}
          r={r + sw + 1.5}
          fill="none"
          stroke={ringSpec.stroke}
          strokeWidth={sw}
          strokeDasharray={ringSpec.dash}
          opacity={ringOpacity}
        />
      )}
    </g>
  );
};
