/**
 * The film's colour system (spec §2.1–2.2). The five brief colours are used
 * verbatim; `danger`, `faint` and the elevation ladder are derived and
 * documented. Components read roles from here — never raw hexes.
 */
import { withAlpha } from '../motion/color';

/** The brief's palette, verbatim. */
export const BRIEF = {
  obsidian: '#0B0F19',
  indigo: '#6366F1',
  emerald: '#10B981',
  white: '#F9FAFB',
  gray: '#9CA3AF',
} as const;

export const color = {
  // Elevation ladder (spec §2.2)
  canvas: BRIEF.obsidian,
  sunken: '#0F1421',
  card: '#141A28',
  hero: '#1A2132',
  device: '#06080D',
  /** Neutral avatar fill, one step above `hero`. */
  avatar: '#252D40',

  // Text
  ink: BRIEF.white,
  muted: BRIEF.gray,
  /** Decoration only — never content. */
  faint: '#5B6474',

  // Information colours
  primary: BRIEF.indigo,
  accent: BRIEF.emerald,
  /** Derived: the brief has no failure colour (spec §2.1). */
  danger: '#E0626E',

  // Material
  border: withAlpha(BRIEF.white, 0.07),
  borderTop: withAlpha(BRIEF.white, 0.14),
} as const;

export const soft = {
  primary: withAlpha(color.primary, 0.16),
  accent: withAlpha(color.accent, 0.14),
  danger: withAlpha(color.danger, 0.14),
  ink: withAlpha(color.ink, 0.06),
} as const;

export type Tone = 'neutral' | 'primary' | 'accent' | 'danger';

export const toneColor: Record<Tone, string> = {
  neutral: color.muted,
  primary: color.primary,
  accent: color.accent,
  danger: color.danger,
};

export const toneSoft: Record<Tone, string> = {
  neutral: soft.ink,
  primary: soft.primary,
  accent: soft.accent,
  danger: soft.danger,
};
