/**
 * State A · tracker — the "Fines tracker" spreadsheet that died on day four.
 * Columns fill on cue, then `?`, then nothing; OWED breaks into #REF!.
 */
import type { ReactNode } from 'react';
import { fade } from '../../motion/track';
import { color, soft } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { Chip, chipWidth } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { fadeIn } from '../shared/anim';
import { SiloHeader } from '../shared/SiloHeader';
import type { MockProps } from '../shared/types';

/** v = checked, x = missed, ? = unknown, - = never filled in. */
const ROWS = [
  { name: 'Arjun', cells: 'vvvvv?-', owed: '₹0' },
  { name: 'You', cells: 'vvvvvv?', owed: '₹0' },
  { name: 'Priya', cells: 'vvvv?--', owed: '?' },
  { name: 'Rahul', cells: 'vvxvxx?', owed: '#REF!' },
  { name: 'Kabir', cells: 'vxvx?--', owed: '#REF!' },
  { name: 'Sneha', cells: 'vvv?---', owed: '?' },
] as const;

const G = { x: 20, nameW: 120, dayW: 40, owedW: 80, headTop: 80, headH: 36, rowH: 44 };
const dayCenter = (j: number) => G.x + G.nameW + G.dayW * j + G.dayW / 2;
const owedRight = G.x + G.nameW + G.dayW * 7 + G.owedW - 12;
const rowTop = (i: number) => G.headTop + G.headH + G.rowH * i;
const ERROR_CHIP = { text: '2 errors', icon: 'alert', size: 13, h: 28 } as const;

export const SheetSilo = ({ t, w }: MockProps): ReactNode => {
  const colAt = (j: number) => CUE.sheet.colStart + CUE.sheet.colGap * j;
  const owedAt = colAt(7);
  const err = fadeIn(t, CUE.sheet.errorAt, 0.25);
  // Gentle 1.2 Hz pulse on the broken cells once they appear.
  const blink = 0.6 + 0.4 * Math.cos(2 * Math.PI * 1.2 * Math.max(0, t - CUE.sheet.errorAt));
  const gridBottom = rowTop(ROWS.length);
  const chipW = chipWidth(ERROR_CHIP);
  return (
    <g>
      <SiloHeader w={w} icon="grid" title="Fines tracker" sub="Last edited 9 days ago" slotW={chipW + 8}>
        <Chip {...ERROR_CHIP} x={w - 22} y={22} tone="danger" anchor="end" opacity={err} />
      </SiloHeader>

      {/* header row */}
      <rect x={G.x} y={G.headTop} width={w - G.x * 2} height={G.headH} rx={8} fill={soft.ink} />
      <Label x={G.x + 12} y={G.headTop + 23} role="eyebrow" size={11} color={color.muted} maxW={G.nameW - 16}>
        NAME
      </Label>
      {Array.from({ length: 7 }, (_, j) => (
        <Label key={j} x={dayCenter(j)} y={G.headTop + 23} role="eyebrow" size={11} anchor="middle" color={color.muted} maxW={G.dayW - 4}>
          {`D${j + 1}`}
        </Label>
      ))}
      <Label x={owedRight} y={G.headTop + 23} role="eyebrow" size={11} anchor="end" color={color.muted} maxW={G.owedW - 12}>
        OWED
      </Label>

      {/* grid lines */}
      {ROWS.map((_, i) => (
        <line key={i} x1={G.x} y1={rowTop(i + 1)} x2={w - G.x} y2={rowTop(i + 1)} stroke={soft.ink} strokeWidth={1} />
      ))}
      {Array.from({ length: 8 }, (_, j) => {
        const x = G.x + G.nameW + G.dayW * j;
        return <line key={j} x1={x} y1={G.headTop + G.headH} x2={x} y2={gridBottom} stroke={soft.ink} strokeWidth={1} />;
      })}

      {ROWS.map((row, i) => {
        const cy = rowTop(i) + G.rowH / 2;
        const broken = row.owed === '#REF!';
        return (
          <g key={row.name}>
            <Label x={G.x + 12} y={cy + 5} face="Inter-500" size={14} maxW={G.nameW - 16}>
              {row.name}
            </Label>
            {[...row.cells].map((c, j) => {
              const o = fadeIn(t, colAt(j), 0.2);
              const cx = dayCenter(j);
              if (c === 'v') return <Icon key={j} name="check" x={cx - 9} y={cy - 9} size={18} color={color.accent} opacity={0.75 * o} strokeWidth={2} />;
              if (c === 'x') return <Icon key={j} name="x" x={cx - 8} y={cy - 8} size={16} color={color.danger} opacity={0.85 * o} strokeWidth={2} />;
              if (c === '?')
                return (
                  <Label key={j} x={cx} y={cy + 5} face="Inter-600" size={14} anchor="middle" color={color.muted} opacity={o} maxW={G.dayW - 8}>
                    ?
                  </Label>
                );
              return null;
            })}
            {broken ? (
              <g opacity={err}>
                <rect x={G.x + G.nameW + G.dayW * 7 + 4} y={rowTop(i) + 6} width={G.owedW - 8} height={G.rowH - 12} rx={6} fill={soft.danger} opacity={blink} />
                <Label x={owedRight} y={cy + 5} face="Inter-600" size={13} anchor="end" color={color.danger} maxW={G.owedW - 16}>
                  {row.owed}
                </Label>
              </g>
            ) : (
              <Label x={owedRight} y={cy + 5} face="Inter-500" size={14} anchor="end" tnum color={color.muted} opacity={fadeIn(t, owedAt, 0.2)} maxW={G.owedW - 16}>
                {row.owed}
              </Label>
            )}
          </g>
        );
      })}

      <g opacity={fade(t, CUE.sheet.errorAt + 0.4, Infinity, 0.4)}>
        <Icon name="comment" x={G.x + 2} y={412} size={18} color={color.muted} />
        <Label x={G.x + 28} y={426} face="Inter-400" size={13} color={color.muted} maxW={w - G.x * 2 - 28}>
          3 comments · unresolved
        </Label>
      </g>
    </g>
  );
};
