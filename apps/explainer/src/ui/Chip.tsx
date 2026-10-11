/**
 * Pill with optional icon. Its width is computed from the real font metrics,
 * so a chip always fits its label — no magic widths.
 */
import type { ReactNode } from 'react';
import { roundedRectPath } from '../layout/geometry';
import type { FaceKey } from '../theme/font-files';
import { baselineIn, measureText } from '../theme/measure';
import { toneColor, toneSoft, type Tone } from '../theme/tokens';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Label } from './Label';

export interface ChipSpec {
  readonly text: string;
  readonly icon?: IconName;
  readonly face?: FaceKey;
  readonly size?: number;
  readonly h?: number;
  readonly tnum?: boolean;
}

const pad = (h: number) => Math.round(h * 0.42);

export const chipWidth = ({ text, icon, face = 'Inter-600', size = 13, h = 28, tnum = false }: ChipSpec): number => {
  const iconW = icon ? size + 6 : 0;
  return pad(h) * 2 + iconW + measureText(text, face, size, 0.01, tnum);
};

export interface ChipProps extends ChipSpec {
  readonly x: number;
  readonly y: number;
  readonly tone?: Tone;
  /** 'end' places the chip's right edge at x. */
  readonly anchor?: 'start' | 'end';
  readonly opacity?: number;
  /** Override text colour (defaults to the tone colour). */
  readonly ink?: string;
}

export const Chip = (props: ChipProps): ReactNode => {
  const { x, y, text, icon, tone = 'neutral', anchor = 'start', opacity, ink, face = 'Inter-600', size = 13, h = 28, tnum = false } = props;
  const w = chipWidth(props);
  const left = anchor === 'end' ? x - w : x;
  const fg = ink ?? toneColor[tone];
  const p = pad(h);
  const textX = left + p + (icon ? size + 6 : 0);
  return (
    <g opacity={opacity}>
      <path d={roundedRectPath(left, y, w, h, h / 2)} fill={toneSoft[tone]} />
      {icon && <Icon name={icon} x={left + p - 1} y={y + (h - size - 2) / 2} size={size + 2} color={fg} strokeWidth={2} />}
      <Label x={textX} y={baselineIn(y, face, size, h)} face={face} size={size} tracking={0.01} color={fg} maxW={w - (textX - left) - p + 0.5} tnum={tnum}>
        {text}
      </Label>
    </g>
  );
};
