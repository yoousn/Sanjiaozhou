import React from 'react';
import { Loader2, Settings2, Save, Search, X } from 'lucide-react';
import { cn, inputClasses } from '../utils';
import type { CollectMeta } from '../types';

export function CollectSearchPanel({
  meta,
  presetGunInput,
  isSavingPresetGuns,
  selectedGuns,
  selectedCreatorIds,
  maxVideos,
  searchConcurrencyEnabled,
  applyConcurrencyEnabled,
  disabled,
  isSearching,
  onToggleGun,
  onToggleCreator,
  onPresetGunInputChange,
  onSavePresetGuns,
  onMaxVideosChange,
  onSearchConcurrencyChange,
  onApplyConcurrencyChange,
  onSearch,
  onCancelSearch,
}: {
  meta: CollectMeta;
  presetGunInput: string;
  isSavingPresetGuns: boolean;
  selectedGuns: string[];
  selectedCreatorIds: string[];
  maxVideos: number;
  searchConcurrencyEnabled: boolean;
  applyConcurrencyEnabled: boolean;
  disabled: boolean;
  isSearching: boolean;
  onToggleGun: (gun: string) => void;
  onToggleCreator: (creatorId: string) => void;
  onPresetGunInputChange: (value: string) => void;
  onSavePresetGuns: () => void;
  onMaxVideosChange: (value: number) => void;
  onSearchConcurrencyChange: (value: boolean) => void;
  onApplyConcurrencyChange: (value: boolean) => void;
  onSearch: () => void;
  onCancelSearch: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">目标枪械过滤 (可选)</label>
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold text-zinc-600">
            已选择 {selectedGuns.length} 个
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.defaultGuns.map((gun) => {
            const active = selectedGuns.includes(gun);
            return (
              <button
                key={gun}
                type="button"
                onClick={() => onToggleGun(gun)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] font-bold transition',
                  active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                )}
              >
                {gun}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-zinc-900">
          <Settings2 size={14} strokeWidth={2.5} />
          <div className="text-[12px] font-black">编辑预设枪械</div>
        </div>
        <textarea
          value={presetGunInput}
          onChange={(e) => onPresetGunInputChange(e.target.value)}
          placeholder="M4A1, AKM, SCAR-L"
          rows={4}
          className={cn(inputClasses, 'resize-none border border-zinc-200 bg-white py-3 text-sm font-bold shadow-sm')}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-zinc-400">逗号、空格、换行都能分隔</p>
          <button
            type="button"
            onClick={onSavePresetGuns}
            disabled={isSavingPresetGuns || disabled}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingPresetGuns ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
            保存预设
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">选择博主</label>
        <div className="space-y-2">
          {meta.creators.map((creator) => {
            const active = selectedCreatorIds.includes(creator.id);
            return (
              <button
                key={creator.id}
                type="button"
                onClick={() => onToggleCreator(creator.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition',
                  active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                )}
              >
                <span className="text-[13px] font-bold">{creator.name}</span>
                <span className={cn('h-4 w-4 rounded border', active ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300 bg-white')} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-zinc-500">主页抓取数量</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="100"
            value={maxVideos}
            onChange={(e) => onMaxVideosChange(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[13px] font-black text-zinc-700 w-10 text-right">{maxVideos} 条</span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">模式</div>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-[12px] font-bold text-zinc-700">
            <span>搜索多线程模式</span>
            <input
              type="checkbox"
              checked={searchConcurrencyEnabled}
              onChange={(e) => onSearchConcurrencyChange(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-[12px] font-bold text-zinc-700">
            <span>加入多线程模式</span>
            <input
              type="checkbox"
              checked={applyConcurrencyEnabled}
              onChange={(e) => onApplyConcurrencyChange(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
            />
          </label>
        </div>
      </div>

      {isSearching ? (
        <button
          type="button"
          onClick={onCancelSearch}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-600 bg-red-500 px-4 py-3 text-[13px] font-black text-white shadow-[0_8px_24px_rgba(239,68,68,0.18)] transition hover:bg-red-600"
        >
          <X size={16} strokeWidth={2.5} />
          取消搜索
        </button>
      ) : (
        <button
          type="button"
          onClick={onSearch}
          disabled={disabled || selectedCreatorIds.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600 bg-emerald-500 px-4 py-3 text-[13px] font-black text-white shadow-[0_8px_24px_rgba(16,185,129,0.18)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={16} strokeWidth={2.5} />
          搜索命中视频
        </button>
      )}
    </div>
  );
}
