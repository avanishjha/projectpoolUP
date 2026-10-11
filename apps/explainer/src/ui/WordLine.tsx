/**
 * One line of text whose words rise in on a spring, staggered. All words
 * live in a single <text>; each <tspan> carries the *difference* between its
 * offset and the previous word's (`dy` is cumulative in SVG), so the line
 * flows naturally with no measurement.
 */
import type { ReactNode } from 'react';
import { spring, SPRINGS } from '../motion/spring';
import { color as palette } from '../theme/tokens';
import { resolveType, textAttrs, type LabelProps } from './Label';
import { useContentScale } from './ScaleContext';

export interface WordLineProps extends Omit<LabelProps, 'children'> {
  readonly text: string;
  readonly t: number;
  /** Time the first word starts. */
  readonly at: number;
  /** Seconds between words. */
  readonly stagger?: number;
  /** Rise distance as a fraction of the font size. */
  readonly rise?: number;
}

export const wordsOf = (text: string): string[] => {
  const parts = text.split(' ');
  return parts.map((w, i) => (i < parts.length - 1 ? `${w} ` : w));
};

export const WordLine = ({
  text,
  t,
  at,
  stagger = 0.045,
  rise = 0.35,
  x,
  y,
  maxW,
  color = palette.ink,
  opacity,
  anchor = 'start',
  ...type
}: WordLineProps): ReactNode => {
  const scale = useContentScale();
  const r = resolveType(type);
  const words = wordsOf(text);
  let prev = 0;
  return (
    <text x={x} y={y} fill={color} opacity={opacity} textAnchor={anchor} {...textAttrs(r, maxW, scale)}>
      {words.map((w, i) => {
        const s = spring(t, at + i * stagger, SPRINGS.word);
        const offset = (1 - s) * rise * r.size;
        const dy = offset - prev;
        prev = offset;
        return (
          <tspan key={i} dy={dy} fillOpacity={Math.max(0, Math.min(1, s))}>
            {w}
          </tspan>
        );
      })}
    </text>
  );
};
