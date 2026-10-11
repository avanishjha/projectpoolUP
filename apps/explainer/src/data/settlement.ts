/**
 * Pool settlement per LLD §3.1, in integer paise so nothing is lost to
 * floating point:
 *   gross_pot    = SUM(transactions)
 *   platform_fee = gross_pot × platform_fee_pct   (min ₹50, Extended Spec §3.2)
 *   net_pot      = gross_pot − platform_fee
 *   proportional: share_i = compliance_i / Σ compliance × net_pot
 * Shares are floored to the paisa and leftover paise go to the largest
 * remainders, so payouts sum to the net pot exactly.
 */
import { rupees } from './format';
import { checkInsThrough, MEMBERS, missesThrough, POOL, type Member } from './pool';

/** The pool terms settlement needs (POOL satisfies it). */
export interface PoolTerms {
  readonly days: number;
  readonly buyIn: number;
  readonly fine: number;
  readonly feePct: number;
  readonly minFee: number;
}

export interface Payout {
  readonly member: Member;
  readonly checkIns: number;
  readonly misses: number;
  /** Buy-in + fines, paise. */
  readonly putIn: number;
  /** Paise. */
  readonly paidOut: number;
  /** paidOut − putIn, paise. */
  readonly net: number;
}

export interface Settlement {
  readonly buyIns: number;
  readonly fines: number;
  readonly misses: number;
  readonly checkIns: number;
  readonly checkInsDue: number;
  readonly gross: number;
  readonly fee: number;
  readonly net: number;
  readonly payouts: readonly Payout[];
}

export const settle = (pool: PoolTerms = POOL, members: readonly Member[] = MEMBERS): Settlement => {
  const day = pool.days;
  const buyIns = members.length * rupees(pool.buyIn);
  const misses = members.reduce((s, m) => s + missesThrough(m, day), 0);
  const fines = misses * rupees(pool.fine);
  const gross = buyIns + fines;
  const fee = Math.max(Math.round(gross * pool.feePct), rupees(pool.minFee));
  const net = gross - fee;

  // Every member's pool has the same length, so compliance_i / Σ compliance
  // reduces to checkIns_i / Σ checkIns — an exact integer ratio.
  const checkIns = members.map((m) => checkInsThrough(m, day));
  const total = checkIns.reduce((a, b) => a + b, 0);
  const floors = checkIns.map((c) => Math.floor((c * net) / total));
  const remainders = checkIns.map((c, i) => ({ i, r: (c * net) % total }));
  let leftover = net - floors.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.r - a.r || a.i - b.i);
  const paid = [...floors];
  for (const { i } of remainders) {
    if (leftover <= 0) break;
    paid[i]! += 1;
    leftover -= 1;
  }

  const payouts = members.map((m, i) => {
    const putIn = rupees(pool.buyIn) + missesThrough(m, day) * rupees(pool.fine);
    return {
      member: m,
      checkIns: checkIns[i]!,
      misses: missesThrough(m, day),
      putIn,
      paidOut: paid[i]!,
      net: paid[i]! - putIn,
    };
  });

  return {
    buyIns,
    fines,
    misses,
    checkIns: total,
    checkInsDue: members.length * day,
    gross,
    fee,
    net,
    payouts,
  };
};

/** Computed once; the film reads from this. */
export const SETTLEMENT = settle();

export const payoutOf = (id: string): Payout => {
  const p = SETTLEMENT.payouts.find((x) => x.member.id === id);
  if (!p) throw new Error(`No payout for ${id}`);
  return p;
};
