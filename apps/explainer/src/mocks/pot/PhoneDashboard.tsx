/**
 * Deep dive · pot — the pool screen on day 24 (spec §3.3). The leaderboard
 * re-sorts when the CRON writes new streaks, the pot is a SUM that ticks
 * when the fine lands, and the latest-event card turns into the Wall of
 * Shame. All in iOS points inside PhoneChrome.
 */
import type { ReactNode } from 'react';
import { mixColor } from '../../motion/color';
import { smootherstep } from '../../motion/easing';
import { spring, SPRINGS } from '../../motion/spring';
import { bump, fade, lerp, progress } from '../../motion/track';
import { clockLabel, countdownLabel, formatINR, rupees } from '../../data/format';
import { leaderboard, member, MEMBERS, POOL, potAfter, type Member } from '../../data/pool';
import { color, soft } from '../../theme/tokens';
import { secondsToDeadline, storySecondsOfDay } from '../../timeline/clock';
import { CUE } from '../../timeline/cues';
import { Avatar, type RingState } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { Surface } from '../../ui/Surface';
import { seq, swap } from '../shared/anim';
import { PhoneChrome } from '../shared/PhoneChrome';
import type { MockProps } from '../shared/types';

const P = CUE.phone;
const DAY = POOL.focusDay;
const BEFORE = leaderboard(DAY - 1);
const AFTER = leaderboard(DAY);
const ROW_TOP = 302;
const ROW_H = 46;
const W = 390;

/** When each member checked in today (story clock). Kabir never does. */
const CHECKED_AT: Record<string, string> = {
  you: '06:42',
  priya: '06:15',
  meera: '07:03',
  sneha: '21:47',
  arjun: '19:20',
  rahul: '22:58',
  ishaan: clockLabel(storySecondsOfDay(P.ishaanFlip), false),
};

type RowState = 'done' | 'pending' | 'missed';

const rowState = (m: Member, t: number): RowState => {
  if (m.misses.includes(DAY)) return t >= P.kabirMissed ? 'missed' : 'pending';
  if (m.id === 'ishaan') return t >= P.ishaanFlip ? 'done' : 'pending';
  return 'done';
};

const RING: Record<RowState, RingState> = { done: 'done', pending: 'pending', missed: 'shame' };

const Row = ({ m, t }: { m: Member; t: number }): ReactNode => {
  const iBefore = BEFORE.findIndex((s) => s.member.id === m.id);
  const iAfter = AFTER.findIndex((s) => s.member.id === m.id);
  const move = smootherstep(progress(t, P.resort, P.resort + 1.0));
  const y = ROW_TOP + ROW_H * lerp(iBefore, iAfter, move);
  const rank = move < 0.5 ? iBefore + 1 : iAfter + 1;
  const streak = move < 0.5 ? BEFORE[iBefore]!.streak : AFTER[iAfter]!.streak;
  const state = rowState(m, t);
  const isKabir = m.misses.includes(DAY);
  const spotlight = fade(t, P.spotlightFrom, P.spotlightTo, 0.5, 0.6);
  const dim = isKabir ? 1 : 1 - 0.6 * spotlight;
  const status =
    state === 'done' ? `Checked in ${CHECKED_AT[m.id]}` : state === 'missed' ? 'Missed · −₹99' : isKabir && t >= P.spotlightFrom ? `Not yet · ${countdownLabel(secondsToDeadline(t))} left` : 'Not yet';
  const statusColor = state === 'missed' ? color.danger : state === 'pending' && isKabir && t >= P.spotlightFrom ? color.ink : color.muted;
  const flip = bump(t, P.ishaanFlip, P.ishaanFlip + 0.8) * (m.id === 'ishaan' ? 1 : 0);
  return (
    <g opacity={dim}>
      {m.id === 'you' && <rect x={10} y={y + 3} width={W - 20} height={ROW_H - 6} rx={12} fill={soft.primary} />}
      {isKabir && <rect x={10} y={y + 3} width={W - 20} height={ROW_H - 6} rx={12} fill={soft.danger} opacity={spotlight * (0.6 + 0.4 * Math.cos(2 * Math.PI * 0.9 * t))} />}
      {flip > 0 && <rect x={10} y={y + 3} width={W - 20} height={ROW_H - 6} rx={12} fill={soft.accent} opacity={flip} />}
      <Label x={28} y={y + 28} face="Inter-600" size={13} anchor="middle" tnum color={color.muted} maxW={20}>
        {String(rank)}
      </Label>
      <Avatar cx={60} cy={y + ROW_H / 2} r={14} initials={m.initials} ring={RING[state]} highlight={m.id === 'you'} />
      <Label x={86} y={y + 21} face="Inter-500" size={15} maxW={180}>
        {m.name}
      </Label>
      <Label x={86} y={y + 37} face="Inter-400" size={12} tnum color={statusColor} maxW={200}>
        {status}
      </Label>
      <Icon name="flame" x={318} y={y + 15} size={15} color={streak > 0 ? color.primary : color.faint} strokeWidth={2} />
      <Label x={W - 22} y={y + 29} face="SpaceGrotesk-600" size={16} anchor="end" tnum color={streak > 0 ? color.ink : color.faint} maxW={30}>
        {String(streak)}
      </Label>
    </g>
  );
};

const LatestCard = ({ t }: { t: number }): ReactNode => {
  const shame = swap(t, P.shame, 0.5);
  const ishaan = seq(t, P.ishaanFlip);
  const shamed = seq(t, P.shame);
  const kabir = member('kabir');
  const x = 16;
  const y = 682;
  return (
    <g>
      <Surface
        x={x}
        y={y}
        w={W - 32}
        h={80}
        r={16}
        fill={mixColor(color.card, '#2A1B24', shame)}
        border={mixColor(color.border, 'rgba(224,98,110,0.35)', shame)}
        accentBar={{ color: color.danger, clipId: 'shame-bar', width: 4 * shame }}
      />
      <g opacity={ishaan.out}>
        <Avatar cx={x + 32} cy={y + 40} r={16} initials={member('rahul').initials} ring="done" />
        <Label x={x + 60} y={y + 36} face="Inter-600" size={14} maxW={200}>
          Rahul checked in
        </Label>
        <Label x={x + 60} y={y + 55} face="Inter-400" size={12} color={color.muted} maxW={200}>
          Day 24 · 22:58
        </Label>
      </g>
      <g opacity={ishaan.in * shamed.out}>
        <Avatar cx={x + 32} cy={y + 40} r={16} initials={member('ishaan').initials} ring="done" />
        <Label x={x + 60} y={y + 36} face="Inter-600" size={14} maxW={200}>
          Ishaan checked in
        </Label>
        <Label x={x + 60} y={y + 55} face="Inter-400" size={12} tnum color={color.muted} maxW={200}>
          {`Day 24 · ${CHECKED_AT.ishaan}`}
        </Label>
      </g>
      <g opacity={shamed.in}>
        <Avatar cx={x + 34} cy={y + 40} r={16} initials={kabir.initials} ring="shame" />
        <Icon name="alert" x={x + 60} y={y + 22} size={15} color={color.danger} strokeWidth={2} />
        <Label x={x + 80} y={y + 34} face="Inter-600" size={14} maxW={180}>
          {`Kabir missed day ${DAY}.`}
        </Label>
        <Label x={x + 60} y={y + 55} face="Inter-400" size={12} color={color.muted} maxW={200}>
          ₹99 added to the pot.
        </Label>
        <Label x={W - 34} y={y + 47} role="money" size={18} anchor="end" color={color.danger} maxW={70}>
          −₹99
        </Label>
      </g>
    </g>
  );
};

const PotCard = ({ t }: { t: number }): ReactNode => {
  const before = rupees(potAfter(DAY - 1));
  const after = rupees(potAfter(DAY));
  const pot = before + (after - before) * spring(t, P.potTick, SPRINGS.ui);
  const left = secondsToDeadline(t);
  const settled = seq(t, CUE.engine.doneAt);
  const urgent = left <= 60 ? 1 : 0;
  const delta = seq(t, P.potTick);
  return (
    <g>
      <Surface x={16} y={112} w={W - 32} h={150} r={20} fill={color.hero} shadow="hero" />
      <Label x={32} y={142} role="eyebrow" size={11} color={color.muted} maxW={80}>
        POT
      </Label>
      <Chip x={W - 32} y={124} h={28} size={13} text={`Closes in ${countdownLabel(left)}`} icon="clock" tnum tone={urgent ? 'danger' : 'neutral'} anchor="end" opacity={settled.out} />
      <Chip x={W - 32} y={124} h={28} size={13} text="Settled · 23:30" icon="check" tone="accent" anchor="end" opacity={settled.in} />
      <Label x={32} y={206} role="money" size={46} maxW={W - 64}>
        {formatINR(Math.round(pot / 100) * 100)}
      </Label>
      <Label x={32} y={240} face="Inter-500" size={13} color={color.muted} opacity={delta.out} maxW={W - 64}>
        {`${MEMBERS.length} members · ₹99 per miss`}
      </Label>
      <g opacity={delta.in}>
        <Icon name="arrowUp" x={30} y={228} size={15} color={color.accent} strokeWidth={2.2} />
        <Label x={50} y={240} face="Inter-600" size={13} color={color.accent} maxW={W - 82}>
          ₹99 tonight · Kabir missed
        </Label>
      </g>
    </g>
  );
};

const Dock = (): ReactNode => {
  const x = (W - 230) / 2;
  const icons = ['home', 'compass', 'wallet', 'user'] as const;
  return (
    <g>
      <Surface x={x} y={774} w={230} h={54} r={27} fill="rgba(26,33,50,0.94)" shadow="hero" />
      {icons.map((name, i) => (
        <Icon key={name} name={name} x={x + 230 / 8 + (230 / 4) * i - 11} y={790} size={22} color={i === 0 ? color.primary : color.muted} />
      ))}
    </g>
  );
};

export const PhoneDashboard = ({ t, w, h }: MockProps): ReactNode => {
  const checkedIn = MEMBERS.filter((m) => rowState(m, t) === 'done').length;
  const content = smootherstep(progress(t, P.contentIn, P.contentIn + 0.5));
  return (
    <PhoneChrome w={w} h={h} clipId="phone-dash" time={clockLabel(storySecondsOfDay(t), false)}>
      <g opacity={content}>
        <Icon name="chevronLeft" x={10} y={60} size={24} color={color.ink} />
        <Label x={42} y={75} face="Inter-600" size={17} tracking={-0.01} maxW={220}>
          {POOL.name}
        </Label>
        <Label x={42} y={93} face="Inter-400" size={12} color={color.muted} maxW={220}>
          {`Day ${DAY} of ${POOL.days} · ${MEMBERS.length} members`}
        </Label>
        {(['priya', 'meera', 'you'] as const).map((id, i) => (
          <Avatar key={id} cx={318 + i * 18} cy={78} r={12} initials={member(id).initials} highlight={id === 'you'} />
        ))}

        <PotCard t={t} />

        <Label x={20} y={292} role="eyebrow" size={11} color={color.muted} maxW={120}>
          TODAY
        </Label>
        <Label x={W - 20} y={292} face="Inter-500" size={12} anchor="end" tnum color={checkedIn === MEMBERS.length ? color.accent : color.muted} maxW={140}>
          {`${checkedIn}/${MEMBERS.length} checked in`}
        </Label>
        {MEMBERS.map((m) => (
          <Row key={m.id} m={m} t={t} />
        ))}

        <LatestCard t={t} />
        <Dock />
      </g>
    </PhoneChrome>
  );
};
