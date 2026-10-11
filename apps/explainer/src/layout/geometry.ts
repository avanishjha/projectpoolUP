/** Rect math for layout and the layout tests. Screen px, y down. */
import { lerp } from '../motion/track';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A settled surface: rect + corner radius + rotation (deg, about centre). */
export interface Placement extends Rect {
  readonly r: number;
  readonly rot: number;
}

export const center = (r: Rect): { cx: number; cy: number } => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 });

export const lerpPlacement = (a: Placement, b: Placement, u: number): Placement => ({
  x: lerp(a.x, b.x, u),
  y: lerp(a.y, b.y, u),
  w: lerp(a.w, b.w, u),
  h: lerp(a.h, b.h, u),
  r: lerp(a.r, b.r, u),
  rot: lerp(a.rot, b.rot, u),
});

/** Axis-aligned bounds of a rect rotated about its centre. */
export const rotatedBounds = (p: Placement): Rect => {
  const rad = (p.rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const hw = (p.w / 2) * c + (p.h / 2) * s;
  const hh = (p.w / 2) * s + (p.h / 2) * c;
  const { cx, cy } = center(p);
  return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 };
};

/** True when a and b are closer than `gap` (or overlap). */
export const tooClose = (a: Rect, b: Rect, gap = 0): boolean =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

export const contains = (outer: Rect, inner: Rect, eps = 0.01): boolean =>
  inner.x >= outer.x - eps &&
  inner.y >= outer.y - eps &&
  inner.x + inner.w <= outer.x + outer.w + eps &&
  inner.y + inner.h <= outer.y + outer.h + eps;

/** Scale a rect about a point (camera zoom). */
export const scaleAbout = (r: Rect, px: number, py: number, s: number): Rect => ({
  x: px + (r.x - px) * s,
  y: py + (r.y - py) * s,
  w: r.w * s,
  h: r.h * s,
});

/** SVG path for a rounded rect. Continuous in every parameter, so it morphs. */
export const roundedRectPath = (x: number, y: number, w: number, h: number, r: number): string => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M${x + rr},${y}`,
    `H${x + w - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w},${y + rr}`,
    `V${y + h - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}`,
    `H${x + rr}`,
    `A${rr},${rr} 0 0 1 ${x},${y + h - rr}`,
    `V${y + rr}`,
    `A${rr},${rr} 0 0 1 ${x + rr},${y}`,
    'Z',
  ].join(' ');
};

/** Just the top edge of a rounded rect (corner arcs + top line) — the "light-catching" edge. */
export const topEdgePath = (x: number, y: number, w: number, h: number, r: number): string => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x},${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr}`;
};
