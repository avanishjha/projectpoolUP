/** The canvas and its safe areas (spec §6.1). */
import type { Rect } from './geometry';

export const FRAME = { w: 1920, h: 1080, fps: 30, seconds: 120 } as const;
export const DURATION_FRAMES = FRAME.fps * FRAME.seconds;

/** Authoring bounds: 5%. */
export const TITLE_SAFE: Rect = { x: 96, y: 54, w: 1728, h: 972 };

/** Hard limit after the camera is applied: 3.5%. */
export const ACTION_SAFE: Rect = { x: 67, y: 38, w: 1786, h: 1004 };

/** 12-column grid: 122px columns, 24px gutters, from x 96. */
export const GRID = { left: 96, col: 122, gutter: 24, cols: 12 } as const;

/** Minimum clearance between settled actors, and between actors and captions. */
export const MIN_GAP = 24;
