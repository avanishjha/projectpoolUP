/**
 * State C′ · pot — the final phone: pool complete, your payout, settled to
 * UPI. ₹647.50 is SETTLEMENT's proportional share for a 30/30 finisher.
 */
import type { ReactNode } from 'react';
import { formatINR } from '../../data/format';
import { POOL } from '../../data/pool';
import { payoutOf, SETTLEMENT } from '../../data/settlement';
import { color, soft } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { Surface } from '../../ui/Surface';
import { countUp, fadeIn, popIn, scaleAt, seq } from '../shared/anim';
import { PhoneChrome } from '../shared/PhoneChrome';
import type { MockProps } from '../shared/types';

const W = 390;
const YOU = payoutOf('you');
const S = SETTLEMENT;

const BREAKDOWN = [
  ['Gross pot', formatINR(S.gross)],
  ['Platform fee (5%)', formatINR(-S.fee)],
  ['Net pot', formatINR(S.net)],
  ['Your share', `${YOU.checkIns} of ${S.checkIns} check-ins`],
] as const;

export const PayoutScreen = ({ t, w, h }: MockProps): ReactNode => {
  const C = CUE.payout;
  const mark = popIn(t, CUE.outro.mark + 0.6);
  const amount = Math.round(YOU.paidOut * countUp(t, C.countFrom, C.countTo - C.countFrom));
  const delta = fadeIn(t, C.deltaAt, 0.4);
  const settled = seq(t, C.settledAt);
  return (
    <PhoneChrome w={w} h={h} clipId="phone-pay" time="07:02">
      <Icon name="chevronLeft" x={10} y={60} size={24} color={color.ink} />
      <Label x={42} y={75} face="Inter-600" size={17} tracking={-0.01} maxW={260}>
        {POOL.name}
      </Label>
      <Label x={42} y={93} face="Inter-400" size={12} color={color.muted} maxW={260}>
        {`Completed · ${POOL.days} of ${POOL.days} days`}
      </Label>

      <g transform={scaleAt(W / 2, 170, mark)} opacity={Math.min(1, mark)}>
        <circle cx={W / 2} cy={170} r={36} fill={soft.accent} />
        <Icon name="check" x={W / 2 - 20} y={150} size={40} color={color.accent} strokeWidth={2.4} />
      </g>
      <Label x={W / 2} y={242} face="Inter-600" size={22} anchor="middle" tracking={-0.012} maxW={W - 48}>
        Pool complete
      </Label>
      <Label x={W / 2} y={266} face="Inter-400" size={14} anchor="middle" color={color.muted} maxW={W - 48}>
        {`You showed up ${YOU.checkIns} of ${POOL.days} days.`}
      </Label>

      <Surface x={16} y={296} w={W - 32} h={196} r={22} fill={color.hero} shadow="hero" />
      <Label x={34} y={330} role="eyebrow" size={11} color={color.muted} maxW={200}>
        YOUR PAYOUT
      </Label>
      {/* Revealed as the count starts — a resting "₹0.00" would read as "you won nothing". */}
      <Label x={34} y={390} role="money" size={48} maxW={W - 68} opacity={fadeIn(t, C.countFrom - 0.25, 0.3)}>
        {formatINR(amount, { paise: 'always' })}
      </Label>
      <g opacity={delta}>
        <Icon name="arrowUp" x={32} y={408} size={16} color={color.accent} strokeWidth={2.2} />
        <Label x={54} y={421} face="Inter-600" size={14} tnum color={color.accent} maxW={W - 88}>
          {`${formatINR(YOU.net, { signed: true })} on your ${formatINR(YOU.putIn)} buy-in`}
        </Label>
      </g>
      <line x1={34} y1={442} x2={W - 34} y2={442} stroke={soft.ink} strokeWidth={1} />
      <Label x={34} y={472} face="Inter-500" size={14} maxW={200}>
        Sent to your UPI ID
      </Label>
      <Chip x={W - 34} y={455} h={26} size={12} text="Processing" icon="clock" tone="neutral" anchor="end" opacity={fadeIn(t, C.countTo - 0.4) * settled.out} />
      <Chip x={W - 34} y={455} h={26} size={12} text="Settled" icon="check" tone="accent" anchor="end" opacity={settled.in} />

      <Surface x={16} y={508} w={W - 32} h={172} r={20} />
      {BREAKDOWN.map(([k, v], i) => (
        <g key={k}>
          <Label x={34} y={544 + i * 38} face="Inter-400" size={14} color={color.muted} maxW={170}>
            {k}
          </Label>
          <Label x={W - 34} y={544 + i * 38} face="Inter-500" size={14} anchor="end" tnum color={i === 2 ? color.ink : color.ink} maxW={170}>
            {v}
          </Label>
        </g>
      ))}

      <path d={`M${16 + 26},704 H${W - 16 - 26} A26,26 0 0 1 ${W - 16 - 26},756 H${16 + 26} A26,26 0 0 1 ${16 + 26},704 Z`} fill={color.primary} />
      <Label x={W / 2} y={735} face="Inter-600" size={16} anchor="middle" maxW={W - 80}>
        Start the next pool
      </Label>
    </PhoneChrome>
  );
};
