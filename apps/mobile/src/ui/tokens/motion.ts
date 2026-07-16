/**
 * CONQR motion — springs over curves, subtle over showy.
 * Everything tactile responds in <200ms; nothing bounces unless it's a
 * celebration.
 */
import { Easing } from 'react-native-reanimated';

export const durations = {
  instant: 100,
  fast: 160,
  base: 240,
  slow: 400,
} as const;

export const easings = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
} as const;

/** withSpring configs. */
export const springs = {
  /** Default interactive response — presses, toggles. */
  snappy: { damping: 22, stiffness: 320, mass: 0.9 },
  /** Layout settles — cards, sheets. */
  gentle: { damping: 24, stiffness: 220, mass: 1 },
  /** Celebrations only — streak milestones, payouts. */
  bouncy: { damping: 13, stiffness: 260, mass: 0.9 },
} as const;

/** How far pressables shrink when touched. */
export const pressScale = 0.965;
