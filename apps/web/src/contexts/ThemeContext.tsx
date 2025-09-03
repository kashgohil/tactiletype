import React, { createContext, useEffect, useState } from 'react';
import type { Theme } from './themes';
import { themes } from './themes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  previewTheme: Theme | null;
  setPreviewTheme: (theme: Theme | null) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('tactile-theme');
    if (savedThemeId) {
      const savedTheme = themes.find((theme) => theme.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const themeToApply = previewTheme || currentTheme;
    const root = document.documentElement;

    root.style.setProperty('--theme-text', themeToApply.textColor);
    root.style.setProperty('--theme-accent', themeToApply.accentColor);
    root.style.setProperty('--theme-primary', themeToApply.primaryColor);
  }, [currentTheme, previewTheme]);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('tactile-theme', theme.id);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        previewTheme,
        setPreviewTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
