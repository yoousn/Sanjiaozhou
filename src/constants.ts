import type {
  CollectMeta,
  CollectModelProviderInput,
  CollectSearchResult,
  UiButtonStyle,
  UiCardSize,
  UiDensityPreset,
  UiPreferences,
  UiRadius,
} from './types';

export const EMPTY_META: CollectMeta = {
  creators: [],
  models: [],
  defaultModel: '',
  defaultGuns: [],
  providers: [],
  modelOptions: [],
  concurrency: {
    searchEnabled: false,
    applyEnabled: false,
  },
};

export const EMPTY_PROVIDER_FORM: CollectModelProviderInput = {
  id: '',
  name: '',
  baseUrl: '',
  apiKey: '',
  models: [],
  selectedModel: '',
};

export const EMPTY_SEARCH: CollectSearchResult = {
  creators: [],
  guns: [],
  creatorIds: [],
  videos: [],
  logs: [],
  errors: [],
  requestId: '',
  isPending: false,
};

export const CARD_SIZE_OPTIONS: Array<{ value: UiCardSize; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'default', label: '默认' },
  { value: 'roomy', label: '宽松' },
];

export const DENSITY_PRESETS: Array<{ label: string; value: UiDensityPreset; preferences: Pick<UiPreferences, 'cardSize' | 'cardMinHeight' | 'variantsPerPage' | 'gridColumns' | 'gridGap'> }> = [
  { label: '紧凑浏览', value: 'compact', preferences: { cardSize: 'compact', cardMinHeight: 300, variantsPerPage: 4, gridColumns: 4, gridGap: 12 } },
  { label: '标准管理', value: 'balanced', preferences: { cardSize: 'default', cardMinHeight: 330, variantsPerPage: 3, gridColumns: 4, gridGap: 16 } },
  { label: '大卡展示', value: 'comfortable', preferences: { cardSize: 'roomy', cardMinHeight: 400, variantsPerPage: 2, gridColumns: 3, gridGap: 24 } },
];

export const CARD_MIN_HEIGHT_OPTIONS: UiPreferences['cardMinHeight'][] = [300, 330, 360, 400];
export const GRID_GAP_OPTIONS: UiPreferences['gridGap'][] = [12, 16, 20, 24];
export const GRID_COLUMNS_OPTIONS: UiPreferences['gridColumns'][] = [3, 4];
export const VARIANTS_PER_PAGE_OPTIONS: UiPreferences['variantsPerPage'][] = [2, 3, 4];

export const RADIUS_OPTIONS: Array<{ value: UiRadius; label: string }> = [
  { value: 'lg', label: 'LG' },
  { value: 'xl', label: 'XL' },
  { value: 'full', label: 'FULL' },
];

export const SIDEBAR_WIDTH_OPTIONS: Array<{ value: UiPreferences['sidebarWidth']; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'default', label: '默认' },
];

export const BUTTON_STYLE_OPTIONS: Array<{ value: UiButtonStyle; label: string }> = [
  { value: 'soft', label: '柔和' },
  { value: 'solid', label: '实心' },
  { value: 'outline', label: '描边' },
];

export function getOptionIndex<T>(options: readonly T[], value: T) {
  const foundIndex = options.findIndex((option) => option === value);
  return foundIndex >= 0 ? foundIndex : 0;
}
