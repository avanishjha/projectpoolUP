import type { ReactNode } from 'react';
import { ICONS, type IconDef, type IconName } from './icons';

export interface IconProps {
  readonly name: IconName;
  /** Top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly color: string;
  readonly opacity?: number;
  readonly strokeWidth?: number;
}

export const Icon = ({ name, x, y, size = 24, color, opacity, strokeWidth = 1.75 }: IconProps): ReactNode => {
  const def: IconDef = ICONS[name];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size / 24})`}
      opacity={opacity}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {def.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {def.circles?.map(([cx, cy, r], i) => <circle key={`c${i}`} cx={cx} cy={cy} r={r} />)}
      {def.dots?.map(([cx, cy, r], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={r} fill={color} stroke="none" />)}
    </g>
  );
};
