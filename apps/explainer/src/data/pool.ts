/**
 * The illustrative pool (spec §7). Only these inputs are authored; every
 * figure the film shows is derived from them here or in settlement.ts.
 */
export interface Member {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  /** Pool days (1-based) with no check-in. Grace days are off, so each is fined. */
  readonly misses: readonly number[];
}

export const POOL = {
  name: 'Morning Lift Club',
  days: 30,
  buyIn: 499,
  fine: 99,
  graceDays: 0,
  feePct: 0.05,
  /** Extended Spec §3.2: minimum platform fee per pool. */
  minFee: 50,
  payoutRule: 'proportional',
  /** check_in_deadline_utc default 18 → 23:30 IST. */
  deadlineIST: '23:30',
  /** The day the deep dive happens on. */
  focusDay: 24,
} as const;

/** Join order — the leaderboard's last tiebreaker. */
export const MEMBERS: readonly Member[] = [
  { id: 'you', name: 'You', initials: 'YO', misses: [] },
  { id: 'priya', name: 'Priya', initials: 'PS', misses: [] },
  { id: 'meera', name: 'Meera', initials: 'MN', misses: [] },
  { id: 'ishaan', name: 'Ishaan', initials: 'IR', misses: [] },
  { id: 'sneha', name: 'Sneha', initials: 'SK', misses: [6, 9] },
  { id: 'arjun', name: 'Arjun', initials: 'AM', misses: [4, 11, 17] },
  { id: 'rahul', name: 'Rahul', initials: 'RV', misses: [3, 12, 20] },
  { id: 'kabir', name: 'Kabir', initials: 'KS', misses: [5, 8, 14, 24] },
];

export const member = (id: string): Member => {
  const m = MEMBERS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown member ${id}`);
  return m;
};

export const missesThrough = (m: Member, day: number): number => m.misses.filter((d) => d <= day).length;

/** Consecutive check-in days ending at `day` — what the CRON writes after `day` closes. */
export const streakAfter = (m: Member, day: number): number => {
  let s = 0;
  for (let d = day; d >= 1 && !m.misses.includes(d); d--) s++;
  return s;
};

export const checkInsThrough = (m: Member, day: number): number => day - missesThrough(m, day);

/** Gross pot (₹) after `day` closes: SUM(buy-ins) + SUM(fines). Never an increment. */
export const potAfter = (day: number): number =>
  MEMBERS.length * POOL.buyIn + MEMBERS.reduce((s, m) => s + missesThrough(m, day) * POOL.fine, 0);

export interface Standing {
  readonly member: Member;
  readonly streak: number;
  readonly fines: number;
  readonly compliance: number;
}

/**
 * Leaderboard after `day` closes. LLD §3.2: streak DESC, fines ASC,
 * compliance DESC, joined ASC.
 */
export const leaderboard = (day: number): Standing[] =>
  MEMBERS.map((m, joined) => ({
    member: m,
    streak: streakAfter(m, day),
    fines: missesThrough(m, day) * POOL.fine,
    compliance: day === 0 ? 1 : checkInsThrough(m, day) / day,
    joined,
  }))
    .sort(
      (a, b) =>
        b.streak - a.streak || a.fines - b.fines || b.compliance - a.compliance || a.joined - b.joined,
    )
    .map(({ member: m, streak, fines, compliance }) => ({ member: m, streak, fines, compliance }));
