import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, RotateCcw } from 'lucide-react';
import { cn } from '../utils';
import {
  UiPreferences,
  UiCardSize,
  UiRadius,
  UiButtonStyle,
  UiSidebarWidth,
} from '../types';
import {
  CARD_SIZE_OPTIONS,
  SIDEBAR_WIDTH_OPTIONS,
  RADIUS_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  DENSITY_PRESETS,
} from '../constants';

type NumFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
};

function NumField({ label, value, min, max, step = 1, suffix, onChange }: NumFieldProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (Number.isFinite(raw)) onChange(clamp(Math.round(raw / step) * step));
  };
  return (
    <div className="flex flex-col gap-1">
      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="shrink-0 h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 font-black text-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition outline-none"
          aria-label={`${label} 减少`}
        >−</button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          className="flex-1 min-w-0 h-8 px-2 text-center text-[13px] font-black text-zinc-900 dark:text-white bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900/15"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="shrink-0 h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 font-black text-sm hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition outline-none"
          aria-label={`${label} 增加`}
        >+</button>
        {suffix && <span className="text-[11px] font-bold text-zinc-400 w-6 text-right">{suffix}</span>}
      </div>
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
};

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="inline-flex h-8 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 px-2 text-[11px] font-bold rounded-[6px] transition whitespace-nowrap',
                active
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
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
  const [expanded, setExpanded] = useState(false);

  const panelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 overflow-hidden',
    uiPreferences.controlRadius === 'full' ? 'rounded-3xl' : 'rounded-2xl'
  );

  const applyDensityPreset = (preset: typeof DENSITY_PRESETS[number]) => {
    updateUiPreference('densityPreset', preset.value);
    updateUiPreference('cardSize', preset.preferences.cardSize);
    updateUiPreference('cardMinHeight', preset.preferences.cardMinHeight);
    updateUiPreference('variantsPerPage', preset.preferences.variantsPerPage);
    updateUiPreference('gridColumns', preset.preferences.gridColumns);
    updateUiPreference('gridGap', preset.preferences.gridGap);
  };

  return (
    <div className={panelClass}>
      {/* 折叠头部：始终可见，紧凑展示密度预设与展开按钮 */}
      <div className="flex items-center gap-3 px-4 py-3 md:px-5">
        <div className="flex items-center gap-2 shrink-0">
          <Sliders size={14} className="text-zinc-500" strokeWidth={2.5} />
          <span className="text-[13px] font-black text-zinc-900 dark:text-white">界面自定义</span>
        </div>
        <div className="flex-1 flex flex-wrap items-center gap-1.5 justify-end">
          {DENSITY_PRESETS.map((preset) => {
            const active = uiPreferences.densityPreset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyDensityPreset(preset)}
                title={`${preset.preferences.gridColumns}列 · ${preset.preferences.variantsPerPage}条/卡 · ${preset.preferences.gridGap}px`}
                className={cn(
                  'px-2.5 h-7 rounded-lg text-[11px] font-bold transition border',
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-300'
                )}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={resetUiPreferences}
            title="恢复默认"
            className="ml-1 h-7 w-7 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 dark:hover:text-white transition"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="ml-1 h-7 px-2.5 inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 transition"
          >
            {expanded ? <><ChevronUp size={12} strokeWidth={2.5} />收起</> : <><ChevronDown size={12} strokeWidth={2.5} />更多</>}
          </button>
        </div>
      </div>

      {/* 展开区：高度自定义数值 + 样式切换 */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-4 md:px-5 md:py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
            <NumField
              label="桌面列数"
              value={uiPreferences.gridColumns}
              min={1}
              max={8}
              onChange={(v) => updateUiPreference('gridColumns', v)}
            />
            <NumField
              label="每页卡片数"
              value={uiPreferences.groupsPerPage}
              min={1}
              max={100}
              onChange={(v) => updateUiPreference('groupsPerPage', v)}
            />
            <NumField
              label="每卡配置条数"
              value={uiPreferences.variantsPerPage}
              min={1}
              max={20}
              onChange={(v) => updateUiPreference('variantsPerPage', v)}
            />
            <NumField
              label="卡片间距"
              value={uiPreferences.gridGap}
              min={0}
              max={48}
              suffix="px"
              onChange={(v) => updateUiPreference('gridGap', v)}
            />
            <NumField
              label="卡片最小高度"
              value={uiPreferences.cardMinHeight}
              min={200}
              max={800}
              step={10}
              suffix="px"
              onChange={(v) => updateUiPreference('cardMinHeight', v)}
            />
            <Segmented
              label="卡片尺寸"
              value={uiPreferences.cardSize}
              options={CARD_SIZE_OPTIONS}
              onChange={(v) => updateUiPreference('cardSize', v as UiCardSize)}
            />
            <Segmented
              label="控件圆角"
              value={uiPreferences.controlRadius}
              options={RADIUS_OPTIONS}
              onChange={(v) => updateUiPreference('controlRadius', v as UiRadius)}
            />
            <Segmented
              label="按钮样式"
              value={uiPreferences.buttonStyle}
              options={BUTTON_STYLE_OPTIONS}
              onChange={(v) => updateUiPreference('buttonStyle', v as UiButtonStyle)}
            />
            <Segmented
              label="侧栏宽度"
              value={uiPreferences.sidebarWidth}
              options={SIDEBAR_WIDTH_OPTIONS}
              onChange={(v) => updateUiPreference('sidebarWidth', v as UiSidebarWidth)}
            />
          </div>
          <p className="mt-3 text-[11px] text-zinc-400">所有数值均可手动输入或加减，按"取消"会回滚本次编辑期间的全部界面设置。</p>
        </div>
      )}
    </div>
  );
}
