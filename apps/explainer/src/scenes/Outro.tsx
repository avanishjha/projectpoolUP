/**
 * Brand outro (spec §4.7, C′): mark, wordmark, tagline, sub, CTA with one
 * sheen pass. Lives in the HUD plane, laid out inside STAGE['E.brand'].
 */
import type { ReactNode } from 'react';
import { smootherstep } from '../motion/easing';
import { progress } from '../motion/track';
import { roundedRectPath } from '../layout/geometry';
import { baselineIn, measureText } from '../theme/measure';
import { color } from '../theme/tokens';
import { OUTRO } from '../timeline/captions';
import { CUE } from '../timeline/cues';
import { STAGE } from '../timeline/stage';
import { BrandMark } from '../ui/BrandMark';
import { Icon } from '../ui/Icon';
import { Label } from '../ui/Label';
import { WordLine } from '../ui/WordLine';
import { popIn, riseIn, scaleAt } from '../mocks/shared/anim';

const B = STAGE['E.brand'];
const ROWS = {
  brand: { top: B.y, h: 96 },
  tagline: { top: B.y + 136, h: 88 },
  sub: { top: B.y + 244, h: 44 },
  cta: { top: B.y + 332, h: 72 },
} as const;

const CTA_FONT = { face: 'Inter-600', size: 26 } as const;
const CTA_PAD = 36;
const CTA_ICON = 26;
export const CTA_W = CTA_PAD * 2 + measureText(OUTRO.cta, CTA_FONT.face, CTA_FONT.size) + 14 + CTA_ICON;

export const Outro = ({ t }: { t: number }): ReactNode => {
  const O = CUE.outro;
  if (t < O.mark) return null;
  const mark = popIn(t, O.mark);
  const sub = riseIn(t, O.sub, 10);
  const cta = popIn(t, O.cta);
  const sheen = smootherstep(progress(t, O.sheen, O.sheen + 0.9));
  const markSize = 88;
  const wordX = B.x + markSize + 28;
  const ctaY = ROWS.cta.top;
  return (
    <g>
      <g transform={scaleAt(B.x + markSize / 2, ROWS.brand.top + markSize / 2 + 4, mark)} opacity={Math.min(1, mark)}>
        <BrandMark x={B.x} y={ROWS.brand.top + 4} size={markSize} />
      </g>
      <WordLine
        t={t}
        at={O.wordmark}
        text={OUTRO.wordmark}
        x={wordX}
        y={baselineIn(ROWS.brand.top, 'SpaceGrotesk-700', 96, ROWS.brand.h)}
        role="wordmark"
        maxW={B.w - (wordX - B.x)}
      />
      <WordLine
        t={t}
        at={O.tagline}
        stagger={0.09}
        text={OUTRO.tagline}
        x={B.x}
        y={baselineIn(ROWS.tagline.top, 'SpaceGrotesk-600', 84, ROWS.tagline.h)}
        role="tagline"
        maxW={B.w}
      />
      <Label x={B.x} y={baselineIn(ROWS.sub.top, 'Inter-400', 32, ROWS.sub.h) + sub.dy} face="Inter-400" size={32} color={color.muted} opacity={sub.o} maxW={B.w}>
        {OUTRO.sub}
      </Label>
      <g transform={scaleAt(B.x + CTA_W / 2, ctaY + ROWS.cta.h / 2, 0.92 + 0.08 * Math.min(1, cta))} opacity={Math.min(1, cta)}>
        <clipPath id="cta-clip">
          <path d={roundedRectPath(B.x, ctaY, CTA_W, ROWS.cta.h, ROWS.cta.h / 2)} />
        </clipPath>
        <path d={roundedRectPath(B.x, ctaY, CTA_W, ROWS.cta.h, ROWS.cta.h / 2)} fill={color.primary} />
        <g clipPath="url(#cta-clip)">
          <rect
            x={B.x - 160 + (CTA_W + 320) * sheen}
            y={ctaY - 20}
            width={70}
            height={ROWS.cta.h + 40}
            fill="#fff"
            opacity={0.16 * Math.sin(Math.PI * sheen)}
            transform={`skewX(-18)`}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </g>
        <Label x={B.x + CTA_PAD} y={baselineIn(ctaY, CTA_FONT.face, CTA_FONT.size, ROWS.cta.h)} face={CTA_FONT.face} size={CTA_FONT.size} maxW={CTA_W - CTA_PAD * 2 - 14 - CTA_ICON + 1}>
          {OUTRO.cta}
        </Label>
        <Icon name="arrowRight" x={B.x + CTA_W - CTA_PAD - CTA_ICON} y={ctaY + (ROWS.cta.h - CTA_ICON) / 2} size={CTA_ICON} color={color.ink} strokeWidth={2.2} />
      </g>
    </g>
  );
};
