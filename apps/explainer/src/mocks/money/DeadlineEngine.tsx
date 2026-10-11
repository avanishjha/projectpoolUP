/**
 * Deep dive · money — the deadline engine settling day 24, one row at a
 * time. Mirrors F6.1's cascade: shield → grace → fine, exactly once per
 * member, pot recomputed as a SUM over the ledger. The debit row is the
 * specified F5.4 worker step (spec §9.5).
 */
import type { ReactNode } from 'react';
import { bump, fade } from '../../motion/track';
import { countdownLabel, formatINR, rupees } from '../../data/format';
import { MEMBERS, member, POOL, potAfter } from '../../data/pool';
import { color, soft, toneColor, type Tone } from '../../theme/tokens';
import { secondsToDeadline } from '../../timeline/clock';
import { CUE } from '../../timeline/cues';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';
import { fadeIn, riseIn, seq } from '../shared/anim';
import type { MockProps } from '../shared/types';

interface Row {
  readonly icon: IconName;
  readonly tone: Tone;
  readonly label: string;
  readonly value: string;
}

const DAY = POOL.focusDay;
const missed = MEMBERS.filter((m) => m.misses.includes(DAY));
const kabir = member('kabir');

const ROWS: readonly Row[] = [
  { icon: 'bolt', tone: 'primary', label: 'Deadline reached', value: '23:30:00 IST' },
  { icon: 'users', tone: 'neutral', label: 'Members checked', value: `${MEMBERS.length} · ${MEMBERS.length - missed.length} in · ${missed.length} missed` },
  { icon: 'x', tone: 'danger', label: kabir.name, value: `No check-in for day ${DAY}` },
  { icon: 'shield', tone: 'neutral', label: 'Shield', value: 'None owned' },
  { icon: 'minus', tone: 'neutral', label: 'Grace day', value: 'Off in this pool' },
  { icon: 'rupee', tone: 'danger', label: 'Fine', value: `${formatINR(rupees(POOL.fine))} written to ledger` },
  { icon: 'check', tone: 'accent', label: 'UPI Autopay', value: `${formatINR(rupees(POOL.fine))} debited` },
  { icon: 'ledger', tone: 'primary', label: 'Pot', value: `Recomputed from ledger: ${formatINR(rupees(potAfter(DAY)))}` },
];

const TOP = 108;
const ROW_H = 56;
const rowAt = (i: number) => CUE.engine.rowStart + i * CUE.engine.rowGap;

/** What the engine will do, shown while it waits — the rows it is about to write. */
const CASCADE = ['Check-in', 'Shield', 'Grace day', 'Fine'] as const;

/**
 * Before 23:30 the engine is armed, not empty: a countdown to the run (read
 * from the same story clock as the phone) and the cascade it will apply.
 */
const IdleState = ({ t, w, opacity }: { t: number; w: number; opacity: number }): ReactNode => {
  if (opacity <= 0.001) return null;
  const left = secondsToDeadline(t);
  const stepW = (w - 64 - 3 * 36) / 4;
  return (
    <g opacity={opacity}>
      <Label x={32} y={160} role="eyebrow" size={13} color={color.muted} maxW={300}>
        NEXT RUN
      </Label>
      <Label x={32} y={236} role="money" size={72} maxW={w - 64}>
        {countdownLabel(left)}
      </Label>
      <Label x={32} y={276} face="Inter-400" size={17} color={color.muted} maxW={w - 64}>
        {`${MEMBERS.length} members · settles each one exactly once at 23:30 IST`}
      </Label>
      <Label x={32} y={360} role="eyebrow" size={13} color={color.muted} maxW={300}>
        FOR EACH MEMBER
      </Label>
      {CASCADE.map((step, i) => {
        const x = 32 + i * (stepW + 36);
        const last = i === CASCADE.length - 1;
        return (
          <g key={step}>
            <Well x={x} y={384} w={stepW} h={64} r={14} />
            <Label x={x + stepW / 2} y={422} face="Inter-600" size={16} anchor="middle" color={last ? color.danger : color.ink} maxW={stepW - 16}>
              {step}
            </Label>
            {!last && <Icon name="chevronRight" x={x + stepW + 6} y={404} size={24} color={color.faint} strokeWidth={2} />}
          </g>
        );
      })}
      <Label x={32} y={496} face="Inter-400" size={15} color={color.muted} maxW={w - 64}>
        A shield or grace day covers the miss. Otherwise the fine is written to the ledger.
      </Label>
    </g>
  );
};

export const DeadlineEngine = ({ t, w }: MockProps): ReactNode => {
  const run = seq(t, CUE.engine.runAt);
  const settle = seq(t, CUE.engine.doneAt);
  const sweep = fade(t, CUE.engine.runAt, CUE.engine.doneAt, 0.2, 0.4);
  const phase = ((t - CUE.engine.runAt) / 0.9) % 1;
  return (
    <g>
      <Label x={32} y={44} face="Inter-600" size={22} tracking={-0.012} maxW={420}>
        Deadline engine
      </Label>
      <Label x={32} y={68} face="Inter-400" size={15} color={color.muted} maxW={440}>
        {`${POOL.name} · day ${DAY} · runs at 23:30 IST`}
      </Label>
      <Chip x={w - 32} y={28} h={30} size={13} text="Idle" icon="clock" tone="neutral" anchor="end" opacity={run.out} />
      <Chip x={w - 32} y={28} h={30} size={13} text="Running" icon="bolt" tone="primary" anchor="end" opacity={run.in * settle.out} />
      <Chip x={w - 32} y={28} h={30} size={13} text="Settled" icon="check" tone="accent" anchor="end" opacity={settle.in} />

      <line x1={0} y1={92} x2={w} y2={92} stroke={soft.ink} strokeWidth={1} />
      <rect x={Math.max(0, phase) * (w - 160)} y={91} width={160} height={2} fill={color.primary} opacity={sweep} />

      <IdleState t={t} w={w} opacity={run.out} />

      {ROWS.map((r, i) => {
        const at = rowAt(i);
        const { o, dy } = riseIn(t, at, 10);
        const y = TOP + i * ROW_H + dy;
        const hl = bump(t, at, at + 0.9);
        const fg = toneColor[r.tone];
        return (
          <g key={r.label} opacity={o}>
            <rect x={16} y={y + 4} width={w - 32} height={ROW_H - 8} rx={12} fill={soft.primary} opacity={0.8 * hl} />
            <Icon name={r.icon} x={32} y={y + 18} size={20} color={fg} strokeWidth={2} />
            <Label x={64} y={y + 34} face="Inter-600" size={17} color={r.tone === 'neutral' ? color.ink : fg} maxW={210}>
              {r.label}
            </Label>
            <Label x={w - 32} y={y + 34} face="Inter-400" size={17} anchor="end" tnum color={color.ink} maxW={370}>
              {r.value}
            </Label>
            {i < ROWS.length - 1 && <line x1={32} y1={TOP + (i + 1) * ROW_H} x2={w - 32} y2={TOP + (i + 1) * ROW_H} stroke={soft.ink} strokeWidth={1} opacity={o} />}
          </g>
        );
      })}

      <Label x={32} y={586} face="Inter-400" size={14} color={color.muted} opacity={fadeIn(t, CUE.engine.doneAt, 0.4)} maxW={w - 64}>
        Exactly once per member, per day.
      </Label>
    </g>
  );
};
