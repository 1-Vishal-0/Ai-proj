import React, { useEffect } from 'react';
import { ThemeContext } from '../../hooks/useTheme';

const THEME_STORAGE_KEY = 'academic_portal_theme';
const noop = () => undefined;

/**
 * The enterprise redesign ships a single light theme. The provider keeps the
 * existing context contract so consumers stay stable, and clears any dark
 * preference persisted by earlier builds.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: 'light', setTheme: noop, toggleTheme: noop }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
