/**
 * CONQR typography — Space Grotesk for display & money (technical, confident,
 * slightly aggressive), Inter for UI text (quiet, legible at small sizes).
 * Money always uses tabular numerals so tickers never jitter.
 */
import type { TextStyle } from 'react-native';

export const fonts = {
  displayBold: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  text: 'Inter_400Regular',
  textMedium: 'Inter_500Medium',
  textSemiBold: 'Inter_600SemiBold',
  textBold: 'Inter_700Bold',
} as const;

export const type = {
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  title1: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.6,
  },
  title2: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: fonts.textSemiBold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: fonts.textMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  footnote: {
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.textSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  moneyLg: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as const,
  },
  money: {
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'] as const,
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
