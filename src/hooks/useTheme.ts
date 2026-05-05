import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppearanceConfig, UiPreferences } from '../types';
import { DEFAULT_UI_PREFERENCES, DEFAULT_APPEARANCE_CONFIG } from '../utils';

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

  const [appearanceConfig, setAppearanceConfig] = useState<AppearanceConfig>(() => {
    try {
      const saved = localStorage.getItem('appearanceConfig');
      if (!saved) return DEFAULT_APPEARANCE_CONFIG;
      const parsed = JSON.parse(saved) as Partial<AppearanceConfig>;
      return { ...DEFAULT_APPEARANCE_CONFIG, ...parsed };
    } catch {
      return DEFAULT_APPEARANCE_CONFIG;
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

  useEffect(() => {
    localStorage.setItem('appearanceConfig', JSON.stringify(appearanceConfig));
  }, [appearanceConfig]);

  const updateUiPreference = useCallback(<K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setUiPreferences((prev: UiPreferences) => ({ ...prev, [key]: value }));
  }, []);

  const updateAppearance = useCallback(<K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => {
    setAppearanceConfig((prev: AppearanceConfig) => ({ ...prev, [key]: value }));
  }, []);

  const resetTheme = useCallback(() => setCustomTheme(DEFAULT_THEME), []);
  const resetAppearance = useCallback(() => setAppearanceConfig(DEFAULT_APPEARANCE_CONFIG), []);

  return useMemo(() => ({
    isDarkMode,
    setIsDarkMode,
    customTheme,
    setCustomTheme,
    uiPreferences,
    setUiPreferences,
    updateUiPreference,
    resetTheme,
    DEFAULT_THEME,
    appearanceConfig,
    setAppearanceConfig,
    updateAppearance,
    resetAppearance,
  }), [isDarkMode, customTheme, uiPreferences, appearanceConfig, updateUiPreference, resetTheme, updateAppearance, resetAppearance]);
}
