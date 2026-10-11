import type { ReactNode } from 'react';
import { Composition } from 'remotion';
import { Explainer } from './Explainer';
import { DURATION_FRAMES, FRAME } from './layout/frame';
import { loadFilmFonts } from './theme/fonts';

// Blocks every render until all seven faces are loaded (delayRender inside).
void loadFilmFonts();

export const RemotionRoot = (): ReactNode => (
  <Composition
    id="ConqrExplainer"
    component={Explainer}
    durationInFrames={DURATION_FRAMES}
    fps={FRAME.fps}
    width={FRAME.w}
    height={FRAME.h}
  />
);
