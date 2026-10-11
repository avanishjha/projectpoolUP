/**
 * State A · pact — the group chat where every pact starts and dies.
 * Messages arrive on cue; the viewport scrolls by a sum of springs, one per
 * overflowing message, so scrolling stays continuous (spec §5.4).
 */
import type { ReactNode } from 'react';
import { roundedRectPath } from '../../layout/geometry';
import { spring, SPRINGS } from '../../motion/spring';
import { bump, fade } from '../../motion/track';
import { baselineIn, measureText } from '../../theme/measure';
import { withAlpha } from '../../motion/color';
import { color, soft } from '../../theme/tokens';
import { CUE, type ChatItem } from '../../timeline/cues';
import { Chip, chipWidth } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { riseIn, scaleAt } from '../shared/anim';
import { SiloHeader } from '../shared/SiloHeader';
import type { MockProps } from '../shared/types';

const VP = { y: 84, h: 500 };
const BUBBLE_MAX = 320;
const LINE = 22;
const PAD = { x: 12, y: 10 };
const LABEL_H = 20;

interface Laid {
  readonly item: ChatItem;
  readonly top: number;
  readonly height: number;
}

const heightOf = (item: ChatItem): number => {
  switch (item.kind) {
    case 'divider':
      return 26 + 12;
    case 'meta':
      return 16 + 8;
    case 'typing':
      return LABEL_H + 34 + 10;
    case 'msg':
      return (item.mine ? 0 : LABEL_H) + item.lines.length * LINE + PAD.y * 2 + 10;
  }
};

const LAID: readonly Laid[] = (() => {
  let top = 12;
  return CUE.chat.script.map((item) => {
    const h = heightOf(item);
    const laid = { item, top, height: h };
    top += h;
    return laid;
  });
})();

/** Scroll offset: Σ Δ_k · spring(t − t_k), Δ_k = overflow added by item k. */
const scrollOffset = (t: number): number => {
  let prev = 0;
  let offset = 0;
  for (const l of LAID) {
    const overflow = Math.max(0, l.top + l.height + 12 - VP.h);
    offset += (overflow - prev) * spring(t, l.item.at, SPRINGS.ui);
    prev = overflow;
  }
  return offset;
};

const unreadAt = (t: number): { n: number; since: number } => {
  let cur: { n: number; since: number } = { n: CUE.chat.unread[0]!.n, since: CUE.chat.unread[0]!.at };
  for (const u of CUE.chat.unread) if (t >= u.at) cur = { n: u.n, since: u.at };
  return cur;
};

const Bubble = ({ item, y, w }: { item: Extract<ChatItem, { kind: 'msg' }>; y: number; w: number }): ReactNode => {
  const textW = Math.max(...item.lines.map((l) => measureText(l, 'Inter-400', 16)));
  const bw = Math.min(BUBBLE_MAX, textW + PAD.x * 2);
  const top = item.mine ? y : y + LABEL_H;
  const x = item.mine ? w - 20 - bw : 20;
  const bh = item.lines.length * LINE + PAD.y * 2;
  return (
    <g>
      {!item.mine && (
        <Label x={24} y={y + 14} face="Inter-600" size={12} color={color.muted} maxW={BUBBLE_MAX}>
          {item.from}
        </Label>
      )}
      <path d={roundedRectPath(x, top, bw, bh, 16)} fill={item.mine ? withAlpha(color.primary, 0.22) : color.avatar} />
      {item.lines.map((line, i) => (
        <Label key={i} x={x + PAD.x} y={baselineIn(top + PAD.y + i * LINE, 'Inter-400', 16, LINE)} face="Inter-400" size={16} maxW={BUBBLE_MAX - PAD.x * 2}>
          {line}
        </Label>
      ))}
    </g>
  );
};

const Typing = ({ item, y, t }: { item: Extract<ChatItem, { kind: 'typing' }>; y: number; t: number }): ReactNode => (
  <g opacity={fade(t, item.at, item.until, 0.3, 0.3)}>
    <Label x={24} y={y + 14} face="Inter-600" size={12} color={color.muted} maxW={200}>
      {`${item.who} is typing`}
    </Label>
    <path d={roundedRectPath(20, y + LABEL_H, 66, 34, 17)} fill={color.avatar} />
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={38 + i * 15} cy={y + LABEL_H + 17 - 3 * Math.max(0, Math.sin(2 * Math.PI * 1.6 * t - i * 0.7))} r={3.5} fill={color.muted} />
    ))}
  </g>
);

export const ChatSilo = ({ t, w }: MockProps): ReactNode => {
  const offset = scrollOffset(t);
  const unread = unreadAt(t);
  const badge = { text: String(unread.n), size: 13, h: 26, tnum: true } as const;
  const badgeW = chipWidth(badge);
  const pop = 1 + 0.12 * bump(t, unread.since, unread.since + 0.35);
  return (
    <g>
      <SiloHeader w={w} icon="chat" title="Gym pact" sub="6 members" slotW={badgeW + 8}>
        <g transform={scaleAt(w - 22 - badgeW / 2, 36, pop)}>
          <Chip {...badge} x={w - 22} y={23} tone="danger" anchor="end" />
        </g>
      </SiloHeader>
      <clipPath id="chat-viewport">
        <rect x={0} y={VP.y} width={w} height={VP.h} />
      </clipPath>
      <g clipPath="url(#chat-viewport)">
        {LAID.map(({ item, top }, i) => {
          if (t < item.at) return null;
          const { o, dy } = riseIn(t, item.at, 12);
          const y = VP.y + top - offset + dy;
          if (item.kind === 'typing') return <Typing key={i} item={item} y={y} t={t} />;
          return (
            <g key={i} opacity={o}>
              {item.kind === 'divider' && <Divider text={item.text} y={y} w={w} />}
              {item.kind === 'meta' && (
                <Label x={w - 24} y={y + 12} face="Inter-400" size={12} color={color.muted} anchor="end" maxW={200}>
                  {item.text}
                </Label>
              )}
              {item.kind === 'msg' && <Bubble item={item} y={y} w={w} />}
            </g>
          );
        })}
      </g>
      <line x1={0} y1={VP.y + VP.h} x2={w} y2={VP.y + VP.h} stroke={soft.ink} strokeWidth={1} />
      <Well x={20} y={596} w={w - 40 - 48} h={36} r={18} />
      <Label x={38} y={baselineIn(596, 'Inter-400', 14, 36)} face="Inter-400" size={14} color={color.muted} maxW={200}>
        Message
      </Label>
      <circle cx={w - 38} cy={614} r={18} fill={soft.ink} />
      <Icon name="send" x={w - 47} y={605} size={18} color={color.muted} />
    </g>
  );
};

const Divider = ({ text, y, w }: { text: string; y: number; w: number }): ReactNode => {
  const spec = { text, size: 11, h: 24, face: 'Inter-600' } as const;
  const cw = chipWidth(spec);
  return <Chip {...spec} x={(w - cw) / 2} y={y + 1} tone="neutral" ink={color.muted} />;
};
