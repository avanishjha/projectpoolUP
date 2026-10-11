/** State B · tracker — node 02 "Check in": viewfinder, shutter, eight badges, then day 3. */
import type { ReactNode } from 'react';
import { clockLabel } from '../../data/format';
import { MEMBERS } from '../../data/pool';
import { color } from '../../theme/tokens';
import { CUE } from '../../timeline/cues';
import { highlightAt } from '../../timeline/actors';
import { Avatar } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { fadeIn, popIn, scaleAt, seq, swap } from '../shared/anim';
import { NodeFooter, NodeHeader } from '../shared/NodeHeader';
import type { MockProps } from '../shared/types';
import { Viewfinder } from '../shared/Viewfinder';

/** Rahul is the one who misses day 3 (spec §7). */
const DAY3_MISS = 'rahul';

export const CheckInNode = ({ t, w }: MockProps): ReactNode => {
  const active = highlightAt('tracker', t);
  const c = CUE.checkin;
  const captured = fadeIn(t, c.shutter + 0.2, 0.3);
  const day3 = swap(t, c.day3);
  const counter = seq(t, c.day3);
  return (
    <g>
      <NodeHeader w={w} index="02" title="Check in" icon="camera" active={active} />
      <Viewfinder x={24} y={88} w={w - 48} h={196} r={16} t={t} clipId="vf-node" flashAt={c.shutter} frozen={captured} />
      <Chip x={38} y={100} h={26} size={12} text="Camera only" icon="lock" tone="neutral" ink={color.ink} />
      <Chip x={38} y={244} h={26} size={12} text={`Day 1 · ${clockLabel(6 * 3600 + 42 * 60, false)}`} icon="check" tone="accent" opacity={captured * (1 - day3)} />

      {MEMBERS.map((m, i) => {
        const cx = 48 + (i % 4) * 88;
        const cy = 332 + Math.floor(i / 4) * 66;
        const s = popIn(t, c.badgeStart + i * c.badgeGap);
        const missed = m.id === DAY3_MISS ? day3 : 0;
        return (
          <g key={m.id}>
            <Avatar cx={cx} cy={cy} r={22} initials={m.initials} highlight={m.id === 'you'} ring={missed > 0.5 ? 'pending' : 'none'} ringOpacity={missed} />
            {s > 0 && (
              <g transform={scaleAt(cx + 17, cy + 17, s)}>
                <circle cx={cx + 17} cy={cy + 17} r={10} fill={missed > 0.5 ? color.danger : color.accent} stroke={color.card} strokeWidth={2.5} />
                <Icon name={missed > 0.5 ? 'x' : 'check'} x={cx + 10.5} y={cy + 10.5} size={13} color={color.canvas} strokeWidth={3} />
              </g>
            )}
          </g>
        );
      })}

      <Label x={24} y={456} face="Inter-600" size={17} tnum maxW={w - 48} opacity={fadeIn(t, c.badgeStart + 7 * c.badgeGap) * counter.out}>
        8/8 checked in · Day 1
      </Label>
      <Label x={24} y={456} face="Inter-600" size={17} tnum color={color.ink} maxW={w - 48} opacity={counter.in}>
        7/8 checked in · Day 3
      </Label>

      <NodeFooter w={w} icon="clock" text="Deadline 23:30 IST, every day" />
    </g>
  );
};
