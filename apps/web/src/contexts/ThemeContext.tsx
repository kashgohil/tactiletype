import React, { createContext, useEffect, useState } from 'react';
import type { Theme } from './themes';
import { themes } from './themes';

interface ThemeContextType {
  themeToApply: Theme;
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  previewTheme: Theme | null;
  setPreviewTheme: (theme: Theme | null) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

const relativeLuminance = (hex: string): number => {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
};

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

    // Text placed on a solid accent surface: whichever of text/primary reads better
    const onAccent =
      contrastRatio(themeToApply.accentColor, themeToApply.textColor) >=
      contrastRatio(themeToApply.accentColor, themeToApply.primaryColor)
        ? themeToApply.textColor
        : themeToApply.primaryColor;
    root.style.setProperty('--theme-on-accent', onAccent);

    // Native controls, scrollbars, and form widgets follow the theme's polarity
    root.style.colorScheme =
      relativeLuminance(themeToApply.primaryColor) < 0.4 ? 'dark' : 'light';
  }, [currentTheme, previewTheme]);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('tactile-theme', theme.id);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeToApply: previewTheme || currentTheme,
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
