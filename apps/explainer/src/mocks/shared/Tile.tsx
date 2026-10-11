/** State-C metric tile (402×220): eyebrow, big value, two sub-lines, right visual. */
import type { ReactNode } from 'react';
import { color } from '../../theme/tokens';
import { Label } from '../../ui/Label';

export interface TileProps {
  readonly w: number;
  readonly eyebrow: string;
  /** Pre-formatted value. `suffix` renders muted, straight after it. */
  readonly value: string;
  readonly suffix?: string;
  readonly lines: readonly [string, string];
  /** Width reserved for the right visual. */
  readonly visualW?: number;
  readonly lineTone?: string;
  readonly children?: ReactNode;
}

export const TILE_PAD = 28;

export const Tile = ({ w, eyebrow, value, suffix, lines, visualW = 0, lineTone = color.muted, children }: TileProps): ReactNode => {
  const textW = w - TILE_PAD * 2 - (visualW ? visualW + 16 : 0);
  return (
    <g>
      <Label x={TILE_PAD} y={46} role="eyebrow" size={13} color={color.muted} maxW={textW}>
        {eyebrow}
      </Label>
      <Label x={TILE_PAD} y={118} role="money" size={52} maxW={textW} {...(suffix ? { suffix: { text: suffix, color: color.faint } } : {})}>
        {value}
      </Label>
      <Label x={TILE_PAD} y={160} face="Inter-500" size={16} color={lineTone} maxW={w - TILE_PAD * 2}>
        {lines[0]}
      </Label>
      <Label x={TILE_PAD} y={186} face="Inter-400" size={15} color={color.muted} maxW={w - TILE_PAD * 2}>
        {lines[1]}
      </Label>
      {children}
    </g>
  );
};
