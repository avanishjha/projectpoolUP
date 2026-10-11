/**
 * The camera (spec §4.5). One {zoom, pan} track; each plane applies it with
 * its own depth, so big moves happen in the background while the foreground
 * stays inside the safe area.
 */
import { easeInOutSine, smootherstep } from '../motion/easing';
import { progress, sampleNumber, type Key } from '../motion/track';
import { FRAME } from '../layout/frame';
import { scaleAbout, type Rect } from '../layout/geometry';
import { CUE } from './cues';

const ZOOM: readonly Key<number>[] = [
  { t: 0, v: 1.0, ease: easeInOutSine },
  { t: 20, v: 1.08, ease: smootherstep },
  { t: 22.4, v: 1.0 },
  { t: 50, v: 1.0, ease: smootherstep },
  { t: 53, v: 1.8 },
  { t: 80, v: 1.8, ease: smootherstep },
  { t: 82.6, v: 1.0 },
  { t: 100, v: 1.0, ease: easeInOutSine },
  { t: 118, v: 1.03 },
];

export interface Camera {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

/** Ambient amplitude: 1 for most of the film, 0 for the poster frame. */
export const ambient = (t: number): number =>
  1 - smootherstep(progress(t, CUE.poster.from, CUE.poster.to));

export const cameraAt = (t: number): Camera => {
  const a = ambient(t);
  return {
    zoom: sampleNumber(ZOOM, t),
    panX: 6 * Math.sin((2 * Math.PI * t) / 11) * a,
    panY: 4 * Math.sin((2 * Math.PI * t) / 13 + 1) * a,
  };
};

export interface Depth {
  readonly zoom: number;
  readonly pan: number;
}

export const DEPTH = {
  bg: { zoom: 1, pan: 1 },
  world: { zoom: 0.03, pan: 0.25 },
  hud: { zoom: 0, pan: 0 },
} as const satisfies Record<string, Depth>;

const effective = (cam: Camera, d: Depth) => ({
  s: 1 + (cam.zoom - 1) * d.zoom,
  dx: cam.panX * d.pan,
  dy: cam.panY * d.pan,
});

/** SVG transform for a plane: zoom about the frame centre, then pan. */
export const planeTransform = (cam: Camera, d: Depth): string => {
  const { s, dx, dy } = effective(cam, d);
  const cx = FRAME.w / 2;
  const cy = FRAME.h / 2;
  return `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`;
};

/** Where a plane-space rect lands on screen. */
export const toScreen = (r: Rect, cam: Camera, d: Depth): Rect => {
  const { s, dx, dy } = effective(cam, d);
  const z = scaleAbout(r, FRAME.w / 2, FRAME.h / 2, s);
  return { ...z, x: z.x + dx, y: z.y + dy };
};
