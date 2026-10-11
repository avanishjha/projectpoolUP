/**
 * A raised material (spec §2.2): fill + 1px border + a brighter top edge
 * that reads as light catching the top of a real object. Geometry is
 * continuous in every parameter, so a Surface can morph into anything.
 */
import type { ReactNode } from 'react';
import { roundedRectPath, topEdgePath } from '../layout/geometry';
import { color, soft } from '../theme/tokens';
import { FILTER } from './Defs';

export interface SurfaceProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly fill?: string;
  readonly border?: string;
  readonly borderTop?: string;
  readonly shadow?: 'card' | 'hero' | null;
  /** 0..1 — restrained primary glow behind the border. */
  readonly glow?: number;
  readonly glowColor?: string;
  /** Left accent bar (Wall of Shame). Needs a unique clip id. */
  readonly accentBar?: { readonly color: string; readonly clipId: string; readonly width?: number };
  readonly opacity?: number;
}

export const Surface = ({
  x,
  y,
  w,
  h,
  r,
  fill = color.card,
  border = color.border,
  borderTop = color.borderTop,
  shadow = 'card',
  glow = 0,
  glowColor = color.primary,
  accentBar,
  opacity,
}: SurfaceProps): ReactNode => {
  const d = roundedRectPath(x, y, w, h, r);
  return (
    <g opacity={opacity}>
      {glow > 0.001 && (
        <path d={d} fill="none" stroke={glowColor} strokeWidth={10} opacity={0.22 * glow} filter={FILTER.glow} />
      )}
      <path d={d} fill={fill} filter={shadow ? FILTER[shadow] : undefined} />
      {accentBar && (
        <>
          <clipPath id={accentBar.clipId}>
            <path d={d} />
          </clipPath>
          <rect x={x} y={y} width={accentBar.width ?? 4} height={h} fill={accentBar.color} clipPath={`url(#${accentBar.clipId})`} />
        </>
      )}
      <path d={roundedRectPath(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5)} fill="none" stroke={border} strokeWidth={1} />
      <path d={topEdgePath(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5)} fill="none" stroke={borderTop} strokeWidth={1} />
    </g>
  );
};

/** A recessed well (inputs, tracks, viewfinders): no shadow, no top light. */
export const Well = ({ x, y, w, h, r, fill = color.sunken, opacity }: Omit<SurfaceProps, 'shadow'>): ReactNode => (
  <g opacity={opacity}>
    <path d={roundedRectPath(x, y, w, h, r)} fill={fill} />
    <path d={roundedRectPath(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5)} fill="none" stroke={soft.ink} strokeWidth={1} />
  </g>
);
