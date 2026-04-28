import { useState, useEffect } from 'react';
import { UiPreferences } from '../types';
import { DEFAULT_UI_PREFERENCES } from '../utils';

export type CustomTheme = {
  themeColor: string;
  textColorLight: string;
  textColorDark: string;
  gunNameColorLight: string;
  gunNameColorDark: string;
};

const DEFAULT_THEME: CustomTheme = {
  themeColor: '#10b981',
  textColorLight: '#18181b',
  textColorDark: '#f4f4f5',
  gunNameColorLight: '#18181b',
  gunNameColorDark: '#f4f4f5',
};

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [customTheme, setCustomTheme] = useState<CustomTheme>(() => {
    try {
      const saved = localStorage.getItem('customTheme');
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => {
    try {
      const saved = localStorage.getItem('uiPreferences');
      if (!saved) return DEFAULT_UI_PREFERENCES;
      const parsed = JSON.parse(saved) as Partial<UiPreferences>;
      return { ...DEFAULT_UI_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_UI_PREFERENCES;
    }
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
  }, [customTheme]);

  useEffect(() => {
    localStorage.setItem('uiPreferences', JSON.stringify(uiPreferences));
  }, [uiPreferences]);

  const updateUiPreference = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setUiPreferences((prev: UiPreferences) => ({ ...prev, [key]: value }));
  };

  const resetTheme = () => setCustomTheme(DEFAULT_THEME);

  return {
    isDarkMode,
    setIsDarkMode,
    customTheme,
    setCustomTheme,
    uiPreferences,
    setUiPreferences,
    updateUiPreference,
    resetTheme,
    DEFAULT_THEME,
  };
}
