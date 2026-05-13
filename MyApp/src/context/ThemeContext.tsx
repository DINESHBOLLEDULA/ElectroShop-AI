import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from '../utils/theme';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: DARK_COLORS,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleTheme = useCallback(() => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({
    mode,
    colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    isDark: mode === 'dark',
    toggleTheme,
  }), [mode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
