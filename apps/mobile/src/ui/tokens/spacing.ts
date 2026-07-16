/** 4pt grid. Use tokens, never magic numbers. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 40,
  massive: 56,
} as const;

/** Standard screen edge inset. */
export const screenX = space.lg;

export type SpaceToken = keyof typeof space;
