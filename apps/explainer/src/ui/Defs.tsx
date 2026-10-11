/** Shared SVG filters (spec §2.2 shadows, §2.1 restrained primary glow). */
import type { ReactNode } from 'react';

/**
 * Filters run in sRGB. The default (linearRGB) round-trips through 8-bit
 * linear space, which crushes dark fills: #06080D came out as #000D0D.
 */
const region = { x: '-25%', y: '-25%', width: '150%', height: '170%', colorInterpolationFilters: 'sRGB' } as const;

export const FILTER = {
  card: 'url(#shadow-card)',
  hero: 'url(#shadow-hero)',
  glow: 'url(#glow)',
  soft: 'url(#soft)',
} as const;

export const Defs = (): ReactNode => (
  <defs>
    <filter id="shadow-card" {...region}>
      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
    </filter>
    <filter id="shadow-hero" {...region}>
      <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000" floodOpacity="0.55" />
    </filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>
);
