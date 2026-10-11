/**
 * State A · money — payment requests nobody honours. Declined, pending for
 * twelve days, reminded four times, one paid: ₹500 of ₹2,500.
 */
import type { ReactNode } from 'react';
import { color, soft, type Tone } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { Avatar } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import type { IconName } from '../../ui/icons';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { countUp, fadeIn, riseIn } from '../shared/anim';
import { SiloHeader } from '../shared/SiloHeader';
import type { MockProps } from '../shared/types';

interface Request {
  readonly who: string;
  readonly initials: string;
  readonly detail: string;
  readonly status: string;
  readonly tone: Tone;
  readonly icon: IconName;
}

const REQUESTS: readonly Request[] = [
  { who: 'Kabir', initials: 'KS', detail: '₹500 · requested day 6', status: 'Declined', tone: 'danger', icon: 'x' },
  { who: 'Rahul', initials: 'RV', detail: '₹1,000 · requested day 6', status: 'Pending · 12d', tone: 'neutral', icon: 'clock' },
  { who: 'Sneha', initials: 'SK', detail: '₹500 · requested day 7', status: 'Reminded ×4', tone: 'neutral', icon: 'alert' },
  { who: 'Priya', initials: 'PS', detail: '₹500 · requested day 6', status: 'Paid', tone: 'accent', icon: 'check' },
];

const ROW = { top: 88, h: 76, gap: 12, x: 20 };

export const PaySilo = ({ t, w }: MockProps): ReactNode => {
  const collected = fadeIn(t, CUE.pay.collectedAt, 0.4);
  const bar = countUp(t, CUE.pay.collectedAt + 0.2, 0.9);
  return (
    <g>
      <SiloHeader w={w} icon="rupee" title="Payment requests" sub="Sent by you · Gym pact" />
      {REQUESTS.map((r, i) => {
        const top = ROW.top + i * (ROW.h + ROW.gap);
        const { o, dy } = riseIn(t, CUE.pay.rowStart + i * CUE.pay.rowGap, 14);
        return (
          <g key={r.who} opacity={o} transform={`translate(0 ${dy})`}>
            <Well x={ROW.x} y={top} w={w - ROW.x * 2} h={ROW.h} r={14} />
            <Avatar cx={ROW.x + 34} cy={top + ROW.h / 2} r={18} initials={r.initials} />
            <Label x={ROW.x + 64} y={top + 33} face="Inter-600" size={16} maxW={200}>
              {r.who}
            </Label>
            <Label x={ROW.x + 64} y={top + 54} face="Inter-400" size={13} color={color.muted} maxW={200}>
              {r.detail}
            </Label>
            <Chip x={w - ROW.x - 16} y={top + 24} h={28} size={13} text={r.status} icon={r.icon} tone={r.tone} anchor="end" />
          </g>
        );
      })}
      <g opacity={collected}>
        <line x1={0} y1={448} x2={w} y2={448} stroke={soft.ink} strokeWidth={1} />
        <Label x={24} y={478} role="eyebrow" size={11} color={color.muted} maxW={200}>
          COLLECTED
        </Label>
        <Label x={24} y={514} role="money" size={28} maxW={w - 48 - 60} suffix={{ text: ' of ₹2,500', color: color.faint }}>
          ₹500
        </Label>
        <Label x={w - 24} y={514} face="Inter-600" size={14} anchor="end" color={color.muted} maxW={56}>
          20%
        </Label>
        <rect x={24} y={530} width={w - 48} height={6} rx={3} fill={soft.ink} />
        <rect x={24} y={530} width={(w - 48) * 0.2 * bar} height={6} rx={3} fill={color.danger} opacity={0.8} />
      </g>
    </g>
  );
};
