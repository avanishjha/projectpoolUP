/**
 * Hand-drawn icon set (spec §2.4): 24×24 grid, drawn as strokes. Icons
 * always travel with a word — state is never carried by colour alone.
 */
export interface IconDef {
  readonly paths: readonly string[];
  readonly circles?: readonly (readonly [cx: number, cy: number, r: number])[];
  /** Circles drawn filled rather than stroked (dots). */
  readonly dots?: readonly (readonly [cx: number, cy: number, r: number])[];
}

export const ICONS = {
  check: { paths: ['M5 12.5l4.5 4.5L19 7.5'] },
  x: { paths: ['M6.5 6.5l11 11M17.5 6.5l-11 11'] },
  alert: { paths: ['M12 3.8L21.2 19.8H2.8z', 'M12 10v4.4'], dots: [[12, 17.1, 1.05]] },
  clock: { paths: ['M12 7.5V12l3 2'], circles: [[12, 12, 8.5]] },
  camera: { paths: ['M4 8.5h3.2l1.6-2.6h6.4l1.6 2.6H20v10H4z'], circles: [[12, 13.3, 3.3]] },
  lock: { paths: ['M6.5 11h11v8.5h-11z', 'M8.75 11V8.25a3.25 3.25 0 0 1 6.5 0V11'] },
  users: {
    paths: ['M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5', 'M15.5 5.6a3 3 0 0 1 0 5.8', 'M17 14.2c2 .5 3.2 2.1 3.5 4.8'],
    circles: [[9, 8.5, 3.2]],
  },
  rupee: { paths: ['M7 5h10', 'M7 9h10', 'M10 5c4.6 0 4.6 8 0 8H7l7.5 6'] },
  flame: {
    paths: [
      'M12 21c-3.8 0-6.4-2.6-6.4-6.2 0-3.3 2.3-5.3 3.6-7.6.4 1.6 1.3 2.6 2.3 3.1.4-2.8 1.4-5.3 3.3-7.1-.1 3.6 3.6 6.2 3.6 11.2 0 3.7-2.6 6.6-6.4 6.6z',
    ],
  },
  shield: { paths: ['M12 3.5l7 2.6v5.4c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.1z'] },
  bolt: { paths: ['M13 3L5.5 13.5H12L11 21l7.5-10.5H12z'] },
  ledger: { paths: ['M6 4h12v16H6z', 'M9 8.5h6', 'M9 12h6', 'M9 15.5h3.5'] },
  chat: { paths: ['M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z'] },
  grid: { paths: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'] },
  dumbbell: { paths: ['M3 9.5v5', 'M6 7v10', 'M18 7v10', 'M21 9.5v5', 'M6 12h12'] },
  arrowUp: { paths: ['M12 19V5', 'M6.5 10.5L12 5l5.5 5.5'] },
  chevronLeft: { paths: ['M14.5 6l-6 6 6 6'] },
  chevronRight: { paths: ['M9.5 6l6 6-6 6'] },
  arrowRight: { paths: ['M5 12h14', 'M13.5 6.5L19 12l-5.5 5.5'] },
  home: { paths: ['M4.5 11L12 4.5 19.5 11v8.5h-5v-5h-5v5h-5z'] },
  compass: { paths: ['M15.5 8.5l-2 5-5 2 2-5z'], circles: [[12, 12, 8.5]] },
  wallet: {
    paths: ['M17 4.5H5.5A1.5 1.5 0 0 0 4 6v12a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18V9a1.5 1.5 0 0 0-1.5-1.5H4'],
    dots: [[16.5, 13.5, 1.1]],
  },
  user: { paths: ['M5.5 19.5c.8-3.4 3.3-5.5 6.5-5.5s5.7 2.1 6.5 5.5'], circles: [[12, 8.5, 3.5]] },
  flag: { paths: ['M7 20.5V4', 'M7 4.5h10l-2.5 3.75L17 12H7'] },
  scan: {
    paths: [
      'M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3',
      'M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3',
      'M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3',
      'M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3',
    ],
    circles: [[12, 12, 2.6]],
  },
  upload: { paths: ['M12 15.5V5', 'M7.5 9.5L12 5l4.5 4.5', 'M5 19h14'] },
  send: { paths: ['M4.5 12l15-7-5 14-2.5-5.5z'] },
  minus: { paths: ['M6 12h12'] },
  comment: { paths: ['M5 5.5h14v9.5h-7.5L7.5 18.5V15H5z'] },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
