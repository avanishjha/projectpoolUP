/** Dev-only route for the living style guide. */
import { GalleryScreen } from '../../src/screens/dev/GalleryScreen';
import { useUiStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/ui';

export default function GalleryRoute() {
  const theme = useTheme();
  const setPreference = useUiStore((s) => s.setThemePreference);

  return (
    <GalleryScreen
      onToggleTheme={() => setPreference(theme.scheme === 'dark' ? 'light' : 'dark')}
    />
  );
}
