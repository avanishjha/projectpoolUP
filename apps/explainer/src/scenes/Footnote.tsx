/** The illustrative-data disclosure under the ledger (spec §1.1 rule 2). */
import type { ReactNode } from 'react';
import { fade } from '../motion/track';
import { baselineIn } from '../theme/measure';
import { color } from '../theme/tokens';
import { CUE } from '../timeline/cues';
import { FOOTNOTE } from '../timeline/captions';
import { TITLE_SAFE } from '../layout/frame';
import { Label } from '../ui/Label';

export const FOOTNOTE_BOX = { x: 96, y: 962, lineHeight: 30 } as const;

export const Footnote = ({ t }: { t: number }): ReactNode => {
  const o = fade(t, CUE.footnote.in, CUE.footnote.out, 0.6, 0.6);
  if (o <= 0.001) return null;
  return (
    <g opacity={o}>
      {FOOTNOTE.map((line, i) => (
        <Label
          key={i}
          x={FOOTNOTE_BOX.x}
          y={baselineIn(FOOTNOTE_BOX.y + i * FOOTNOTE_BOX.lineHeight, 'Inter-400', 22, FOOTNOTE_BOX.lineHeight)}
          role="footnote"
          color={color.muted}
          maxW={TITLE_SAFE.w}
        >
          {line}
        </Label>
      ))}
    </g>
  );
};
