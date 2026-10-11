import type { FaceKey } from './font-files';

export interface FaceMetrics {
  upm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  /** Widest default (proportional) digit advance. */
  digitMax: number;
  /** Widest tabular digit advance, read from the face's GSUB `tnum` substitutions. */
  tnum: number;
  advances: Record<string, number>;
  /** Charset characters this face has no glyph for. */
  missing: string;
}

export interface FontMetrics {
  charset: string;
  faces: Record<FaceKey, FaceMetrics>;
}
