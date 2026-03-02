import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'pink' | 'blue' | 'purple' | 'green';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

const themes: Record<Theme, ThemeColors> = {
  light: {
    primary: '#4ADE80',
    secondary: '#22C55E',
    background: '#FFFFFF',
    text: '#1F2937',
    accent: '#FCD34D',
  },
  dark: {
    primary: '#22C55E',
    secondary: '#16A34A',
    background: '#1F2937',
    text: '#F9FAFB',
    accent: '#FBBF24',
  },
  pink: {
    primary: '#F472B6',
    secondary: '#EC4899',
    background: '#FFF1F2',
    text: '#831843',
    accent: '#F9A8D4',
  },
  blue: {
    primary: '#60A5FA',
    secondary: '#3B82F6',
    background: '#EFF6FF',
    text: '#1E3A8A',
    accent: '#93C5FD',
  },
  purple: {
    primary: '#A78BFA',
    secondary: '#8B5CF6',
    background: '#FAF5FF',
    text: '#4C1D95',
    accent: '#C4B5FD',
  },
  green: {
    primary: '#4ADE80',
    secondary: '#22C55E',
    background: '#F0FDF4',
    text: '#14532D',
    accent: '#86EFAC',
  },
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_theme');
      if (saved && themes[saved as Theme]) {
        setTheme(saved as Theme);
      }
    } catch (e) {
      console.warn('Failed to load theme:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_theme', theme);
      // Apply theme to document
      const colors = themes[theme];
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--secondary', colors.secondary);
      document.documentElement.style.setProperty('--bg', colors.background);
      document.documentElement.style.setProperty('--text', colors.text);
      document.documentElement.style.setProperty('--accent', colors.accent);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  }, [theme]);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return {
    theme,
    changeTheme,
    colors: themes[theme],
    availableThemes: Object.keys(themes) as Theme[],
  };
}
