import React, { useEffect, useMemo, useState } from 'react';
import { Radio, X } from 'lucide-react';
import {
  CollectMeta,
  CollectModelProviderInput,
  CollectPreview,
  CollectSearchResult,
  ModelTestResult,
} from '../types';
import { CollectSearchPanel } from './CollectSearchPanel';
import { CollectVideoPanel } from './CollectVideoPanel';
import { CollectApplyPanel } from './CollectApplyPanel';
import { CollectProviderModal } from './CollectProviderModal';

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

  const toggleGun = (gun: string) => {
    setSelectedGuns((prev) => prev.includes(gun) ? prev.filter((item) => item !== gun) : [...prev, gun]);
  };

  const toggleCreator = (creatorId: string) => {
    setSelectedCreatorIds((prev) => prev.includes(creatorId) ? prev.filter((item) => item !== creatorId) : [...prev, creatorId]);
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

  const disabled = isPreviewing || isApplying;

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
              <CollectSearchPanel
                meta={meta}
                presetGunInput={presetGunInput}
                isSavingPresetGuns={isSavingPresetGuns}
                selectedGuns={selectedGuns}
                selectedCreatorIds={selectedCreatorIds}
                maxVideos={maxVideos}
                searchConcurrencyEnabled={searchConcurrencyEnabled}
                applyConcurrencyEnabled={applyConcurrencyEnabled}
                disabled={disabled}
                isSearching={isSearching}
                onToggleGun={toggleGun}
                onToggleCreator={toggleCreator}
                onPresetGunInputChange={onPresetGunInputChange}
                onSavePresetGuns={onSavePresetGuns}
                onMaxVideosChange={setMaxVideos}
                onSearchConcurrencyChange={onSearchConcurrencyChange}
                onApplyConcurrencyChange={onApplyConcurrencyChange}
                onSearch={handleSearch}
                onCancelSearch={onCancelSearch}
              />
            </div>

            <div className="border-b border-zinc-100 p-6 xl:border-b-0 xl:border-r">
              <CollectVideoPanel
                searchResult={searchResult}
                selectedVideoIds={selectedVideoIds}
                isSearching={isSearching}
                onToggleVideo={toggleVideo}
              />
            </div>

            <div className="min-h-[620px] p-6 md:p-7">
              <CollectApplyPanel
                meta={meta}
                preview={preview}
                modelTestResult={modelTestResult}
                selectedModel={selectedModel}
                selectedProviderId={selectedProviderId}
                selectedVideos={selectedVideos}
                isSearching={isSearching}
                isPreviewing={isPreviewing}
                isTestingModel={isTestingModel}
                isApplying={isApplying}
                onSelectedModelChange={onSelectedModelChange}
                onSelectedProviderIdChange={onSelectedProviderIdChange}
                onTestModel={onTestModel}
                onApply={handleApply}
                onOpenProviderModal={onOpenProviderModal}
              />
            </div>
          </div>
        </div>

        {isProviderModalOpen && (
          <CollectProviderModal
            providerForm={providerForm}
            isFetchingProviderModels={isFetchingProviderModels}
            isSavingProvider={isSavingProvider}
            onProviderFormChange={onProviderFormChange}
            onFetchProviderModels={onFetchProviderModels}
            onSaveProvider={onSaveProvider}
            onDeleteProvider={onDeleteProvider}
            onClose={onCloseProviderModal}
          />
        )}
      </div>
    </div>
  );
}
