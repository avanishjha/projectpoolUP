/**
 * The exact TTFs the mobile app ships (@expo-google-fonts). One list feeds
 * the Remotion loader, the copy script, the metrics generator and the
 * text-fit tests, so the film is measured with the font it is rendered in.
 */
export type FaceKey =
  | 'Inter-400'
  | 'Inter-500'
  | 'Inter-600'
  | 'Inter-700'
  | 'SpaceGrotesk-500'
  | 'SpaceGrotesk-600'
  | 'SpaceGrotesk-700';

export interface FontFile {
  face: FaceKey;
  family: 'Inter' | 'Space Grotesk';
  weight: 400 | 500 | 600 | 700;
  pkg: '@expo-google-fonts/inter' | '@expo-google-fonts/space-grotesk';
  /** Path inside the package. */
  path: string;
  /** File name under public/fonts. */
  file: string;
}

const inter = (weight: 400 | 500 | 600 | 700, name: string): FontFile => ({
  face: `Inter-${weight}`,
  family: 'Inter',
  weight,
  pkg: '@expo-google-fonts/inter',
  path: `${weight}${name}/Inter_${weight}${name}.ttf`,
  file: `Inter_${weight}${name}.ttf`,
});

const grotesk = (weight: 500 | 600 | 700, name: string): FontFile => ({
  face: `SpaceGrotesk-${weight}` as FaceKey,
  family: 'Space Grotesk',
  weight,
  pkg: '@expo-google-fonts/space-grotesk',
  path: `${weight}${name}/SpaceGrotesk_${weight}${name}.ttf`,
  file: `SpaceGrotesk_${weight}${name}.ttf`,
});

export const FONT_FILES: readonly FontFile[] = [
  inter(400, 'Regular'),
  inter(500, 'Medium'),
  inter(600, 'SemiBold'),
  inter(700, 'Bold'),
  grotesk(500, 'Medium'),
  grotesk(600, 'SemiBold'),
  grotesk(700, 'Bold'),
];

export const fontFileFor = (face: FaceKey): FontFile => {
  const f = FONT_FILES.find((x) => x.face === face);
  if (!f) throw new Error(`Unknown face ${face}`);
  return f;
};
