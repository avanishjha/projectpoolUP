/**
 * HUD captions (spec §6.3): eyebrow fades up, headline words rise in on a
 * spring, sub-line follows; the whole block lifts out in 0.35 s at `out`.
 */
import type { ReactNode } from 'react';
import { smootherstep } from '../motion/easing';
import { progress } from '../motion/track';
import { captionsAt, layoutCaption, type Caption } from '../timeline/captions';
import { color, toneColor } from '../theme/tokens';
import { Label } from '../ui/Label';
import { WordLine } from '../ui/WordLine';
import { riseIn } from '../mocks/shared/anim';

const WORD_GAP = 0.045;

const CaptionBlock = ({ c, t }: { c: Caption; t: number }): ReactNode => {
  const exit = smootherstep(progress(t, c.out, c.out + 0.35));
  const lines = layoutCaption(c);
  const headlineWords = c.headline.join(' ').split(' ').length;
  const subAt = c.in + 0.12 + headlineWords * WORD_GAP + 0.15;
  const eyebrow = riseIn(t, c.in, 8);
  const sub = riseIn(t, subAt, 10);
  let wordIndex = 0;
  return (
    <g opacity={1 - exit} transform={`translate(0 ${-12 * exit})`}>
      {lines.map((l, i) => {
        if (l.kind === 'eyebrow')
          return (
            <Label key={i} x={l.x} y={l.baseline + eyebrow.dy} face={l.face} size={l.size} tracking={l.tracking} color={c.tone === 'neutral' ? color.muted : toneColor[c.tone]} opacity={eyebrow.o} maxW={l.maxW}>
              {l.text}
            </Label>
          );
        if (l.kind === 'sub')
          return (
            <Label key={i} x={l.x} y={l.baseline + sub.dy} face={l.face} size={l.size} tracking={l.tracking} color={color.muted} opacity={sub.o} maxW={l.maxW}>
              {l.text}
            </Label>
          );
        const at = c.in + 0.12 + wordIndex * WORD_GAP;
        wordIndex += l.text.split(' ').length;
        return <WordLine key={i} t={t} at={at} stagger={WORD_GAP} text={l.text} x={l.x} y={l.baseline} face={l.face} size={l.size} tracking={l.tracking} maxW={l.maxW} />;
      })}
    </g>
  );
};

export const Captions = ({ t }: { t: number }): ReactNode => (
  <g>
    {captionsAt(t).map((c) => (
      <CaptionBlock key={c.id} c={c} t={t} />
    ))}
  </g>
);
