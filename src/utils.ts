import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AppearanceConfig, UiButtonStyle, UiCardSize, UiPreferences, UiRadius, UiSidebarWidth } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const inputClasses = "w-full bg-black/5 hover:bg-black/10 focus:bg-white focus:ring-2 focus:ring-zinc-900/20 rounded px-2 py-1 outline-none transition-all placeholder-zinc-400 text-zinc-900 font-semibold";

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  cardSize: 'default',
  densityPreset: 'balanced',
  cardMinHeight: 330,
  variantsPerPage: 3,
  gridColumns: 4,
  gridGap: 16,
  groupsPerPage: 12,
  sidebarWidth: 'default',
  controlRadius: 'xl',
  buttonStyle: 'soft',
  appTitle: '马坤时代',
  appSubtitle: '专注修脚。基于顶级重回修脚时代架构运行。',
  categoryWidgetIndex: 0,
  categoryWidgetSize: 'full',
};

export const radiusClassMap: Record<UiRadius, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export const cardSizeClassMap: Record<UiCardSize, string> = {
  compact: 'p-3 md:p-4',
  default: 'p-4 md:p-5',
  roomy: 'p-5 md:p-6',
};

export const gridGapClassMap: Record<number, string> = {
  12: 'gap-3',
  16: 'gap-4',
  20: 'gap-5',
  24: 'gap-6',
};

export const sidebarWidthClassMap: Record<UiSidebarWidth, { nav: string; main: string }> = {
  compact: {
    nav: 'w-20 lg:w-48',
    main: 'md:ml-20 lg:ml-48',
  },
  default: {
    nav: 'w-20 lg:w-56',
    main: 'md:ml-20 lg:ml-56',
  },
};

export function getButtonClassName(style: UiButtonStyle, tone: 'default' | 'primary' | 'danger' = 'default') {
  const palette = {
    default: {
      soft: 'bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900',
      solid: 'bg-zinc-900 text-white border border-zinc-950 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-zinc-800',
      outline: 'bg-transparent border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800/80',
    },
    primary: {
      soft: 'bg-emerald-500/10 text-emerald-700 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
      solid: 'bg-emerald-500 border border-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:bg-emerald-600',
      outline: 'bg-transparent border border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10',
    },
    danger: {
      soft: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-600',
      solid: 'bg-red-500 text-white border border-red-600 hover:bg-red-600',
      outline: 'bg-transparent border border-red-300 text-red-600 hover:bg-red-50',
    },
  };

  return palette[tone][style];
}

export const DEFAULT_APPEARANCE_CONFIG: AppearanceConfig = {
  siteName: '坤坤改枪码',
  siteDescription: '专注三角洲行动改枪码分享与收藏',
  customHead: '',
  customBody: '',
  faviconUrl: '',
  customEnabled: false,
  backgroundUrl: '',
  backgroundFixed: true,
  blurStrength: 8,
  opacity: 95,
  radius: 12,
  glow: 8,
  gunCardOpacity: 85,
  gunCardColorLight: '#ffffff',
  gunCardColorDark: '#121214',
};

export { buildModelOptionValue, parseModelOptionValue } from '../shared/modelOption';
