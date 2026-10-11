/**
 * The copy deck (spec §4.7) and the caption block layout (spec §6.3).
 * Mirrored by spec.md; see the spec-sync test.
 */
import type { Rect } from '../layout/geometry';
import type { FaceKey } from '../theme/font-files';
import { baselineIn, measureText } from '../theme/measure';
import type { Tone } from '../theme/tokens';
import { TYPE } from '../theme/type';

export type Region = 'top' | 'left';

export interface Caption {
  readonly id: string;
  readonly in: number;
  readonly out: number;
  readonly region: Region;
  readonly eyebrow: string;
  readonly headline: readonly string[];
  readonly sub: string;
  /** Eyebrow colour. Not part of the spec table. */
  readonly tone: Tone;
}

export const CAPTIONS: readonly Caption[] = [
  { id: 'c1', in: 0.6, out: 6, region: 'top', tone: 'neutral', eyebrow: 'DAY 1', headline: ['Every fitness pact starts in a group chat.'], sub: "₹500 fine if you skip. Everyone's in." },
  { id: 'c2', in: 6.4, out: 11, region: 'top', tone: 'neutral', eyebrow: 'DAY 6', headline: ['Nobody tracks it.'], sub: 'The spreadsheet died on day four.' },
  { id: 'c3', in: 11.4, out: 15.4, region: 'top', tone: 'neutral', eyebrow: 'DAY 11', headline: ['Nobody pays up.'], sub: 'Four reminders. One payment.' },
  { id: 'c4', in: 15.8, out: 19.8, region: 'top', tone: 'danger', eyebrow: 'DAY 14', headline: ['So nobody shows up.'], sub: 'Two of six still going. For now.' },
  { id: 'c5', in: 20.4, out: 24, region: 'top', tone: 'primary', eyebrow: 'CONQR', headline: ['CONQR puts the pact on rails.'], sub: 'Same friends. Same goal. Now it enforces itself.' },
  { id: 'c6', in: 24.4, out: 30, region: 'top', tone: 'primary', eyebrow: '01 · POOL UP', headline: ['Friends, one challenge, real money in.'], sub: '8 friends. ₹499 each. 30 days of Morning Lift.' },
  { id: 'c7', in: 30.4, out: 36, region: 'top', tone: 'primary', eyebrow: '02 · CHECK IN', headline: ['One live photo a day. Camera only.'], sub: 'No gallery uploads. No recycled gym selfies.' },
  { id: 'c8', in: 36.4, out: 42, region: 'top', tone: 'primary', eyebrow: '03 · MISS = FINE', headline: ["Miss the deadline and it's settled."], sub: '₹99, auto-debited through UPI Autopay. Nobody chases anybody.' },
  { id: 'c9', in: 42.4, out: 49.6, region: 'top', tone: 'primary', eyebrow: '04 · THE POT', headline: ['Every fine lands in the pot.'], sub: 'At day 30, the people who showed up split it.' },
  { id: 'c10', in: 50.8, out: 57.8, region: 'left', tone: 'primary', eyebrow: 'DAY 24 · 23:12 IST', headline: ['Check-ins land live.'], sub: 'Camera only. Timestamped by the server, not the phone.' },
  { id: 'c11', in: 58.2, out: 65.8, region: 'left', tone: 'primary', eyebrow: '23:29 IST', headline: ['Seven of eight are in.'], sub: 'Kabir has one minute.' },
  { id: 'c12', in: 66.2, out: 73.6, region: 'left', tone: 'primary', eyebrow: '23:30 IST · DEADLINE', headline: ['The deadline engine runs.'], sub: 'Shields and grace days first. Then the fine.' },
  { id: 'c13', in: 74, out: 79.6, region: 'left', tone: 'danger', eyebrow: 'WALL OF SHAME', headline: ['He missed.', 'You just got richer.'], sub: '₹99 just landed in the pot.' },
  { id: 'c14', in: 80.6, out: 90.4, region: 'top', tone: 'primary', eyebrow: 'DAY 30 · THE LEDGER CLOSES', headline: ['Thirty days. Every rupee accounted for.'], sub: '228 check-ins. 12 misses. Zero IOUs.' },
  { id: 'c15', in: 90.8, out: 99.6, region: 'top', tone: 'accent', eyebrow: 'THE PAYOUT', headline: ['The ones who showed up got paid.'], sub: "By the ones who didn't." },
];

export const OUTRO = {
  wordmark: 'CONQR',
  tagline: 'Show up. Or pay up.',
  sub: 'Start a pool with your gym crew.',
  cta: 'Start a pool',
} as const;

export const FOOTNOTE = [
  'Illustrative pool: 8 members, ₹499 buy-in, ₹99 per miss, 30 days, grace days off.',
  'Payout per CONQR spec: net pot = gross pot − 5% platform fee, split by check-ins made.',
] as const;

export const REGIONS: Record<Region, { x: number; y: number; maxW: number }> = {
  top: { x: 96, y: 96, maxW: 1728 },
  left: { x: 96, y: 104, maxW: 1196 },
};

export const CAPTION_TYPE = {
  eyebrow: { face: 'Inter-600' as FaceKey, size: 22, lineHeight: 28, tracking: 0.12 },
  headline: { face: TYPE.headline.face, size: TYPE.headline.size, lineHeight: TYPE.headline.lineHeight, tracking: TYPE.headline.tracking },
  sub: { face: TYPE.sub.face, size: TYPE.sub.size, lineHeight: TYPE.sub.lineHeight, tracking: TYPE.sub.tracking },
} as const;

const GAP_AFTER_EYEBROW = 12;
const GAP_AFTER_HEADLINE = 14;

export interface CaptionLine {
  readonly kind: 'eyebrow' | 'headline' | 'sub';
  readonly text: string;
  readonly x: number;
  readonly top: number;
  readonly baseline: number;
  readonly face: FaceKey;
  readonly size: number;
  readonly lineHeight: number;
  readonly tracking: number;
  readonly maxW: number;
}

export const layoutCaption = (c: Caption): CaptionLine[] => {
  const { x, y, maxW } = REGIONS[c.region];
  const lines: CaptionLine[] = [];
  const push = (kind: CaptionLine['kind'], text: string, top: number) => {
    const t = CAPTION_TYPE[kind];
    lines.push({
      kind,
      text,
      x,
      top,
      baseline: baselineIn(top, t.face, t.size, t.lineHeight),
      face: t.face,
      size: t.size,
      lineHeight: t.lineHeight,
      tracking: t.tracking,
      maxW,
    });
    return top + t.lineHeight;
  };
  let top = push('eyebrow', c.eyebrow, y) + GAP_AFTER_EYEBROW;
  for (const h of c.headline) top = push('headline', h, top);
  push('sub', c.sub, top + GAP_AFTER_HEADLINE);
  return lines;
};

/** Ink bounds of a caption block: full line-box height, measured width. */
export const captionBounds = (c: Caption): Rect => {
  const lines = layoutCaption(c);
  const first = lines[0]!;
  const last = lines[lines.length - 1]!;
  const w = Math.max(...lines.map((l) => measureText(l.text, l.face, l.size, l.tracking)));
  return { x: first.x, y: first.top, w, h: last.top + last.lineHeight - first.top };
};

/** Captions visible (even partly) at t, given the 0.35s exit. */
export const captionsAt = (t: number): Caption[] => CAPTIONS.filter((c) => t >= c.in && t <= c.out + 0.35);
