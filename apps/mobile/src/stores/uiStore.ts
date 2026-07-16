/** App-wide UI state (theme preference). Server state lives in React Query, never here. */
import { create } from 'zustand';

export type ThemePreference = 'system' | 'dark' | 'light';

interface UiState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  setThemePreference: (themePreference) => set({ themePreference }),
}));
