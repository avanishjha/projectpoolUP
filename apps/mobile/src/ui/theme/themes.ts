/**
 * CONQR themes — subtle and professional. Accents are desaturated and
 * deepened (burnt ember, muted brass, sage mint, dulled crimson); color is
 * information, never decoration. Components consume SEMANTIC roles from
 * useTheme() — raw hexes never appear in screens.
 */
import type { ViewStyle } from 'react-native';

type Glow = Pick<ViewStyle, 'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset'>;

export interface Theme {
  scheme: 'dark' | 'light';

  // Canvas
  canvas: string;
  raised: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Text on top of accent fills (e.g. primary button label). */
  textOnAccent: string;

  // Accents — desaturated, information-bearing
  ember: string;   // discipline · CTA · streak
  gold: string;    // money
  mint: string;    // success · streak alive
  blood: string;   // danger · fine · shame
  violet: string;  // spectator · info

  // Glass surface recipe
  glassSurface: string;
  glassSurfaceStrong: string;
  glassBorder: string;
  glassBorderStrong: string;
  glassSheen: string;

  // Component-level roles
  skeleton: string;
  ringTrack: string;
  shameBorder: string;
  shameSurface: readonly [string, string];

  gradients: {
    ember: readonly [string, string, string];
    gold: readonly [string, string, string];
    glassSheen: readonly [string, string];
    shameRing: readonly [string, string, string];
  };

  glowEmber: Glow;
}

export const darkTheme: Theme = {
  scheme: 'dark',

  canvas: '#0C0C10',
  raised: '#141419',

  textPrimary: 'rgba(240,240,246,0.95)',
  textSecondary: 'rgba(232,232,242,0.60)',
  textMuted: 'rgba(228,228,240,0.38)',
  textOnAccent: '#FFF7F4',

  ember: '#D95B3F',
  gold: '#CFA85C',
  mint: '#5FA98C',
  blood: '#C95762',
  violet: '#8B87AE',

  glassSurface: 'rgba(255,255,255,0.045)',
  glassSurfaceStrong: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.09)',
  glassBorderStrong: 'rgba(255,255,255,0.14)',
  glassSheen: 'rgba(255,255,255,0.10)',

  skeleton: 'rgba(255,255,255,0.08)',
  ringTrack: 'rgba(255,255,255,0.08)',
  shameBorder: 'rgba(201,87,98,0.32)',
  shameSurface: ['rgba(201,87,98,0.13)', 'rgba(201,87,98,0.04)'],

  gradients: {
    ember: ['#E06A4C', '#D6553A', '#BC4830'],
    gold: ['#DBBA75', '#CFA85C', '#B08A44'],
    glassSheen: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)'],
    shameRing: ['#D97680', '#C95762', '#AD4650'],
  },

  glowEmber: {
    shadowColor: '#D6553A',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
};

export const lightTheme: Theme = {
  scheme: 'light',

  canvas: '#F6F5F2',
  raised: '#FFFFFF',

  textPrimary: '#1B1A20',
  textSecondary: 'rgba(27,26,32,0.62)',
  textMuted: 'rgba(27,26,32,0.42)',
  textOnAccent: '#FFF7F4',

  ember: '#B94A2F',
  gold: '#96762C',
  mint: '#2F7D5B',
  blood: '#B04751',
  violet: '#645E96',

  glassSurface: 'rgba(24,22,32,0.03)',
  glassSurfaceStrong: 'rgba(24,22,32,0.05)',
  glassBorder: 'rgba(24,22,32,0.10)',
  glassBorderStrong: 'rgba(24,22,32,0.16)',
  glassSheen: 'rgba(255,255,255,0.70)',

  skeleton: 'rgba(24,22,32,0.08)',
  ringTrack: 'rgba(24,22,32,0.08)',
  shameBorder: 'rgba(176,71,81,0.35)',
  shameSurface: ['rgba(176,71,81,0.09)', 'rgba(176,71,81,0.03)'],

  gradients: {
    ember: ['#CB5B3B', '#B94A2F', '#A03E26'],
    gold: ['#D3B678', '#BE9C51', '#9C7E3B'],
    glassSheen: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.10)'],
    shameRing: ['#C56A73', '#B04751', '#963C45'],
  },

  glowEmber: {
    shadowColor: '#B94A2F',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
};

/** Semantic color names usable on <Text color=…> and friends. */
export type ThemeColorRole =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onAccent'
  | 'ember'
  | 'gold'
  | 'mint'
  | 'blood'
  | 'violet';

export function roleColor(theme: Theme, role: ThemeColorRole): string {
  switch (role) {
    case 'primary': return theme.textPrimary;
    case 'secondary': return theme.textSecondary;
    case 'muted': return theme.textMuted;
    case 'onAccent': return theme.textOnAccent;
    case 'ember': return theme.ember;
    case 'gold': return theme.gold;
    case 'mint': return theme.mint;
    case 'blood': return theme.blood;
    case 'violet': return theme.violet;
  }
}
