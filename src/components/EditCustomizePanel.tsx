import React from 'react';
import { cn } from '../utils';
import {
  UiPreferences,
  UiCardSize,
  UiRadius,
  UiButtonStyle,
  UiSidebarWidth,
} from '../types';
import {
  getOptionIndex,
  CARD_SIZE_OPTIONS,
  CARD_MIN_HEIGHT_OPTIONS,
  VARIANTS_PER_PAGE_OPTIONS,
  GRID_COLUMNS_OPTIONS,
  GRID_GAP_OPTIONS,
  GROUPS_PER_PAGE_OPTIONS,
  SIDEBAR_WIDTH_OPTIONS,
  RADIUS_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  DENSITY_PRESETS,
} from '../constants';

type SliderFieldProps = {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  value: number;
  onChange: (nextIndex: number) => void;
};

function SliderField({ label, valueLabel, min, max, value, onChange }: SliderFieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{label}</label>
        <span className="text-[12px] font-black text-zinc-900 dark:text-white">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-zinc-900 dark:accent-white"
      />
    </div>
  );
}

export type EditCustomizePanelProps = {
  uiPreferences: UiPreferences;
  updateUiPreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  resetUiPreferences: () => void;
};

export function EditCustomizePanel({
  uiPreferences,
  updateUiPreference,
  resetUiPreferences,
}: EditCustomizePanelProps) {
  const settingsPanelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm mb-4',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );
  const settingsSelectClass = cn(
    'w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 text-[13px] font-bold shadow-sm outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10',
    uiPreferences.controlRadius === 'full' ? 'rounded-full' : uiPreferences.controlRadius === 'xl' ? 'rounded-xl' : 'rounded-lg'
  );

  const cardSizeIndex = getOptionIndex(CARD_SIZE_OPTIONS.map((o) => o.value), uiPreferences.cardSize);
  const cardMinHeightIndex = getOptionIndex(CARD_MIN_HEIGHT_OPTIONS, uiPreferences.cardMinHeight);
  const gridGapIndex = getOptionIndex(GRID_GAP_OPTIONS, uiPreferences.gridGap);
  const radiusIndex = getOptionIndex(RADIUS_OPTIONS.map((o) => o.value), uiPreferences.controlRadius);

  const applyDensityPreset = (preset: typeof DENSITY_PRESETS[number]) => {
    updateUiPreference('densityPreset', preset.value);
    updateUiPreference('cardSize', preset.preferences.cardSize);
    updateUiPreference('cardMinHeight', preset.preferences.cardMinHeight);
    updateUiPreference('variantsPerPage', preset.preferences.variantsPerPage);
    updateUiPreference('gridColumns', preset.preferences.gridColumns);
    updateUiPreference('gridGap', preset.preferences.gridGap);
  };

  return (
    <div className={settingsPanelClass}>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[15px] font-black text-zinc-900 dark:text-white">界面自定义</h3>
          <p className="text-[13px] text-zinc-500">编辑模式下直接调整卡片大小、列数、间距、圆角和按钮样式，刷新后会自动保留。</p>
        </div>
        <button onClick={resetUiPreferences} className="text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">恢复默认 UI 设置</button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {DENSITY_PRESETS.map((preset) => {
          const active = uiPreferences.densityPreset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyDensityPreset(preset)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition',
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-400'
              )}
            >
              <div className="text-[12px] font-black">{preset.label}</div>
              <div className="mt-0.5 text-[10px] font-bold opacity-70">{preset.preferences.gridColumns}列 / {preset.preferences.variantsPerPage}条 / {preset.preferences.gridGap}px</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SliderField
          label="卡片尺寸"
          valueLabel={CARD_SIZE_OPTIONS[cardSizeIndex].label}
          min={0}
          max={CARD_SIZE_OPTIONS.length - 1}
          value={cardSizeIndex}
          onChange={(nextIndex) => updateUiPreference('cardSize', CARD_SIZE_OPTIONS[nextIndex].value as UiCardSize)}
        />
        <SliderField
          label="卡片最小高度"
          valueLabel={`${CARD_MIN_HEIGHT_OPTIONS[cardMinHeightIndex]} px`}
          min={0}
          max={CARD_MIN_HEIGHT_OPTIONS.length - 1}
          value={cardMinHeightIndex}
          onChange={(nextIndex) => updateUiPreference('cardMinHeight', CARD_MIN_HEIGHT_OPTIONS[nextIndex])}
        />
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">每张卡片显示配置数</label>
          <select value={uiPreferences.variantsPerPage} onChange={(e) => updateUiPreference('variantsPerPage', Number(e.target.value) as 2 | 3 | 4)} className={settingsSelectClass}>
            {VARIANTS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">桌面列数</label>
          <select value={uiPreferences.gridColumns} onChange={(e) => updateUiPreference('gridColumns', Number(e.target.value) as 3 | 4)} className={settingsSelectClass}>
            {GRID_COLUMNS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} 列</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">每页卡片数</label>
          <select value={uiPreferences.groupsPerPage} onChange={(e) => updateUiPreference('groupsPerPage', Number(e.target.value) as 8 | 12 | 16 | 20 | 24)} className={settingsSelectClass}>
            {GROUPS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} 张</option>
            ))}
          </select>
        </div>
        <SliderField
          label="卡片间距"
          valueLabel={`${GRID_GAP_OPTIONS[gridGapIndex]} px`}
          min={0}
          max={GRID_GAP_OPTIONS.length - 1}
          value={gridGapIndex}
          onChange={(nextIndex) => updateUiPreference('gridGap', GRID_GAP_OPTIONS[nextIndex])}
        />
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">侧栏宽度</label>
          <select value={uiPreferences.sidebarWidth} onChange={(e) => updateUiPreference('sidebarWidth', e.target.value as UiSidebarWidth)} className={settingsSelectClass}>
            {SIDEBAR_WIDTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <SliderField
          label="控件圆角"
          valueLabel={RADIUS_OPTIONS[radiusIndex].label}
          min={0}
          max={RADIUS_OPTIONS.length - 1}
          value={radiusIndex}
          onChange={(nextIndex) => updateUiPreference('controlRadius', RADIUS_OPTIONS[nextIndex].value as UiRadius)}
        />
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">按钮样式</label>
          <select value={uiPreferences.buttonStyle} onChange={(e) => updateUiPreference('buttonStyle', e.target.value as UiButtonStyle)} className={settingsSelectClass}>
            {BUTTON_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
