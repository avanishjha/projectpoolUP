import { createContext, useContext, type PropsWithChildren } from 'react';
import { darkTheme, type Theme } from './themes';

const ThemeContext = createContext<Theme>(darkTheme);

export interface ThemeProviderProps extends PropsWithChildren {
  theme: Theme;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
