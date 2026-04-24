import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Radio,
  Sparkles,
  X,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Search,
  TestTube2,
  Plus,
  Save,
  Trash2,
  Settings2,
} from 'lucide-react';
import { cn, inputClasses } from '../utils';
import {
  CollectMeta,
  CollectModelProviderInput,
  CollectPreview,
  CollectSearchLog,
  CollectSearchResult,
  ModelTestResult,
} from '../types';

export function CollectModal({
  isOpen,
  isSearching,
  isPreviewing,
  isTestingModel,
  isApplying,
  meta,
  searchResult,
  selectedVideoIds,
  selectedModel,
  selectedProviderId,
  modelTestResult,
  preview,
  presetGunInput,
  isSavingPresetGuns,
  isProviderModalOpen,
  providerForm,
  isFetchingProviderModels,
  isSavingProvider,
  searchConcurrencyEnabled,
  applyConcurrencyEnabled,
  onClose,
  onSearch,
  onCancelSearch,
  onSelectedVideoIdsChange,
  onSelectedModelChange,
  onSelectedProviderIdChange,
  onTestModel,
  onApply,
  onPresetGunInputChange,
  onSavePresetGuns,
  onOpenProviderModal,
  onCloseProviderModal,
  onProviderFormChange,
  onFetchProviderModels,
  onSaveProvider,
  onDeleteProvider,
  onSearchConcurrencyChange,
  onApplyConcurrencyChange,
}: {
  isOpen: boolean;
  isSearching: boolean;
  isPreviewing: boolean;
  isTestingModel: boolean;
  isApplying: boolean;
  meta: CollectMeta;
  searchResult: CollectSearchResult;
  selectedVideoIds: string[];
  selectedModel: string;
  selectedProviderId: string;
  modelTestResult: ModelTestResult | null;
  preview: CollectPreview | null;
  presetGunInput: string;
  isSavingPresetGuns: boolean;
  isProviderModalOpen: boolean;
  providerForm: CollectModelProviderInput;
  isFetchingProviderModels: boolean;
  isSavingProvider: boolean;
  searchConcurrencyEnabled: boolean;
  applyConcurrencyEnabled: boolean;
  onClose: () => void;
  onSearch: (guns: string[], creatorIds: string[], maxVideos: number) => void;
  onCancelSearch: () => void;
  onSelectedVideoIdsChange: (videoIds: string[]) => void;
  onSelectedModelChange: (model: string) => void;
  onSelectedProviderIdChange: (providerId: string) => void;
  onTestModel: (model: string) => void;
  onApply: (guns: string[], creatorIds: string[], videoIds: string[], model: string) => void;
  onPresetGunInputChange: (value: string) => void;
  onSavePresetGuns: () => void;
  onOpenProviderModal: () => void;
  onCloseProviderModal: () => void;
  onProviderFormChange: React.Dispatch<React.SetStateAction<CollectModelProviderInput>>;
  onFetchProviderModels: () => void;
  onSaveProvider: () => void;
  onDeleteProvider: () => void;
  onSearchConcurrencyChange: (value: boolean) => void;
  onApplyConcurrencyChange: (value: boolean) => void;
}) {
  const [selectedGuns, setSelectedGuns] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [maxVideos, setMaxVideos] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGuns([]);
      setSelectedCreatorIds([]);
      return;
    }
    setSelectedGuns([]);
    setSelectedCreatorIds([]);
  }, [isOpen]);

  const mergedGuns = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const gun of selectedGuns) {
      const normalized = gun.toUpperCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(gun);
    }

    return result;
  }, [selectedGuns]);

  const selectedVideos = useMemo(
    () => searchResult.videos.filter((video) => selectedVideoIds.includes(video.id)),
    [searchResult.videos, selectedVideoIds]
  );

  const providerOptions = useMemo(
    () => meta.providers,
    [meta.providers]
  );

  const modelOptions = useMemo(
    () => meta.modelOptions.filter((option) => option.providerId === selectedProviderId),
    [meta.modelOptions, selectedProviderId]
  );

  const hasPreviewGroups = (preview?.groups?.length || 0) > 0;
  const hasPreviewErrors = Boolean(preview?.errors && preview.errors.length > 0);
  const hasSearchErrors = Boolean(searchResult?.errors && searchResult.errors.length > 0);
  const hasSearchVideos = searchResult.videos.length > 0;
  const searchLogs = searchResult.logs || [];
  const visibleSearchLogs: CollectSearchLog[] = searchLogs.slice(-10).reverse();
  const visibleSearchLogs: CollectSearchLog[] = [...searchLogs].reverse();

  const toggleCreator = (creatorId: string) => {
    setSelectedCreatorIds((prev) => prev.includes(creatorId) ? prev.filter((item) => item !== creatorId) : [...prev, creatorId]);
  };

  const toggleGun = (gun: string) => {
    setSelectedGuns((prev) => prev.includes(gun) ? prev.filter((item) => item !== gun) : [...prev, gun]);
  };

  const toggleVideo = (videoId: string) => {
    onSelectedVideoIdsChange(
      selectedVideoIds.includes(videoId)
        ? selectedVideoIds.filter((item) => item !== videoId)
        : [...selectedVideoIds, videoId]
    );
  };

  const handleSearch = () => {
    onSearch(mergedGuns, selectedCreatorIds, maxVideos);
  };

  const handleApply = () => {
    onApply(mergedGuns, selectedCreatorIds, selectedVideoIds, selectedModel);
  };

  const handleProviderChange = (providerId: string) => {
    onSelectedProviderIdChange(providerId);
    const nextOption = meta.modelOptions.find((option) => option.providerId === providerId);
    onSelectedModelChange(nextOption?.value || '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60" onClick={onClose} />

      <div className="relative z-10 w-full max-w-7xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 md:px-7">
          <div>
            <div className="flex items-center gap-2 text-zinc-900">
              <Radio size={18} className="text-emerald-500" strokeWidth={2.5} />
              <h2 className="text-xl font-black">手动采集改枪码</h2>
            </div>
            <p className="mt-1 text-[12px] font-medium text-zinc-500">选枪、选博主、搜视频、多选确认后直接加入卡片</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 p-2 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">
          <div className="grid gap-0 xl:grid-cols-[360px_420px_minmax(0,1fr)]">
            <div className="border-b border-zinc-100 p-6 xl:border-b-0 xl:border-r">
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">目标枪械过滤 (可选)</label>
                    <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold text-zinc-600">
                      已选择 {mergedGuns.length} 个
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meta.defaultGuns.map((gun) => {
                      const active = selectedGuns.includes(gun);
                      return (
                        <button
                          key={gun}
                          type="button"
                          onClick={() => toggleGun(gun)}
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
                      disabled={isSavingPresetGuns || isSearching || isPreviewing || isApplying}
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
                          onClick={() => toggleCreator(creator.id)}
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
              onChange={(e) => setMaxVideos(Number(e.target.value))}
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
                    onClick={handleSearch}
                    disabled={isPreviewing || isApplying || selectedCreatorIds.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600 bg-emerald-500 px-4 py-3 text-[13px] font-black text-white shadow-[0_8px_24px_rgba(16,185,129,0.18)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Search size={16} strokeWidth={2.5} />
                    搜索命中视频
                  </button>
                )}
              </div>
            </div>

            <div className="border-b border-zinc-100 p-6 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">命中视频</h3>
                  <p className="mt-1 text-[12px] font-medium text-zinc-400">搜索后显示在这里，可多选</p>
                </div>
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold text-zinc-600">
                  已选 {selectedVideoIds.length}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {hasSearchErrors && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
                    {(searchResult.errors || []).join('；')}
                  </div>
                )}

                {!isSearching && !hasSearchVideos && !hasSearchErrors && (
                  <>
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
                      <Sparkles size={22} className="mb-3 text-zinc-300" />
                      <p className="text-sm font-bold text-zinc-700">这里会显示搜索命中的视频</p>
                      <p className="mt-1 text-[12px] font-medium text-zinc-400">将展示博主最新视频，无论是否匹配皆可手动勾选</p>
                    </div>

                    <div className="min-h-[220px] rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-zinc-700">搜索实时记录</h4>
                          <p className="mt-1 text-[12px] font-medium text-zinc-400">搜索完成后，这里保留最近一次记录</p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold text-zinc-500">
                          {searchLogs.length} 条
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                      <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto pr-2">
                        {visibleSearchLogs.length > 0 ? visibleSearchLogs.map((log) => (
                          <div key={`${log.timestamp}-${log.stage}-${log.videoId || ''}`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-600">
                            {log.message}
                          </div>
                        )) : (
                          <div className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white text-center text-[12px] font-medium text-zinc-400">
                            {searchResult.isPending ? '正在等待服务器返回搜索日志…' : '暂无搜索记录'}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {isSearching && (
                  <>
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-zinc-100 bg-zinc-50 text-center">
                      <Loader2 size={22} className="mb-3 animate-spin text-emerald-500" />
                      <p className="text-sm font-bold text-zinc-700">正在搜索视频</p>
                      <p className="mt-1 text-[12px] font-medium text-zinc-400">正在抓取并分析博主最新视频...</p>
                    </div>

                    <div className="min-h-[220px] rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-zinc-700">搜索实时记录</h4>
                          <p className="mt-1 text-[12px] font-medium text-zinc-400">用于显示搜索阶段发生了什么</p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold text-zinc-500">
                          {searchLogs.length} 条
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                      <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto pr-2">
                        {visibleSearchLogs.length > 0 ? visibleSearchLogs.map((log) => (
                          <div key={`${log.timestamp}-${log.stage}-${log.videoId || ''}`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-600">
                            {log.message}
                          </div>
                        )) : (
                          <div className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white text-center text-[12px] font-medium text-zinc-400">
                            正在等待服务器返回搜索日志…
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {hasSearchVideos && (searchResult.videos || []).map((video) => {
                  if (!video) return null;
                  const checked = selectedVideoIds.includes(video.id);
                  return (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => toggleVideo(video.id)}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition',
                        checked ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[13px] font-black text-zinc-900">{video.title}</div>
                          <div className="mt-2 text-[11px] font-medium text-zinc-500">{video.author} · {video.uploadDate || '未知日期'}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(video.matchedIn || []).length > 0 ? (
                              (video.matchedIn || []).map((item) => (
                                <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  {item === 'title' ? '标题命中预设' : '简介命中预设'}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                                常规候选 (可手动勾选)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 bg-white text-transparent')}>
                          <CheckCircle2 size={13} strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-900"
                        >
                          <ExternalLink size={11} strokeWidth={2.5} />
                          打开视频
                        </a>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[620px] p-6 md:p-7">
              <div className="space-y-4">
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">采集模型</div>
                      <div className="mt-1 text-[12px] font-medium text-zinc-400">先选模型源，再选模型；测试模型不会写入网站</div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenProviderModal}
                      disabled={isSearching || isPreviewing || isApplying || isTestingModel}
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
                      className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                    >
                      {providerOptions.map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <Cpu size={14} strokeWidth={2.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <select
                        value={selectedModel}
                        onChange={(e) => onSelectedModelChange(e.target.value)}
                        className={cn(inputClasses, 'w-full border border-zinc-200 bg-white py-2 pl-9 pr-8 text-[13px] font-bold shadow-sm')}
                      >
                        {modelOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.model}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onTestModel(selectedModel)}
                      disabled={!selectedModel || isTestingModel || isSearching || isPreviewing || isApplying}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isTestingModel ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} strokeWidth={2.5} />}
                      测试模型
                    </button>
                  </div>

                  {modelTestResult && (
                    <div className={cn(
                      'mt-4 rounded-2xl border px-4 py-3 text-[12px] font-medium',
                      modelTestResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                    )}>
                      <div>结果：{modelTestResult.success ? '成功' : '失败'} · 延迟：{modelTestResult.latencyMs} ms</div>
                      {modelTestResult.error && <div className="mt-1">错误：{modelTestResult.error}</div>}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-zinc-900">确认加入网站</div>
                      <div className="mt-1 text-[12px] font-medium text-zinc-400">已选 {selectedVideos.length} 个；若未选目标枪械，AI将自动提取视频内全部枪械</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={isPreviewing || isSearching || isApplying || !selectedModel || selectedVideoIds.length === 0}
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
                    <p className="mt-1 text-[12px] font-medium text-zinc-400">同枪会合并进原卡片，没有卡片会新增</p>
                  </div>
                )}

                {(isPreviewing || isApplying) && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-zinc-100 bg-zinc-50 text-center">
                    <Loader2 size={24} className="mb-4 animate-spin text-emerald-500" />
                    <p className="text-sm font-bold text-zinc-700">正在处理并写入</p>
                    <p className="mt-1 text-[12px] font-medium text-zinc-400">仅处理你勾选的视频</p>
                  </div>
                )}

                {preview && !isPreviewing && !isApplying && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">模型</span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-bold text-zinc-700">{preview.model || '未知'}</span>
                      <span className="text-[11px] font-medium text-zinc-400">结果 {preview.groups?.length || 0} 组</span>
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
            </div>
          </div>
        </div>

        {isProviderModalOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/40 p-4">
            <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-zinc-900">模型源配置</div>
                  <div className="mt-1 text-[12px] font-medium text-zinc-400">支持自定义接口、API Key、拉取模型列表</div>
                </div>
                <button
                  type="button"
                  onClick={onCloseProviderModal}
                  className="rounded-full bg-zinc-100 p-2 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">名称</label>
                    <input
                      value={providerForm.name}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, name: e.target.value }))}
                      className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                      placeholder="我的接口"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">接口地址</label>
                    <input
                      value={providerForm.baseUrl}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">API Key</label>
                  <input
                    value={providerForm.apiKey}
                    onChange={(e) => onProviderFormChange((prev) => ({ ...prev, apiKey: e.target.value }))}
                    className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                    placeholder="sk-..."
                  />
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-black text-zinc-900">模型列表</div>
                      <div className="mt-1 text-[11px] font-medium text-zinc-400">先拉取，再选择默认模型</div>
                    </div>
                    <button
                      type="button"
                      onClick={onFetchProviderModels}
                      disabled={isFetchingProviderModels || isSavingProvider}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isFetchingProviderModels ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} strokeWidth={2.5} />}
                      拉取模型
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <select
                      value={providerForm.selectedModel || ''}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, selectedModel: e.target.value }))}
                      className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] font-bold shadow-sm')}
                    >
                      <option value="">请选择模型</option>
                      {providerForm.models.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 text-[12px] font-medium text-zinc-600">
                      {providerForm.models.length > 0 ? providerForm.models.join('\n') : '暂无模型，请先拉取'}
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
                  <Trash2 size={14} strokeWidth={2.5} />
                  删除模型源
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCloseProviderModal}
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
        )}
      </div>
    </div>
  );
}
