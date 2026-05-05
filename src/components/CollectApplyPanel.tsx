import React from 'react';
import { Loader2, Sparkles, Radio, Cpu, TestTube2, Plus } from 'lucide-react';
import { cn, inputClasses } from '../utils';
import type { CollectMeta, CollectPreview, ModelTestResult, CollectVideoCandidate } from '../types';

export function CollectApplyPanel({
  meta,
  preview,
  modelTestResult,
  selectedModel,
  selectedProviderId,
  selectedVideos,
  isSearching,
  isPreviewing,
  isTestingModel,
  isApplying,
  onSelectedModelChange,
  onSelectedProviderIdChange,
  onTestModel,
  onApply,
  onOpenProviderModal,
}: {
  meta: CollectMeta;
  preview: CollectPreview | null;
  modelTestResult: ModelTestResult | null;
  selectedModel: string;
  selectedProviderId: string;
  selectedVideos: CollectVideoCandidate[];
  isSearching: boolean;
  isPreviewing: boolean;
  isTestingModel: boolean;
  isApplying: boolean;
  onSelectedModelChange: (model: string) => void;
  onSelectedProviderIdChange: (providerId: string) => void;
  onTestModel: (model: string) => void;
  onApply: () => void;
  onOpenProviderModal: () => void;
}) {
  const providerOptions = meta.providers;
  const modelOptions = meta.modelOptions.filter((option) => option.providerId === selectedProviderId);
  const hasPreviewGroups = (preview?.groups?.length || 0) > 0;
  const hasPreviewErrors = Boolean(preview?.errors && preview.errors.length > 0);
  const busy = isSearching || isPreviewing || isApplying || isTestingModel;
  const canApply = !isPreviewing && !isSearching && !isApplying && selectedModel && selectedVideos.length > 0;

  const handleProviderChange = (providerId: string) => {
    onSelectedProviderIdChange(providerId);
    const nextOption = meta.modelOptions.find((option) => option.providerId === providerId);
    onSelectedModelChange(nextOption?.value || '');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted">采集模型</div>
            <div className="mt-1 text-[12px] font-medium text-muted">先选模型源，再选模型；测试模型不会写入网站</div>
          </div>
          <button
            type="button"
            onClick={onOpenProviderModal}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} strokeWidth={2.5} />
            添加模型
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <select
            value={selectedProviderId}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={cn(inputClasses,'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
          >
            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>

          <div className="relative">
            <Cpu size={14} strokeWidth={2.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectedModelChange(e.target.value)}
              className={cn(inputClasses,'w-full border border-zinc-200 bg-white py-2 pl-9 pr-8 text-[13px] font-bold shadow-sm')}
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.model}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => onTestModel(selectedModel)}
            disabled={!selectedModel || busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTestingModel ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} strokeWidth={2.5} />}
            测试模型
          </button>
        </div>

        {modelTestResult && (
          <div className={cn('mt-4 rounded-2xl border px-4 py-3 text-[12px] font-medium',
            modelTestResult.success ?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-red-200 bg-red-50 text-red-700')}>
            <div>结果：{modelTestResult.success ? '成功' : '失败'} · 延迟：{modelTestResult.latencyMs} ms</div>
            {modelTestResult.error && <div className="mt-1">错误：{modelTestResult.error}</div>}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-zinc-900">确认加入网站</div>
            <div className="mt-1 text-[12px] font-medium text-muted">已选 {selectedVideos.length} 个；若未选目标枪械，AI将自动提取视频内全部枪械</div>
          </div>
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {(isPreviewing || isApplying) ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} strokeWidth={2.5} />}
            确认加入网站
          </button>
        </div>

        {selectedVideos.length > 0 && (
          <div className="mt-4 space-y-2">
            {(selectedVideos || []).map((video, index) => (
              <div key={video.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-600">
                {index + 1}. {video.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {!preview && !isPreviewing && !isApplying && (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
          <Sparkles size={24} className="mb-4 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-700">确认后会自动写入网站</p>
          <p className="mt-1 text-[12px] font-medium text-muted">同枪会合并进原卡片，没有卡片会新增</p>
        </div>
      )}

      {(isPreviewing || isApplying) && (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-zinc-100 bg-zinc-50 text-center">
          <Loader2 size={24} className="mb-4 animate-spin text-emerald-500" />
          <p className="text-sm font-bold text-zinc-700">正在处理并写入</p>
          <p className="mt-1 text-[12px] font-medium text-muted">仅处理你勾选的视频</p>
        </div>
      )}

      {preview && !isPreviewing && !isApplying && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">模型</span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-bold text-zinc-700">{preview.model || '未知'}</span>
            <span className="text-[11px] font-medium text-muted">结果 {preview.groups?.length || 0} 组</span>
          </div>

          {hasPreviewErrors && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {(preview.errors || []).join('；')}
            </div>
          )}

          {!hasPreviewGroups && !hasPreviewErrors && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-[13px] text-amber-800">
              <div className="font-bold">这次没提取到目标枪械。</div>
              <div className="mt-1 font-medium">当前结果为空，网站数据不会被改动。</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
