/**
 * Colour mixing in OKLab (Björn Ottosson, 2020): linear sRGB → LMS → cube
 * root → Lab. Mid-points stay perceptually even instead of going grey.
 */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const parseColor = (c: string): RGBA => {
  const s = c.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
    const n = parseInt(full.slice(0, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (!m) throw new Error(`Unparseable colour: ${c}`);
  const parts = m[1]!.split(',').map((x) => parseFloat(x));
  return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts[3] ?? 1 };
};

const toLinear = (v: number): number => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (x: number): number => {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
};

export const toOklab = ({ r, g, b }: RGBA): [number, number, number] => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

export const fromOklab = ([L, A, B]: [number, number, number], a = 1): RGBA => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a,
  };
};

export const formatRgba = ({ r, g, b, a }: RGBA): string =>
  `rgba(${r},${g},${b},${Math.round(a * 1000) / 1000})`;

/** Perceptual mix of two colours; alpha interpolates linearly. */
export const mixColor = (a: string, b: string, u: number): string => {
  if (u <= 0) return formatRgba(parseColor(a));
  if (u >= 1) return formatRgba(parseColor(b));
  const ca = parseColor(a);
  const cb = parseColor(b);
  const la = toOklab(ca);
  const lb = toOklab(cb);
  const mixed: [number, number, number] = [
    la[0] + (lb[0] - la[0]) * u,
    la[1] + (lb[1] - la[1]) * u,
    la[2] + (lb[2] - la[2]) * u,
  ];
  return formatRgba(fromOklab(mixed, ca.a + (cb.a - ca.a) * u));
};

/** The same colour at a new alpha. */
export const withAlpha = (c: string, a: number): string => formatRgba({ ...parseColor(c), a });
