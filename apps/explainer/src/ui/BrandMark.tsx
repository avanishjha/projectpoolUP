/**
 * Provisional CONQR mark (spec §2.5): a flag planted on a rising line. The
 * repo has no logo yet (the app icon is Expo's template) — swap it here.
 */
import type { ReactNode } from 'react';
import { roundedRectPath } from '../layout/geometry';
import { color } from '../theme/tokens';

export interface BrandMarkProps {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly opacity?: number;
}

export const BrandMark = ({ x, y, size, opacity }: BrandMarkProps): ReactNode => {
  const u = size / 24;
  return (
    <g opacity={opacity}>
      <path d={roundedRectPath(x, y, size, size, size * 0.26)} fill={color.primary} />
      <g transform={`translate(${x} ${y}) scale(${u})`} fill="none" stroke={color.ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18.5l5-3.2 4 1.6 5-3.4" strokeWidth={1.6} opacity={0.55} />
        <path d="M10 15.3V5.2" strokeWidth={1.9} />
        <path d="M10 5.6h6.6l-1.7 2.5 1.7 2.5H10z" fill={color.ink} strokeWidth={1.2} />
      </g>
    </g>
  );
};
