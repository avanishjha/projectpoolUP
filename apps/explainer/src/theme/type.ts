/**
 * Type roles (spec §2.3). Typography is locked: Space Grotesk for display and
 * money, Inter for UI. Tracking is size-specific, in em.
 */
import type { FaceKey } from './font-files';

export type Role =
  | 'wordmark'
  | 'tagline'
  | 'headline'
  | 'money'
  | 'sub'
  | 'title'
  | 'ui'
  | 'eyebrow'
  | 'footnote';

export interface TypeSpec {
  readonly face: FaceKey;
  readonly size: number;
  readonly lineHeight: number;
  readonly tracking: number;
  readonly uppercase?: boolean;
  readonly tnum?: boolean;
  /** Smallest permitted on-screen size (font-size × content scale). */
  readonly minOnScreen: number;
}

export const TYPE: Record<Role, TypeSpec> = {
  wordmark: { face: 'SpaceGrotesk-700', size: 96, lineHeight: 96, tracking: -0.03, minOnScreen: 0 },
  tagline: { face: 'SpaceGrotesk-600', size: 84, lineHeight: 88, tracking: -0.03, minOnScreen: 0 },
  headline: { face: 'SpaceGrotesk-600', size: 60, lineHeight: 66, tracking: -0.025, minOnScreen: 52 },
  money: { face: 'SpaceGrotesk-600', size: 52, lineHeight: 56, tracking: -0.03, tnum: true, minOnScreen: 16 },
  sub: { face: 'Inter-400', size: 28, lineHeight: 40, tracking: 0, minOnScreen: 26 },
  title: { face: 'Inter-600', size: 20, lineHeight: 26, tracking: -0.012, minOnScreen: 15 },
  ui: { face: 'Inter-400', size: 15, lineHeight: 20, tracking: 0, minOnScreen: 12 },
  eyebrow: { face: 'Inter-600', size: 13, lineHeight: 16, tracking: 0.12, uppercase: true, minOnScreen: 11 },
  footnote: { face: 'Inter-400', size: 22, lineHeight: 30, tracking: 0, minOnScreen: 22 },
};

/** Money tracking tightens only at display sizes (design audit §Typography). */
export const moneyTracking = (size: number): number => (size >= 40 ? -0.03 : -0.01);

export const familyOf = (face: FaceKey): string =>
  face.startsWith('Inter') ? 'Inter' : 'Space Grotesk';

export const weightOf = (face: FaceKey): number => Number(face.split('-')[1]);
