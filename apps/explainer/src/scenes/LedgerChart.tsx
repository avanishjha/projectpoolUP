/**
 * "Put in vs. paid out" per member (spec §3.4). Put-in bars stack buy-in and
 * fines; paid-out bars are SETTLEMENT's proportional shares. A dashed line
 * marks the ₹499 buy-in. Bars grow on a C² ease, staggered.
 */
import type { ReactNode } from 'react';
import { smootherstep } from '../motion/easing';
import { fade, progress } from '../motion/track';
import { formatINR, rupees } from '../data/format';
import { POOL } from '../data/pool';
import { SETTLEMENT } from '../data/settlement';
import { measureText } from '../theme/measure';
import { color } from '../theme/tokens';
import { CUE } from '../timeline/cues';
import { STAGE } from '../timeline/stage';
import { Label } from '../ui/Label';
import { Surface } from '../ui/Surface';
import { riseIn } from '../mocks/shared/anim';

const R = STAGE['C.chart'];
const PLOT = { left: 32, right: R.w - 32, base: 300, maxH: 196 };
const MAX = Math.max(...SETTLEMENT.payouts.map((p) => Math.max(p.putIn, p.paidOut)));
const hOf = (paise: number) => (paise / MAX) * PLOT.maxH;
const GROUP = (PLOT.right - PLOT.left) / SETTLEMENT.payouts.length;
const BAR = 52;

const LEGEND = [
  { label: `${formatINR(rupees(POOL.buyIn))} buy-in line`, fill: 'dash' },
  { label: 'Buy-in', fill: 'rgba(156,163,175,0.35)' },
  { label: 'Fines', fill: color.danger },
  { label: 'Paid out', fill: color.accent },
] as const;

export const LedgerChart = ({ t }: { t: number }): ReactNode => {
  const C = CUE.chart;
  const visible = fade(t, C.in, CUE.footnote.out, 0.6, 0.8);
  if (visible <= 0.001) return null;
  const enter = riseIn(t, C.in, 24);
  const focus = smootherstep(progress(t, C.highlightAt, C.highlightAt + 0.8));
  const buyInY = PLOT.base - hOf(rupees(POOL.buyIn));

  // Legend laid out right-to-left from the plot's right edge.
  let lx = PLOT.right;
  const legend = [...LEGEND].reverse().map((item) => {
    const w = measureText(item.label, 'Inter-500', 15);
    lx -= w;
    const at = { ...item, x: lx, w };
    lx -= 12 + 8 + 28;
    return at;
  });

  return (
    <g opacity={visible} transform={`translate(${R.x} ${R.y + enter.dy})`}>
      <Surface x={0} y={0} w={R.w} h={R.h} r={R.r} />
      <Label x={32} y={46} face="Inter-600" size={22} tracking={-0.012} maxW={600}>
        Put in vs. paid out
      </Label>
      <Label x={32} y={72} face="Inter-400" size={15} color={color.muted} maxW={600}>
        Per member at day 30 · buy-in plus fines, against their payout
      </Label>
      {legend.map((l) => (
        <g key={l.label}>
          {l.fill === 'dash' ? (
            <line x1={l.x - 28} y1={39} x2={l.x - 8} y2={39} stroke={color.muted} strokeWidth={1.5} strokeDasharray="4 4" />
          ) : (
            <rect x={l.x - 20} y={33} width={12} height={12} rx={3} fill={l.fill} />
          )}
          <Label x={l.x} y={44} face="Inter-500" size={15} color={color.muted} maxW={l.w + 1}>
            {l.label}
          </Label>
        </g>
      ))}

      <line x1={PLOT.left} y1={buyInY} x2={PLOT.right} y2={buyInY} stroke={color.faint} strokeWidth={1.5} strokeDasharray="5 6" />
      <line x1={PLOT.left} y1={PLOT.base} x2={PLOT.right} y2={PLOT.base} stroke="rgba(249,250,251,0.12)" strokeWidth={1} />

      {SETTLEMENT.payouts.map((p, i) => {
        const gx = PLOT.left + GROUP * (i + 0.5);
        const grow = smootherstep(progress(t, C.barsFrom + i * C.barGap, C.barsFrom + i * C.barGap + 0.9));
        const growPaid = smootherstep(progress(t, C.barsFrom + i * C.barGap + 0.3, C.barsFrom + i * C.barGap + 1.2));
        const buy = hOf(rupees(POOL.buyIn)) * grow;
        const fines = hOf(p.putIn - rupees(POOL.buyIn)) * grow;
        const paid = hOf(p.paidOut) * growPaid;
        const winner = p.net >= 0;
        const dim = winner ? 1 : 1 - 0.45 * focus;
        const delta = fade(t, C.deltasAt + i * 0.08, Infinity, 0.4);
        const isYou = p.member.id === 'you';
        return (
          <g key={p.member.id} opacity={dim}>
            <rect x={gx - 60} y={PLOT.base - buy} width={BAR} height={buy} rx={4} fill="rgba(156,163,175,0.35)" />
            {fines > 0.5 && <rect x={gx - 60} y={PLOT.base - buy - fines} width={BAR} height={fines} rx={4} fill={color.danger} opacity={0.9} />}
            <rect x={gx + 8} y={PLOT.base - paid} width={BAR} height={paid} rx={4} fill={winner ? color.accent : 'rgba(156,163,175,0.6)'} />
            <Label x={gx + 8 + BAR / 2} y={PLOT.base - hOf(p.paidOut) - 12} face="Inter-600" size={15} anchor="middle" tnum color={winner ? color.accent : color.danger} opacity={delta} maxW={GROUP - 16}>
              {formatINR(p.net, { signed: true, paise: 'always' })}
            </Label>
            <Label x={gx} y={PLOT.base + 34} face={isYou ? 'Inter-600' : 'Inter-500'} size={16} anchor="middle" color={isYou ? color.ink : color.muted} maxW={GROUP - 16}>
              {p.member.name}
            </Label>
          </g>
        );
      })}
    </g>
  );
};
