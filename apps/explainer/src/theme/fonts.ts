/**
 * Remotion font loading. @remotion/fonts delays the render until each face
 * is ready, so no frame is ever captured with a fallback font.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import { FONT_FILES } from './font-files';

export const loadFilmFonts = (): Promise<unknown> =>
  Promise.all(
    FONT_FILES.map((f) =>
      loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), weight: String(f.weight) }),
    ),
  );
