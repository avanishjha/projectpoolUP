/** Generous, continuous curves — nothing sharp, nothing fully round by accident. */
export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
