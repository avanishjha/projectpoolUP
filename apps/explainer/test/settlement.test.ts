/**
 * Every rupee the film shows (spec §7), recomputed from the LLD §3.1
 * formula. The film must never state a number this file can't reproduce.
 */
import { describe, expect, it } from 'vitest';
import { formatINR } from '../src/data/format';
import { leaderboard, MEMBERS, POOL, potAfter, streakAfter, member } from '../src/data/pool';
import { SETTLEMENT, settle } from '../src/data/settlement';

const S = SETTLEMENT;
const paise = (r: number) => Math.round(r * 100);

describe('the illustrative pool (spec §7)', () => {
  it('ledger totals', () => {
    expect(S.buyIns).toBe(paise(3992));
    expect(S.misses).toBe(12);
    expect(S.fines).toBe(paise(1188));
    expect(S.gross).toBe(paise(5180));
    expect(S.fee).toBe(paise(259));
    expect(S.net).toBe(paise(4921));
    expect(S.checkIns).toBe(228);
    expect(S.checkInsDue).toBe(240);
  });

  it('payouts follow LLD §3.1 proportional: compliance_i / Σ compliance × net_pot, to the paisa', () => {
    const compliance = S.payouts.map((p) => p.checkIns / POOL.days);
    const sum = compliance.reduce((a, b) => a + b, 0);
    S.payouts.forEach((p, i) => {
      const exact = (compliance[i]! / sum) * S.net;
      expect(Math.abs(p.paidOut - exact)).toBeLessThan(1);
    });
  });

  it('payouts sum to the net pot exactly — no paisa created or lost', () => {
    expect(S.payouts.reduce((s, p) => s + p.paidOut, 0)).toBe(S.net);
  });

  it('the figures printed on screen', () => {
    const by = Object.fromEntries(S.payouts.map((p) => [p.member.id, p]));
    for (const id of ['you', 'priya', 'meera', 'ishaan']) {
      expect(by[id]!.paidOut).toBe(64750);
      expect(formatINR(by[id]!.net, { signed: true })).toBe('+₹148.50');
    }
    expect(by.sneha!.paidOut).toBe(60433);
    expect(by.arjun!.paidOut).toBe(58275);
    expect(by.rahul!.paidOut).toBe(58275);
    expect(by.kabir!.paidOut).toBe(56117); // the one spare paisa, by largest remainder
    expect(formatINR(by.kabir!.net, { signed: true, paise: 'always' })).toBe('−₹333.83');
    expect(formatINR(by.sneha!.net, { signed: true, paise: 'always' })).toBe('−₹92.67');
  });

  it('fee floor: a tiny pool pays the ₹50 minimum, not 5%', () => {
    const tiny = settle({ ...POOL, buyIn: 99 }, [
      { id: 'a', name: 'A', initials: 'A', misses: [] },
      { id: 'b', name: 'B', initials: 'B', misses: [] },
    ]);
    expect(tiny.gross).toBe(paise(198));
    expect(tiny.fee).toBe(paise(50));
    expect(tiny.payouts.reduce((s, p) => s + p.paidOut, 0)).toBe(tiny.net);
  });

  it('settlement is idempotent: settling twice gives the same ledger', () => {
    expect(settle()).toEqual(settle());
  });
});

describe('the deep dive (day 24)', () => {
  it('pot is SUM(buy-ins) + SUM(fines), before and after Kabir’s miss', () => {
    expect(potAfter(3)).toBe(4091);
    expect(potAfter(23)).toBe(5081);
    expect(potAfter(24)).toBe(5180);
    expect(potAfter(30)).toBe(5180);
  });

  it('streaks the CRON wrote after day 23 and day 24', () => {
    expect(streakAfter(member('kabir'), 23)).toBe(9);
    expect(streakAfter(member('kabir'), 24)).toBe(0);
    expect(streakAfter(member('sneha'), 24)).toBe(15);
    expect(streakAfter(member('you'), 24)).toBe(24);
  });

  it('leaderboard re-sorts per LLD §3.2 (streak ↓, fines ↑, compliance ↓, joined ↑)', () => {
    const ids = (d: number) => leaderboard(d).map((s) => s.member.id);
    expect(ids(23)).toEqual(['you', 'priya', 'meera', 'ishaan', 'sneha', 'kabir', 'arjun', 'rahul']);
    expect(ids(24)).toEqual(['you', 'priya', 'meera', 'ishaan', 'sneha', 'arjun', 'rahul', 'kabir']);
  });

  it('only Kabir misses day 24, and only Rahul misses day 3', () => {
    expect(MEMBERS.filter((m) => m.misses.includes(24)).map((m) => m.id)).toEqual(['kabir']);
    expect(MEMBERS.filter((m) => m.misses.includes(3)).map((m) => m.id)).toEqual(['rahul']);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping and a true minus', () => {
    expect(formatINR(paise(118800))).toBe('₹1,18,800');
    expect(formatINR(paise(5180))).toBe('₹5,180');
    expect(formatINR(paise(99))).toBe('₹99');
    expect(formatINR(-paise(259))).toBe('−₹259');
    expect(formatINR(64750, { paise: 'always' })).toBe('₹647.50');
    expect(formatINR(0, { paise: 'always' })).toBe('₹0.00');
    expect(formatINR(paise(12345678))).toBe('₹1,23,45,678');
  });
});
