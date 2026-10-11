/**
 * The only way text reaches the screen. `maxW` is required: every string in
 * the film declares the box it must fit, and test/text.test.ts holds it to
 * that using the real font metrics. Positioned by baseline (SVG native).
 */
import type { CSSProperties, ReactNode } from 'react';
import type { FaceKey } from '../theme/font-files';
import { color as palette } from '../theme/tokens';
import { familyOf, moneyTracking, TYPE, weightOf, type Role } from '../theme/type';
import { useContentScale } from './ScaleContext';

export interface LabelProps {
  readonly x: number;
  readonly y: number;
  readonly children: string;
  readonly maxW: number;
  readonly role?: Role;
  readonly face?: FaceKey;
  readonly size?: number;
  /** em */
  readonly tracking?: number;
  readonly color?: string;
  readonly opacity?: number;
  readonly anchor?: 'start' | 'middle' | 'end';
  readonly tnum?: boolean;
  /** Part of a glyph-like mark (avatar initials), not content. Gets a lower size floor. */
  readonly decorative?: boolean;
  /** Trailing run in another colour ("228" + "/240"), flowed by the browser. */
  readonly suffix?: { readonly text: string; readonly color: string };
}

export interface ResolvedType {
  readonly face: FaceKey;
  readonly size: number;
  readonly tracking: number;
  readonly tnum: boolean;
}

export const resolveType = (p: Pick<LabelProps, 'role' | 'face' | 'size' | 'tracking' | 'tnum'>): ResolvedType => {
  const spec = TYPE[p.role ?? 'ui'];
  const size = p.size ?? spec.size;
  const defaultTracking = p.role === 'money' ? moneyTracking(size) : spec.tracking;
  return {
    face: p.face ?? spec.face,
    size,
    tracking: p.tracking ?? defaultTracking,
    tnum: p.tnum ?? spec.tnum ?? false,
  };
};

export const textStyle = (tnum: boolean): CSSProperties => ({
  whiteSpace: 'pre',
  ...(tnum ? { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' } : {}),
});

/** Shared <text> attributes, including the data-* contract the tests read. */
export const textAttrs = (r: ResolvedType, maxW: number, scale: number, decorative = false) => ({
  fontFamily: familyOf(r.face),
  fontWeight: weightOf(r.face),
  fontSize: r.size,
  letterSpacing: r.tracking * r.size,
  style: textStyle(r.tnum),
  'data-face': r.face,
  'data-size': r.size,
  'data-ls': r.tracking,
  'data-tnum': r.tnum ? 1 : 0,
  'data-max-w': Math.round(maxW * 100) / 100,
  'data-scale': Math.round(scale * 1000) / 1000,
  'data-decorative': decorative ? 1 : 0,
});

export const Label = ({
  x,
  y,
  children,
  maxW,
  color = palette.ink,
  opacity,
  anchor = 'start',
  suffix,
  decorative = false,
  ...type
}: LabelProps): ReactNode => {
  const scale = useContentScale();
  const r = resolveType(type);
  return (
    <text x={x} y={y} fill={color} opacity={opacity} textAnchor={anchor} {...textAttrs(r, maxW, scale, decorative)}>
      {children}
      {suffix && <tspan fill={suffix.color}>{suffix.text}</tspan>}
    </text>
  );
};
