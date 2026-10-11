/** State B · pact — node 01 "Pool up": identity, rules grid, members joining, money locking. */
import type { ReactNode } from 'react';
import { spring, SPRINGS } from '../../motion/spring';
import { formatINR, rupees } from '../../data/format';
import { MEMBERS, POOL } from '../../data/pool';
import { color } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { highlightAt } from '../../timeline/actors';
import { Avatar } from '../../ui/Avatar';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { popIn, scaleAt, seq } from '../shared/anim';
import { NodeFooter, NodeHeader } from '../shared/NodeHeader';
import type { MockProps } from '../shared/types';

const RULES = [
  { label: 'BUY-IN', value: formatINR(rupees(POOL.buyIn)) },
  { label: 'PER MISS', value: formatINR(rupees(POOL.fine)) },
  { label: 'DAYS', value: String(POOL.days) },
  { label: 'GRACE', value: POOL.graceDays === 0 ? 'Off' : String(POOL.graceDays) },
] as const;

const joinAt = (i: number) => CUE.pool.joinStart + i * CUE.pool.joinGap;

export const PoolNode = ({ t, w }: MockProps): ReactNode => {
  const active = highlightAt('pact', t);
  const joined = MEMBERS.reduce((n, _, i) => n + (t >= joinAt(i) ? 1 : 0), 0);
  // Locked money counts up continuously: Σ buy-in × spring(t − join_i).
  const locked = MEMBERS.reduce((s, _, i) => s + rupees(POOL.buyIn) * spring(t, joinAt(i), SPRINGS.ui), 0);
  const full = seq(t, joinAt(MEMBERS.length - 1) + 0.5);
  return (
    <g>
      <NodeHeader w={w} index="01" title="Pool up" icon="users" active={active} />

      <Well x={24} y={90} w={48} h={48} r={14} />
      <Icon name="dumbbell" x={35} y={101} size={26} color={color.primary} />
      <Label x={88} y={110} face="Inter-600" size={18} tracking={-0.01} maxW={w - 88 - 24}>
        {POOL.name}
      </Label>
      <Label x={88} y={130} face="Inter-400" size={13} color={color.muted} maxW={w - 88 - 24}>
        {`${POOL.days} days · photo check-in`}
      </Label>

      {RULES.map((r, i) => {
        const x = 24 + (i % 2) * 164;
        const y = 158 + Math.floor(i / 2) * 80;
        return (
          <g key={r.label}>
            <Well x={x} y={y} w={148} h={66} r={14} />
            <Label x={x + 14} y={y + 24} role="eyebrow" size={11} color={color.muted} maxW={120}>
              {r.label}
            </Label>
            <Label x={x + 14} y={y + 52} role="money" size={22} maxW={120}>
              {r.value}
            </Label>
          </g>
        );
      })}

      <Label x={24} y={336} role="eyebrow" size={11} color={color.muted} maxW={160}>
        MEMBERS
      </Label>
      <Label x={w - 24} y={336} face="Inter-600" size={13} anchor="end" tnum color={joined === MEMBERS.length ? color.accent : color.muted} maxW={60}>
        {`${joined}/${MEMBERS.length}`}
      </Label>
      {MEMBERS.map((m, i) => {
        const s = popIn(t, joinAt(i));
        if (s <= 0) return null;
        const cx = 42 + i * 39;
        return (
          <g key={m.id} transform={scaleAt(cx, 368, s)} opacity={Math.min(1, s)}>
            <Avatar cx={cx} cy={368} r={17} initials={m.initials} highlight={m.id === 'you'} />
          </g>
        );
      })}

      <Well x={24} y={404} w={w - 48} h={56} r={14} />
      <Label x={40} y={437} role="eyebrow" size={11} color={color.muted} maxW={120}>
        LOCKED IN
      </Label>
      <Label x={w - 40} y={441} role="money" size={26} anchor="end" maxW={150}>
        {formatINR(Math.round(locked / 100) * 100)}
      </Label>

      <NodeFooter w={w} icon="clock" text="Waiting for members" opacity={full.out} />
      <NodeFooter w={w} icon="check" text="Active · everyone paid in" tone={color.accent} opacity={full.in} />
    </g>
  );
};
