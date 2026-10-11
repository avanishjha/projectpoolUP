/**
 * The cue sheet (spec §4.6): every discrete event in the film, in seconds.
 * Mocks never invent their own times; they read them from here.
 */
export type ChatItem =
  | { kind: 'divider'; text: string; at: number }
  | { kind: 'msg'; from: string; lines: readonly string[]; at: number; mine?: boolean }
  | { kind: 'meta'; text: string; at: number }
  | { kind: 'typing'; who: string; at: number; until: number };

export const CUE = {
  bg: { in: 0, full: 1.2 },
  /** State-A unease: ramps up, then dissolves into the A → B morph. */
  chaos: { riseFrom: 15, riseTo: 19, fallFrom: 20, fallTo: 21.4 },

  chat: {
    script: [
      { kind: 'divider', text: 'DAY 1', at: 1.4 },
      { kind: 'msg', from: 'Arjun', lines: ['New year. Gym every day.', '₹500 fine if you skip.'], at: 1.7 },
      { kind: 'msg', from: 'You', lines: ['In.'], at: 2.5, mine: true },
      { kind: 'msg', from: 'Rahul', lines: ['In. Easy.'], at: 2.9 },
      { kind: 'msg', from: 'Kabir', lines: ['100% in.'], at: 3.3 },
      { kind: 'divider', text: 'DAY 6', at: 4.4 },
      { kind: 'msg', from: 'Rahul', lines: ['Skipped today.', 'Will pay later.'], at: 4.8 },
      { kind: 'msg', from: 'Kabir', lines: ['Leg day tomorrow. Promise.'], at: 5.6 },
      { kind: 'divider', text: 'DAY 11', at: 9.6 },
      { kind: 'msg', from: 'Arjun', lines: ["Who's tracking fines?"], at: 10.0 },
      { kind: 'divider', text: 'DAY 14', at: 14.0 },
      { kind: 'msg', from: 'Arjun', lines: ['Hello?'], at: 14.4 },
      { kind: 'meta', text: 'Seen by 5', at: 15.0 },
      { kind: 'typing', who: 'Kabir', at: 15.4, until: 17.0 },
    ] satisfies readonly ChatItem[],
    unread: [
      { at: 0, n: 3 },
      { at: 6, n: 17 },
      { at: 11, n: 29 },
      { at: 15.2, n: 41 },
    ],
  },

  sheet: { colStart: 7.0, colGap: 0.22, errorAt: 9.0 },
  pay: { rowStart: 11.6, rowGap: 0.4, collectedAt: 13.4 },

  links: {
    drawFrom: 15.8,
    drawTo: 16.6,
    breakAt: 16.8,
    solidFrom: 22.4,
    solidTo: 23.4,
    outFrom: 50.0,
    outTo: 50.8,
  },

  // Beat 2 — the mechanics
  highlight: {
    pact: [24.4, 30.2],
    tracker: [30.4, 36.2],
    money: [36.4, 42.2],
    pot: [42.4, 49.8],
  },
  pool: { joinStart: 24.8, joinGap: 0.35 },
  checkin: { shutter: 31.6, badgeStart: 32.2, badgeGap: 0.3, day3: 35.0 },
  fine: { cardIn: 36.6, fineAt: 37.4, processingAt: 38.4, debitedAt: 39.4, addedAt: 40.2 },
  potNode: { tick: 41.8 },
  pulses: [
    { rail: 0, at: 29.4, label: 'daily' },
    { rail: 1, at: 35.4, label: 'miss' },
    { rail: 2, at: 41.0, label: '₹99' },
  ],
  ambientPulse: { from: 45.0, to: 49.4, period: 1.4 },

  // Beat 3 — deep dive
  live: { promptAt: 52.4, shutter: 54.6, flash: 54.8, uploadFrom: 55.2, uploadTo: 56.2, doneAt: 56.4 },
  phone: {
    contentIn: 51.4,
    ishaanFlip: 56.6,
    spotlightFrom: 58.4,
    spotlightTo: 66.0,
    kabirMissed: 69.4,
    potTick: 70.8,
    resort: 72.4,
    shame: 74.0,
  },
  engine: { runAt: 66.2, rowStart: 66.4, rowGap: 0.6, doneAt: 71.2 },

  // Beat 4 — the ledger
  tiles: { countFrom: 82.0, gap: 0.4 },
  chart: { in: 84.0, barsFrom: 85.4, barGap: 0.25, deltasAt: 90.0, highlightAt: 93.0 },
  footnote: { in: 80.6, out: 100.0 },

  // Beat 5 — resolution
  outro: { mark: 101.0, wordmark: 101.2, tagline: 101.8, sub: 103.4, cta: 104.2, sheen: 112.0 },
  payout: { countFrom: 102.6, countTo: 104.6, deltaAt: 104.8, settledAt: 105.6 },
  /** Ambient motion fades to zero; the last two seconds are a still poster. */
  poster: { from: 116, to: 118 },
} as const;
