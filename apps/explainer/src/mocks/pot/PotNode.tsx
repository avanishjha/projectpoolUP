/** State B · pot — node 04 "The pot": the ₹ ticker, its composition, and where it goes. */
import type { ReactNode } from 'react';
import { spring, SPRINGS } from '../../motion/spring';
import { formatINR, rupees } from '../../data/format';
import { MEMBERS, potAfter, POOL } from '../../data/pool';
import { color } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { highlightAt } from '../../timeline/actors';
import { Avatar } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { fadeIn } from '../shared/anim';
import { NodeFooter, NodeHeader } from '../shared/NodeHeader';
import type { MockProps } from '../shared/types';

const BUY_INS = rupees(MEMBERS.length * POOL.buyIn);
/** Pot after day 3 closes — Rahul's day-3 fine is the first (spec §7). */
const AFTER_DAY3 = rupees(potAfter(3));

export const PotNode = ({ t, w }: MockProps): ReactNode => {
  const active = highlightAt('pot', t);
  const tick = spring(t, CUE.potNode.tick, SPRINGS.ui);
  const pot = BUY_INS + (AFTER_DAY3 - BUY_INS) * tick;
  const fines = pot - BUY_INS;
  const barW = w - 48;
  const finesW = barW * (fines / pot);
  const delta = fadeIn(t, CUE.potNode.tick, 0.35);
  return (
    <g>
      <NodeHeader w={w} index="04" title="The pot" icon="rupee" active={active} />

      <Label x={24} y={108} role="eyebrow" size={11} color={color.muted} maxW={120}>
        POT
      </Label>
      <Label x={24} y={166} role="money" size={52} maxW={w - 48}>
        {formatINR(Math.round(pot / 100) * 100)}
      </Label>
      <Chip x={24} y={184} h={28} size={13} text="+₹99 · Rahul missed day 3" icon="arrowUp" tone="accent" opacity={delta} />

      <rect x={24} y={236} width={barW} height={12} rx={6} fill={color.primary} opacity={0.75} />
      <rect x={24 + barW - finesW} y={236} width={finesW} height={12} rx={finesW > 12 ? 6 : finesW / 2} fill={color.danger} />
      <circle cx={30} cy={272} r={4} fill={color.primary} />
      <Label x={40} y={277} face="Inter-500" size={13} color={color.muted} maxW={140}>
        {`Buy-ins ${formatINR(BUY_INS)}`}
      </Label>
      <circle cx={196} cy={272} r={4} fill={color.danger} opacity={0.4 + 0.6 * delta} />
      <Label x={206} y={277} face="Inter-500" size={13} color={color.muted} tnum maxW={w - 206 - 24}>
        {`Fines ${formatINR(Math.round(fines / 100) * 100)}`}
      </Label>

      <Well x={24} y={304} w={w - 48} h={148} r={16} />
      <Label x={42} y={334} role="eyebrow" size={11} color={color.primary} maxW={120}>
        DAY 30
      </Label>
      <Label x={42} y={362} face="Inter-600" size={17} maxW={w - 84}>
        Finishers split the pot
      </Label>
      <Label x={42} y={384} face="Inter-400" size={13} color={color.muted} maxW={w - 84}>
        In proportion to check-ins made
      </Label>
      {MEMBERS.map((m, i) => (
        <Avatar key={m.id} cx={54 + i * 36} cy={421} r={13} initials={m.initials} highlight={m.id === 'you'} />
      ))}

      <NodeFooter w={w} icon="ledger" text="Every fine lands here." />
    </g>
  );
};
