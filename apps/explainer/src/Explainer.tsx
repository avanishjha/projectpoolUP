/**
 * Remotion adapter: the only place that knows about frames. It converts the
 * frame number to seconds and hands it to the pure Film.
 */
import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Film } from './film/Film';
import { color } from './theme/tokens';

export const Explainer = (): ReactNode => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: color.canvas }}>
      <Film t={frame / fps} />
    </AbsoluteFill>
  );
};
