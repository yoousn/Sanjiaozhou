import React from 'react';
import { Loader2, Search, Save, X } from 'lucide-react';
import { cn, inputClasses } from '../utils';
import type { CollectModelProviderInput } from '../types';

export function CollectProviderModal({
  providerForm,
  isFetchingProviderModels,
  isSavingProvider,
  onProviderFormChange,
  onFetchProviderModels,
  onSaveProvider,
  onDeleteProvider,
  onClose,
}: {
  providerForm: CollectModelProviderInput;
  isFetchingProviderModels: boolean;
  isSavingProvider: boolean;
  onProviderFormChange: React.Dispatch<React.SetStateAction<CollectModelProviderInput>>;
  onFetchProviderModels: () => void;
  onSaveProvider: () => void;
  onDeleteProvider: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-zinc-900">模型源配置</div>
            <div className="mt-1 text-[12px] font-medium text-muted">支持自定义接口、API Key、获取模型列表</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 p-2 text-muted transition-colors hover:bg-zinc-200 hover:text-zinc-900"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted">名称</label>
              <input
                value={providerForm.name}
                onChange={(e) => onProviderFormChange((prev) => ({ ...prev, name: e.target.value }))}
                className={cn(inputClasses,'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                placeholder="我的接口"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted">接口地址</label>
              <input
                value={providerForm.baseUrl}
                onChange={(e) => onProviderFormChange((prev) => ({ ...prev, baseUrl: e.target.value }))}
                className={cn(inputClasses,'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                placeholder="https://api.example.com/v1"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted">API Key</label>
            <input
              value={providerForm.apiKey}
              onChange={(e) => onProviderFormChange((prev) => ({ ...prev, apiKey: e.target.value }))}
              className={cn(inputClasses,'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
              placeholder="sk-..."
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-black text-zinc-900">模型列表</div>
                <div className="mt-1 text-[11px] font-medium text-muted">先获取，再选择默认模型</div>
              </div>
              <button
                type="button"
                onClick={onFetchProviderModels}
                disabled={isFetchingProviderModels || isSavingProvider}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetchingProviderModels ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} strokeWidth={2.5} />}
                获取模型
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <select
                value={providerForm.selectedModel || ''}
                onChange={(e) => onProviderFormChange((prev) => ({ ...prev, selectedModel: e.target.value }))}
                className={cn(inputClasses,'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
              >
                <option value="">请选择模型</option>
                {providerForm.models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 text-[12px] font-medium text-zinc-600">
                {providerForm.models.length > 0 ? providerForm.models.join('\n') : '暂无模型，请先获取'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDeleteProvider}
            disabled={!providerForm.id || isSavingProvider}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[12px] font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 size={14} strokeWidth={2.5} />
            删除模型源
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSaveProvider}
              disabled={isSavingProvider || isFetchingProviderModels}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-[12px] font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProvider ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
              保存模型源
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
