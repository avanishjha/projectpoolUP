/**
 * The deep dive's story clock (spec §4.8): seconds after 23:00 IST as a
 * monotonic, continuous function of film time. The deadline (23:30) lands
 * exactly when the engine starts.
 */
import { linear, smootherstep } from '../motion/easing';
import { sampleNumber, type Key } from '../motion/track';

const T = (mm: number, ss: number): number => mm * 60 + ss;

export const DEADLINE = T(30, 0);

const KEYS: readonly Key<number>[] = [
  { t: 50.0, v: T(12, 30), ease: linear },
  { t: 56.8, v: T(13, 10.8), ease: smootherstep },
  { t: 58.2, v: T(29, 0), ease: linear },
  { t: 66.0, v: DEADLINE, ease: linear },
  { t: 80.0, v: T(30, 14) },
];

/** Seconds after 23:00:00 IST. */
export const storyClock = (t: number): number => sampleNumber(KEYS, t);

/** Seconds of day (for clockLabel). */
export const storySecondsOfDay = (t: number): number => 23 * 3600 + storyClock(t);

export const secondsToDeadline = (t: number): number => DEADLINE - storyClock(t);
