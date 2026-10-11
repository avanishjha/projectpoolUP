/**
 * State B · money — node 03 "Miss = fine": Rahul misses day 3, the fine is
 * issued, UPI Autopay debits it, the pot gets it. A three-step timeline.
 */
import type { ReactNode } from 'react';
import { mixColor } from '../../motion/color';
import { formatINR, rupees } from '../../data/format';
import { member, POOL } from '../../data/pool';
import { color, soft, type Tone } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { highlightAt } from '../../timeline/actors';
import { Avatar } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { fadeIn, riseIn, seq, swap } from '../shared/anim';
import { NodeFooter, NodeHeader } from '../shared/NodeHeader';
import type { MockProps } from '../shared/types';

const fine = formatINR(rupees(POOL.fine));

interface Step {
  readonly title: string;
  readonly sub: string;
  readonly at: number;
  readonly tone: Tone;
}

const STEPS: readonly Step[] = [
  { title: 'Fine issued', sub: 'Grace days are off in this pool', at: CUE.fine.fineAt, tone: 'danger' },
  { title: 'UPI Autopay', sub: "Debited from Rahul's mandate", at: CUE.fine.processingAt, tone: 'accent' },
  { title: 'Added to pot', sub: 'Pot recomputed from the ledger', at: CUE.fine.addedAt, tone: 'primary' },
];

const STEP_Y = [222, 290, 358] as const;

export const FineNode = ({ t, w }: MockProps): ReactNode => {
  const active = highlightAt('money', t);
  const rahul = member('rahul');
  const card = riseIn(t, CUE.fine.cardIn, 12);
  const shamed = swap(t, CUE.fine.fineAt);
  const debited = seq(t, CUE.fine.debitedAt);
  return (
    <g>
      <NodeHeader w={w} index="03" title="Miss = fine" icon="alert" active={active} />

      <g opacity={card.o} transform={`translate(0 ${card.dy})`}>
        <Well x={24} y={88} w={w - 48} h={92} r={16} />
        <Avatar cx={62} cy={134} r={20} initials={rahul.initials} ring={shamed > 0.5 ? 'shame' : 'pending'} />
        <Label x={96} y={129} face="Inter-600" size={17} maxW={150}>
          Rahul
        </Label>
        <Label x={96} y={150} face="Inter-400" size={13} color={color.muted} maxW={170}>
          No check-in · Day 3
        </Label>
        <Label x={w - 40} y={129} face="Inter-500" size={13} anchor="end" tnum color={color.muted} maxW={60}>
          23:30
        </Label>
      </g>

      {/* rail between step dots */}
      <line x1={44} y1={STEP_Y[0]} x2={44} y2={STEP_Y[2]} stroke={soft.ink} strokeWidth={2} />
      <line
        x1={44}
        y1={STEP_Y[0]}
        x2={44}
        y2={STEP_Y[0] + (STEP_Y[2] - STEP_Y[0]) * fadeIn(t, CUE.fine.fineAt, CUE.fine.addedAt - CUE.fine.fineAt)}
        stroke={color.primary}
        strokeWidth={2}
        opacity={0.6}
      />

      {STEPS.map((s, i) => {
        const y = STEP_Y[i]!;
        const on = fadeIn(t, s.at, 0.3);
        const tone = s.tone === 'danger' ? color.danger : s.tone === 'accent' ? color.accent : color.primary;
        return (
          <g key={s.title}>
            <circle cx={44} cy={y} r={7} fill={mixColor(color.card, tone, on)} stroke={mixColor(color.faint, tone, on)} strokeWidth={2} />
            <g opacity={0.35 + 0.65 * on}>
              <Label x={68} y={y + 5} face="Inter-600" size={16} maxW={150}>
                {s.title}
              </Label>
              <Label x={68} y={y + 26} face="Inter-400" size={13} color={color.muted} maxW={w - 68 - 24}>
                {s.sub}
              </Label>
            </g>
            {i === 0 && (
              <Label x={w - 24} y={y + 6} role="money" size={20} anchor="end" color={color.danger} opacity={on} maxW={80}>
                {fine}
              </Label>
            )}
            {i === 1 && (
              <>
                <Chip x={w - 24} y={y - 13} h={26} size={12} text="Processing" icon="clock" tone="neutral" anchor="end" opacity={on * debited.out} />
                <Chip x={w - 24} y={y - 13} h={26} size={12} text="Debited" icon="check" tone="accent" anchor="end" opacity={debited.in} />
              </>
            )}
            {i === 2 && (
              <Label x={w - 24} y={y + 6} role="money" size={20} anchor="end" color={color.accent} opacity={on} maxW={80}>
                {`+${fine}`}
              </Label>
            )}
          </g>
        );
      })}

      <Chip x={24} y={414} h={30} size={13} text="UPI Autopay mandate · active" icon="lock" tone="neutral" ink={color.ink} opacity={fadeIn(t, CUE.fine.cardIn + 0.3)} />

      <NodeFooter w={w} icon="check" text="Nobody chases anybody." />
    </g>
  );
};
