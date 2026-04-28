import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  GunGroup,
  GunVariant,
  CollectMeta,
  CollectModelProviderInput,
  CollectPreview,
  CollectSearchResult,
  CollectVideoCandidate,
  ModelTestResult,
  UiPreferences,
} from './types';
import { Drawer } from './components/Navigation/Drawer';
import { Header } from './components/Header';
import { GunCard } from './components/GunCard';
import { AddGunModal } from './components/AddGunModal';
import { CollectModal } from './components/CollectModal';
import { SortableGunCard } from './components/SortableGunCard';
import { CommunityPage } from './pages/CommunityPage';
import { SettingsPage } from './components/SettingsPage';
import { DailyPwdCard } from './components/DailyPwdCard';
import { EditCustomizePanel } from './components/EditCustomizePanel';
import { ModeSelectModal } from './components/ModeSelectModal';
import { AutoCollectConfigModal, AutoCollectConfig } from './components/AutoCollectConfigModal';

import { useToast } from './components/useToast';
import { useDailyPassword } from './hooks/useDailyPassword';
import { useTheme } from './hooks/useTheme';

import {
  cn,
  buildModelOptionValue,
  parseModelOptionValue,
  gridGapClassMap,
  sidebarWidthClassMap,
} from './utils';
import {
  EMPTY_META,
  EMPTY_PROVIDER_FORM,
  EMPTY_SEARCH,
} from './constants';
import {
  normalizeCollectSearchResult,
  normalizeCollectMeta,
  normalizePresetGunsInput,
  buildProviderFormFromMeta,
  safeJson,
} from './utils/collect';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

export default function App() {
  const mobileVersionLabel = `v${__APP_VERSION__}`;
  const { toast, showToast } = useToast();
  const theme = useTheme();
  const daily = useDailyPassword(showToast);

  const [activeTab, setActiveTab] = useState('home');
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'mode-select' | 'collect' | 'auto-collect'>('none');
  
  // Collect related states
  const [isSearchingCollect, setIsSearchingCollect] = useState(false);
  const [isPreviewingCollect, setIsPreviewingCollect] = useState(false);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [isApplyingCollect, setIsApplyingCollect] = useState(false);
  const [collectMeta, setCollectMeta] = useState<CollectMeta>(EMPTY_META);
  const [collectSearchResult, setCollectSearchResult] = useState<CollectSearchResult>(EMPTY_SEARCH);
  const [collectPreview, setCollectPreview] = useState<CollectPreview | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [searchConcurrencyEnabled, setSearchConcurrencyEnabled] = useState(false);
  const [applyConcurrencyEnabled, setApplyConcurrencyEnabled] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER_FORM);
  const [isFetchingProviderModels, setIsFetchingProviderModels] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingPresetGuns, setIsSavingPresetGuns] = useState(false);
  const [presetGunInput, setPresetGunInput] = useState('');
  const [modelTestResult, setModelTestResult] = useState<ModelTestResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchPollRef = useRef<number | null>(null);

  // Settings related states
  const [isUploadingCookie, setIsUploadingCookie] = useState(false);
  const [cookieTestResult, setCookieTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [cookieStatus, setCookieStatus] = useState<{ exists: boolean; mtime?: string } | null>(null);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [settingsFileStatus, setSettingsFileStatus] = useState<{ exists: boolean; mtime?: string } | null>(null);
  const [isDownloadingSettings, setIsDownloadingSettings] = useState(false);

  const [autoCollectConfig, setAutoConfig] = useState<AutoCollectConfig>({
    enabled: false,
    model: '',
    intervalHours: 1,
    creatorIds: [],
    logs: []
  });
  const [isSavingAuto, setIsSavingAuto] = useState(false);

  const [savedData, setSavedData] = useState<GunGroup[]>([]);
  const [draftData, setDraftData] = useState<GunGroup[]>([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [savedDataLoadError, setSavedDataLoadError] = useState<string | null>(null);

  const fetchCookieStatus = useCallback(() => {
    fetch('/api/config/cookie/status')
      .then(res => res.json())
      .then(data => setCookieStatus(data))
      .catch(console.error);
  }, []);

  const fetchSettingsFileStatus = useCallback(() => {
    fetch('/api/config/settings-file/status')
      .then(res => res.json())
      .then(data => setSettingsFileStatus(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchCookieStatus();
      fetchSettingsFileStatus();
      daily.fetchDailyPwdLogs();
    }
  }, [activeTab, fetchCookieStatus, fetchSettingsFileStatus, daily]);

  const fetchData = useCallback((silent = false) => {
    if (!silent) setIsRefreshingData(true);
    fetch('/api/builds')
      .then(safeJson)
      .then(data => {
        setSavedData(data);
        setSavedDataLoadError(null);
      })
      .catch(err => {
        console.error('加载失败:', err);
        setSavedDataLoadError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!silent) setIsRefreshingData(false);
      });
  }, []);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      if (!isEditing && activeModal === 'none' && !isSearchingCollect && !isPreviewingCollect && !isApplyingCollect) {
        fetchData(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData, isEditing, activeModal, isSearchingCollect, isPreviewingCollect, isApplyingCollect]);

  useEffect(() => {
    if (activeModal === 'auto-collect') {
      fetch('/api/collect/auto')
        .then(safeJson)
        .then(data => setAutoConfig({
           enabled: Boolean(data.enabled),
           model: data.model || '',
           intervalHours: Number(data.intervalHours) || 1,
           creatorIds: Array.isArray(data.creatorIds) ? data.creatorIds : [],
           logs: Array.isArray(data.logs) ? data.logs : []
        }));
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal !== 'collect' && activeModal !== 'auto-collect') return;
    fetch('/api/collect/meta')
      .then(safeJson)
      .then((rawData) => {
        const data = normalizeCollectMeta(rawData);
        setCollectMeta(data);
        setPresetGunInput(data.defaultGuns.join(', '));
        setSearchConcurrencyEnabled(data.concurrency.searchEnabled);
        setApplyConcurrencyEnabled(data.concurrency.applyEnabled);
        setSelectedModel((prev) => (prev && data.modelOptions.some(o => o.value === prev) ? prev : data.defaultModel || ''));
        setSelectedProviderId((prev) => {
          const providerId = prev || parseModelOptionValue(data.defaultModel).providerId || data.providers[0]?.id || '';
          return data.providers.some(p => p.id === providerId) ? providerId : (data.providers[0]?.id || '');
        });
      })
      .catch(err => {
        console.error('加载采集配置失败:', err);
        showToast('加载采集配置失败', 'warn');
      });
  }, [activeModal, showToast]);

  useEffect(() => {
    if (!isProviderModalOpen) return;
    setProviderForm(buildProviderFormFromMeta(collectMeta, selectedProviderId));
  }, [isProviderModalOpen, collectMeta, selectedProviderId]);

  const handleSavePresetGuns = async () => {
    setIsSavingPresetGuns(true);
    try {
      const presetGuns = normalizePresetGunsInput(presetGunInput);
      const res = await fetch('/api/collect/preset-guns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetGuns }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '保存预设枪械失败');
      const nextMeta = normalizeCollectMeta(data?.meta);
      setCollectMeta(nextMeta);
      setPresetGunInput(nextMeta.defaultGuns.join(', '));
      showToast('预设枪械已保存');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存预设枪械失败', 'warn');
    } finally {
      setIsSavingPresetGuns(false);
    }
  };

  const handleFetchProviderModels = async () => {
    setIsFetchingProviderModels(true);
    try {
      const res = await fetch('/api/collect/providers/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: providerForm.baseUrl, apiKey: providerForm.apiKey }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '获取模型列表失败');
      const models = Array.isArray(data?.models) ? data.models.map(String) : [];
      setProviderForm(prev => ({
        ...prev,
        models,
        selectedModel: models.includes(prev.selectedModel || '') ? (prev.selectedModel || '') : (models[0] || ''),
      }));
      showToast(`已获取 ${models.length} 个模型`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取模型列表失败', 'warn');
    } finally {
      setIsFetchingProviderModels(false);
    }
  };

  const handleSaveProvider = async () => {
    setIsSavingProvider(true);
    try {
      const res = await fetch('/api/collect/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: providerForm.id || undefined,
          name: providerForm.name,
          baseUrl: providerForm.baseUrl,
          apiKey: providerForm.apiKey,
          models: providerForm.models,
          defaultModel: providerForm.selectedModel || undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '保存模型源失败');
      const nextMeta = normalizeCollectMeta(data?.meta);
      const nextProviderId = providerForm.id || nextMeta.providers.find(p => p.baseUrl === providerForm.baseUrl && p.name === providerForm.name)?.id || '';
      setCollectMeta(nextMeta);
      setSelectedProviderId(nextProviderId || parseModelOptionValue(nextMeta.defaultModel).providerId || nextMeta.providers[0]?.id || '');
      if (providerForm.selectedModel) {
        const nextValue = buildModelOptionValue(nextProviderId, providerForm.selectedModel);
        setSelectedModel(nextMeta.modelOptions.some(o => o.value === nextValue) ? nextValue : nextMeta.defaultModel);
      } else {
        setSelectedModel(nextMeta.defaultModel);
      }
      setIsProviderModalOpen(false);
      showToast('模型源已保存');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存模型源失败', 'warn');
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!providerForm.id) return;
    setIsSavingProvider(true);
    try {
      const res = await fetch('/api/collect/providers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: providerForm.id }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '删除模型源失败');
      const nextMeta = normalizeCollectMeta(data?.meta);
      setCollectMeta(nextMeta);
      setSelectedProviderId(parseModelOptionValue(nextMeta.defaultModel).providerId || nextMeta.providers[0]?.id || '');
      setSelectedModel(nextMeta.defaultModel || '');
      setIsProviderModalOpen(false);
      showToast('模型源已删除', 'warn');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除模型源失败', 'warn');
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleSaveConcurrency = async (nextSearchEnabled: boolean, nextApplyEnabled: boolean) => {
    setSearchConcurrencyEnabled(nextSearchEnabled);
    setApplyConcurrencyEnabled(nextApplyEnabled);
    try {
      const res = await fetch('/api/collect/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchEnabled: nextSearchEnabled, applyEnabled: nextApplyEnabled }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '保存并发配置失败');
      setCollectMeta(normalizeCollectMeta(data?.meta));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存并发配置失败', 'warn');
    }
  };

  const stopSearchPolling = useCallback(() => {
    if (searchPollRef.current !== null) {
      window.clearInterval(searchPollRef.current);
      searchPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopSearchPolling();
  }, [stopSearchPolling]);

  const handleSearchCollect = async (guns: string[], creatorIds: string[], maxVideos: number) => {
    stopSearchPolling();
    setIsSearchingCollect(true);
    setCollectPreview(null);
    setSelectedVideoIds([]);
    setModelTestResult(null);

    try {
      const startRes = await fetch('/api/collect/search/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guns, creatorIds, concurrent: searchConcurrencyEnabled, maxVideos }),
      });
      const startData = await safeJson(startRes);
      if (!startRes.ok) throw new Error(startData?.error || '搜索启动失败');

      const requestId = typeof startData?.requestId === 'string' ? startData.requestId : '';
      if (!requestId) throw new Error('搜索任务创建失败');

      setCollectSearchResult(normalizeCollectSearchResult(null, { guns, creatorIds, requestId, isPending: true }));
      setSelectedModel(prev => prev || collectMeta.defaultModel || '');

      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`/api/collect/search/status/${encodeURIComponent(requestId)}`);
          const statusData = await safeJson(statusRes);
          if (!statusRes.ok) throw new Error(statusData?.error || '搜索状态获取失败');

          const isDone = Boolean(statusData?.done);
          const result = statusData?.result as Partial<CollectSearchResult> | undefined;
          const nextResult = normalizeCollectSearchResult(result || { guns, creatorIds, logs: statusData?.logs, errors: statusData?.error ? [String(statusData.error)] : [] }, { guns, creatorIds, requestId, isPending: !isDone });

          setCollectSearchResult({ ...nextResult, logs: Array.isArray(statusData?.logs) ? statusData.logs : nextResult.logs, errors: statusData?.error ? [...(nextResult.errors || []), String(statusData.error)] : nextResult.errors, requestId, isPending: !isDone });

          if (isDone) {
            stopSearchPolling();
            setIsSearchingCollect(false);
            if (nextResult.videos.length > 0) showToast(`已命中 ${nextResult.videos.length} 个视频`);
            else if (nextResult.errors?.length) showToast(nextResult.errors[0], 'warn');
            else showToast('搜索完成，但没有命中视频', 'warn');
            return true;
          }
          return false;
        } catch (error) {
          stopSearchPolling();
          setIsSearchingCollect(false);
          const message = error instanceof Error ? error.message : '搜索状态获取失败';
          setCollectSearchResult(normalizeCollectSearchResult({ logs: [{ timestamp: Date.now(), stage: 'request-error', message }], errors: [message] }, { guns, creatorIds, requestId, isPending: false }));
          showToast(message, 'warn');
          return true;
        }
      };

      const finishedImmediately = await pollStatus();
      if (!finishedImmediately && searchPollRef.current === null && startData?.success) {
        searchPollRef.current = window.setInterval(() => { void pollStatus(); }, 1200);
      }
    } catch (e) {
      stopSearchPolling();
      const message = e instanceof Error ? e.message : '搜索失败';
      setCollectSearchResult(normalizeCollectSearchResult({ logs: [{ timestamp: Date.now(), stage: 'request-error', message }], errors: [message] }, { guns, creatorIds, isPending: false }));
      setIsSearchingCollect(false);
      showToast(message, 'warn');
    }
  };

  const handleCancelSearch = async () => {
    if (collectSearchResult.requestId && isSearchingCollect) {
      try {
        await fetch(`/api/collect/search/cancel/${encodeURIComponent(collectSearchResult.requestId)}`, { method: 'POST' });
      } catch (e) { console.error(e); }
      stopSearchPolling();
      setIsSearchingCollect(false);
      setCollectSearchResult(prev => ({
        ...prev,
        isPending: false,
        errors: [...(prev.errors || []), '搜索已手动取消'],
        logs: [...(prev.logs || []), { timestamp: Date.now(), stage: 'cancelled', message: '搜索已手动取消' }]
      }));
      showToast('搜索已取消', 'warn');
    }
  };

  const handlePreviewCollect = async (guns: string[], creatorIds: string[], videoIds: string[], model: string, videos: CollectVideoCandidate[] = []) => {
    setIsPreviewingCollect(true);
    try {
      const res = await fetch('/api/collect/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guns, creatorIds, videoIds, model, videos, concurrent: applyConcurrencyEnabled }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '预览失败');
      const nextPreview: CollectPreview = { ...data, groups: Array.isArray(data?.groups) ? data.groups : [], errors: Array.isArray(data?.errors) ? data.errors : [] };
      setCollectPreview(nextPreview);
      return nextPreview;
    } catch (e) {
      const message = e instanceof Error ? e.message : '预览失败';
      const failedPreview: CollectPreview = { groups: [], errors: [message] };
      setCollectPreview(failedPreview);
      showToast(message, 'warn');
      return failedPreview;
    } finally {
      setIsPreviewingCollect(false);
    }
  };

  const handleTestModel = async (model: string) => {
    setIsTestingModel(true);
    setModelTestResult(null);
    try {
      const res = await fetch('/api/model/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '模型测试失败');
      setModelTestResult(data);
      showToast(data?.success ? '模型测试成功' : '模型测试失败', data?.success ? 'success' : 'warn');
    } catch (e) {
      const message = e instanceof Error ? e.message : '模型测试失败';
      setModelTestResult({ model, success: false, latencyMs: 0, error: message });
      showToast(message, 'warn');
    } finally {
      setIsTestingModel(false);
    }
  };

  const handleApplyCollect = async (guns: string[], creatorIds: string[], videoIds: string[], model: string) => {
    if (videoIds.length === 0) {
      showToast('请至少选择一个视频', 'warn');
      return;
    }
    const selectedVideos = (collectSearchResult.videos || []).filter(v => v && videoIds.includes(v.id));
    const previewResult = await handlePreviewCollect(guns, creatorIds, videoIds, model, selectedVideos);
    if (!previewResult.groups?.length) {
      showToast(previewResult.errors?.[0] || '没有可加入的网站内容', 'warn');
      return;
    }

    setIsApplyingCollect(true);
    try {
      const res = await fetch('/api/collect/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: previewResult.groups }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '写入失败');
      setSavedData(Array.isArray(data?.data) ? data.data : []);
      setCollectPreview(null);
      setCollectSearchResult(EMPTY_SEARCH);
      setSelectedVideoIds([]);
      setModelTestResult(null);
      setActiveModal('none');
      showToast('已自动加入网站');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '写入失败', 'warn');
    } finally {
      setIsApplyingCollect(false);
    }
  };

  const handleCloseCollectModal = () => {
    if (isSearchingCollect || isPreviewingCollect || isApplyingCollect) {
      showToast('当前有正在执行的任务，无法关闭弹窗', 'warn');
      return;
    }
    stopSearchPolling();
    setActiveModal('none');
    setCollectSearchResult(EMPTY_SEARCH);
    setCollectPreview(null);
    setSelectedVideoIds([]);
    setModelTestResult(null);
  };

  const handleEditStart = () => {
    setDraftData(JSON.parse(JSON.stringify(savedData)));
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      if (!res.ok) throw new Error('网络请求异常');
      const serverData = await safeJson(res);
      setSavedData(Array.isArray(serverData) ? serverData : draftData);
      setIsEditing(false);
      showToast('已保存！');
    } catch (e) {
      showToast('保存失败，请检查网络', 'warn');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraftData([]);
  };

  const handleUpdateGroup = (groupId: string, field: keyof GunGroup, value: string) => {
    setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };

  const handleDeleteGroup = (groupId: string) => {
    setDraftData(prev => prev.filter(g => g.id !== groupId));
  };

  const handleTogglePin = async (groupId: string) => {
    if (isEditing) {
      setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, pinned: !g.pinned } : g));
      return;
    }
    const updateFn = (prev: GunGroup[]) => prev.map(g => g.id === groupId ? { ...g, pinned: !g.pinned } : g);
    const previousSavedData = savedData;
    const newSavedData = updateFn(savedData);
    setSavedData(newSavedData);
    try {
      const res = await fetch('/api/builds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSavedData) });
      if (!res.ok) throw new Error('网络请求异常');
      const serverData = await safeJson(res);
      setSavedData(Array.isArray(serverData) ? serverData : newSavedData);
    } catch (e) {
      setSavedData(previousSavedData);
      showToast('置顶失败，请检查网络', 'warn');
    }
  };

  const handleUpdateVariant = (groupId: string, variantId: string, field: keyof GunVariant, val: string | boolean) => {
    setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, variants: g.variants.map(v => v.id === variantId ? { ...v, [field]: val } : v) } : g));
  };

  const handleDeleteVariant = (groupId: string, variantId: string) => {
    setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, variants: g.variants.filter(v => v.id !== variantId) } : g));
  };

  const handleAddVariant = (groupId: string) => {
    const newVariant: GunVariant = { id: `v_${Date.now()}`, tier: 'T1', price: '10W', buildType: '新配置', code: '', date: new Date().toISOString().split('T')[0], author: '', sourceUrl: '', locked: false };
    setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, variants: [...g.variants, newVariant] } : g));
  };

  const handleConfirmNewGun = (name: string, category: string, variantProps: Omit<GunVariant, 'id'>) => {
    const newGroup: GunGroup = { id: `g_${Date.now()}`, name, category, variants: [{ id: `v_${Date.now()}`, ...variantProps }] };
    setDraftData(prev => [newGroup, ...prev]);
    setIsModalOpen(false);
    showToast('已新增枪械体系！');
  };

  const handleReorderVariants = (groupId: string, activeId: string, overId: string) => {
    setDraftData(prev => prev.map(g => {
      if (g.id === groupId) {
        const oldIndex = g.variants.findIndex(v => v.id === activeId);
        const newIndex = g.variants.findIndex(v => v.id === overId);
        return { ...g, variants: arrayMove(g.variants, oldIndex, newIndex) };
      }
      return g;
    }));
  };

  const handleCookieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCookie(true);
    setCookieTestResult(null);
    try {
      const content = await file.text();
      const res = await fetch('/api/config/cookie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || data?.error || '上传失败');
      setCookieTestResult({ success: Boolean(data.success), message: String(data.message || '测试完成') });
      fetchCookieStatus();
    } catch(err) {
      setCookieTestResult({ success: false, message: err instanceof Error ? err.message : '上传异常' });
    } finally {
      setIsUploadingCookie(false);
      e.target.value = '';
    }
  };

  const handleDownloadData = async () => {
    setIsDownloadingData(true);
    try {
      const res = await fetch('/api/builds');
      const data = await safeJson(res);
      if (!res.ok) throw new Error('获取数据失败');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'data.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('数据文件 data.json 已开始下载');
    } catch (err) { showToast(err instanceof Error ? err.message : '下载数据失败', 'warn'); }
    finally { setIsDownloadingData(false); }
  };

  const handleDownloadSettingsFile = async () => {
    setIsDownloadingSettings(true);
    try {
      const res = await fetch('/api/config/settings-file');
      const data = await safeJson(res);
      if (!res.ok) throw new Error('获取配置失败');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'collect_settings.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('配置文件 collect_settings.json 已开始下载');
    } catch (err) { showToast(err instanceof Error ? err.message : '下载配置失败', 'warn'); }
    finally { setIsDownloadingSettings(false); }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftData(prev => {
        const oldIndex = prev.findIndex(g => g.id === active.id);
        const newIndex = prev.findIndex(g => g.id === over.id);
        return (oldIndex !== -1 && newIndex !== -1) ? arrayMove(prev, oldIndex, newIndex) : prev;
      });
    }
  };

  const [sortBy, setSortBy] = useState('default');
  const sourceData = isEditing ? draftData : savedData;
  const viewData = sourceData.filter(g => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.variants.some(v => (v.buildType || '').toLowerCase().includes(q) || (v.code || '').toLowerCase().includes(q));
    }
    return activeTab === 'home' ? true : g.category === activeTab;
  }).sort((a, b) => {
    const pinA = a.pinned ? 1 : 0; const pinB = b.pinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh-CN');
    if (sortBy === 'date') {
      const dateA = a.variants.length > 0 ? a.variants.reduce((max, v) => v.date > max ? v.date : max, a.variants[0].date) : '';
      const dateB = b.variants.length > 0 ? b.variants.reduce((max, v) => v.date > max ? v.date : max, b.variants[0].date) : '';
      return dateB.localeCompare(dateA);
    }
    if (sortBy === 'price') {
      const parsePrice = (s: string) => { let n = parseFloat(s.replace(/[^0-9.]/g, '')) || 0; if (s.toLowerCase().includes('w')) n *= 10000; return n; };
      const priceA = a.variants.length > 0 ? Math.max(...a.variants.map(v => parsePrice(v.price))) : 0;
      const priceB = b.variants.length > 0 ? Math.max(...b.variants.map(v => parsePrice(v.price))) : 0;
      return priceB - priceA;
    }
    return 0;
  });

  const sidebarWidthClasses = sidebarWidthClassMap[theme.uiPreferences.sidebarWidth];
  const gridClassName = cn('grid grid-cols-1 md:grid-cols-2 relative', theme.uiPreferences.gridColumns === 3 ? 'xl:grid-cols-3 2xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4', gridGapClassMap[theme.uiPreferences.gridGap]);

  return (
    <>
      <style>{`:root { --color-emerald-500: ${theme.customTheme.themeColor}; --color-emerald-600: ${theme.customTheme.themeColor}; --color-emerald-50: ${theme.customTheme.themeColor}1A; }`}</style>
      <div className="flex min-h-screen bg-[#F8F9FA] dark:bg-[#0b0b0c] selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300" style={{ color: theme.isDarkMode ? theme.customTheme.textColorDark : theme.customTheme.textColorLight, '--user-gun-color': theme.isDarkMode ? theme.customTheme.gunNameColorDark : theme.customTheme.gunNameColorLight } as React.CSSProperties}>
        <Drawer activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setActiveTab('settings')} uiPreferences={theme.uiPreferences} isEditing={isEditing} updateUiPreference={theme.updateUiPreference} />
        <main className={cn('flex-1 p-4 md:p-6 lg:p-8 pb-32 transition-all duration-300 w-full', theme.uiPreferences.drawerOpenPc ? (theme.uiPreferences.drawerPositionPc === 'right' ? sidebarWidthClasses.mainRight : sidebarWidthClasses.mainLeft) : 'mx-0')}>
          <div className="md:hidden fixed left-4 bottom-24 z-40 pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400/90 dark:text-zinc-500/90">{mobileVersionLabel}</span>
          </div>
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'community' ? <CommunityPage /> : activeTab === 'settings' ? (
              <SettingsPage
                uiPreferences={theme.uiPreferences}
                customTheme={theme.customTheme}
                setCustomTheme={theme.setCustomTheme}
                resetTheme={theme.resetTheme}
                isDownloadingData={isDownloadingData}
                handleDownloadData={handleDownloadData}
                isDownloadingSettings={isDownloadingSettings}
                handleDownloadSettingsFile={handleDownloadSettingsFile}
                cookieStatus={cookieStatus}
                isUploadingCookie={isUploadingCookie}
                handleCookieUpload={handleCookieUpload}
                cookieTestResult={cookieTestResult}
                dailyPwdLogs={daily.dailyPwdLogs}
                isRefreshingDailyPwd={daily.isRefreshingDailyPwd}
                handleRefreshDailyPwd={daily.handleRefreshDailyPwd}
              />
            ) : (
              <>
                <Header isEditing={isEditing} onEditStart={handleEditStart} onSave={handleSave} onCancel={handleCancel} onAddNew={() => setIsModalOpen(true)} onOpenCollect={() => setActiveModal('mode-select')} sortBy={sortBy} onSortChange={setSortBy} isDarkMode={theme.isDarkMode} onToggleDarkMode={() => theme.setIsDarkMode(!theme.isDarkMode)} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchSuggestions={Array.from(new Set(sourceData.map(g => g.name)))} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />
                {isRefreshingData && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in"><Loader2 size={24} className="animate-spin text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500">正在加载...</p></div>
                ) : savedDataLoadError && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in"><AlertCircle size={24} className="text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500 mb-4">{savedDataLoadError}</p><button onClick={() => fetchData(false)} className="px-4 py-2 bg-zinc-900 text-white text-[12px] font-bold rounded-xl hover:bg-zinc-800 transition">重试</button></div>
                ) : (
                  <>
                    <div className="mb-6 pl-1 mt-2">
                      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                        <div>
                          <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2"><span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-500">马坤时代</span> <span className="text-zinc-300 font-bold tracking-normal opacity-50 text-2xl">/ Base</span></h1>
                          <p className="text-[13px] opacity-70 font-medium max-w-lg">专注修脚。基于顶级重回修脚时代架构运行。</p>
                        </div>
                        <DailyPwdCard dailyPwd={daily.dailyPwd} copiedDailyPwdKey={daily.copiedDailyPwdKey} handleCopyDailyPwd={daily.handleCopyDailyPwd} />
                      </div>
                    </div>
                    {isEditing && (
                      <EditCustomizePanel uiPreferences={theme.uiPreferences} updateUiPreference={theme.updateUiPreference} resetUiPreferences={() => theme.setUiPreferences(require('./utils').DEFAULT_UI_PREFERENCES)} />
                    )}
                    {isEditing && sortBy === 'default' ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                        <SortableContext items={viewData.map(g => g.id)} strategy={rectSortingStrategy}>
                          <div className={gridClassName}>
                            {viewData.map((group, idx) => (
                              <SortableGunCard key={`${activeTab}-${group.id}`} group={group} idx={idx} isEditing={isEditing} activeTab={activeTab} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} onUpdateVariant={handleUpdateVariant} onDeleteVariant={handleDeleteVariant} onAddVariant={handleAddVariant} onReorderVariants={handleReorderVariants} onTogglePin={handleTogglePin} cardSize={theme.uiPreferences.cardSize} cardMinHeight={theme.uiPreferences.cardMinHeight} variantsPerPage={theme.uiPreferences.variantsPerPage} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className={gridClassName}>
                        {viewData.map((group, idx) => (
                          <div key={`${activeTab}-${group.id}`} className="self-start animate-fade-in w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl" style={{ animationDelay: `${idx * 0.04}s` }}>
                            <GunCard group={group} isEditing={isEditing} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} onUpdateVariant={handleUpdateVariant} onDeleteVariant={handleDeleteVariant} onAddVariant={handleAddVariant} onReorderVariants={handleReorderVariants} onTogglePin={handleTogglePin} cardSize={theme.uiPreferences.cardSize} cardMinHeight={theme.uiPreferences.cardMinHeight} variantsPerPage={theme.uiPreferences.variantsPerPage} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />
                          </div>
                        ))}
                      </div>
                    )}
                    {viewData.length === 0 && (
                      <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-400 animate-fade-in"><div className="w-16 h-16 bg-white shadow-sm border border-zinc-200/50 rounded-2xl flex items-center justify-center mb-4"><Sparkles size={24} className="text-zinc-300" /></div><p className="font-bold text-xs tracking-widest uppercase text-zinc-500">该分类下暂无任何条目</p></div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <div className="fixed inset-0 pointer-events-none z-[-1]" style={{ backgroundImage: 'linear-gradient(to right, #00000004 1px, transparent 1px), linear-gradient(to bottom, #00000004 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      {isModalOpen && <AddGunModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmNewGun} />}
      {activeModal === 'mode-select' && <ModeSelectModal onClose={() => setActiveModal('none')} onSelectManual={() => setActiveModal('collect')} onSelectAuto={() => setActiveModal('auto-collect')} />}
      {activeModal === 'auto-collect' && (
        <AutoCollectConfigModal
          onClose={() => setActiveModal('none')}
          config={autoCollectConfig}
          setConfig={setAutoConfig}
          meta={collectMeta}
          isSaving={isSavingAuto}
          onSave={async () => {
            setIsSavingAuto(true);
            try {
              const res = await fetch('/api/collect/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: autoCollectConfig.enabled, model: autoCollectConfig.model, intervalHours: autoCollectConfig.intervalHours || 1, creatorIds: autoCollectConfig.creatorIds || [] }) });
              const data = await safeJson(res);
              if (!res.ok) throw new Error(data?.error || '保存配置失败');
              showToast('自动采集配置已保存');
            } catch(e) { showToast(e instanceof Error ? e.message : '保存配置失败', 'warn'); }
            finally { setIsSavingAuto(false); }
          }}
        />
      )}
      {activeModal === 'collect' && (
        <CollectModal isOpen={activeModal === 'collect'} isSearching={isSearchingCollect || isRefreshingData} isPreviewing={isPreviewingCollect} isTestingModel={isTestingModel} isApplying={isApplyingCollect} meta={collectMeta} searchResult={collectSearchResult} selectedVideoIds={selectedVideoIds} selectedModel={selectedModel} selectedProviderId={selectedProviderId} modelTestResult={modelTestResult} preview={collectPreview} presetGunInput={presetGunInput} isSavingPresetGuns={isSavingPresetGuns} isProviderModalOpen={isProviderModalOpen} providerForm={providerForm} isFetchingProviderModels={isFetchingProviderModels} isSavingProvider={isSavingProvider} searchConcurrencyEnabled={searchConcurrencyEnabled} applyConcurrencyEnabled={applyConcurrencyEnabled} onClose={handleCloseCollectModal} onSearch={handleSearchCollect} onCancelSearch={handleCancelSearch} onSelectedVideoIdsChange={setSelectedVideoIds} onSelectedModelChange={setSelectedModel} onSelectedProviderIdChange={setSelectedProviderId} onTestModel={handleTestModel} onApply={handleApplyCollect} onPresetGunInputChange={setPresetGunInput} onSavePresetGuns={handleSavePresetGuns} onOpenProviderModal={() => setIsProviderModalOpen(true)} onCloseProviderModal={() => setIsProviderModalOpen(false)} onProviderFormChange={setProviderForm} onFetchProviderModels={handleFetchProviderModels} onSaveProvider={handleSaveProvider} onDeleteProvider={handleDeleteProvider} onSearchConcurrencyChange={(value) => void handleSaveConcurrency(value, applyConcurrencyEnabled)} onApplyConcurrencyChange={(value) => void handleSaveConcurrency(searchConcurrencyEnabled, value)} />
      )}
      {toast && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_12px_44px_rgba(0,0,0,0.12)] pointer-events-none animate-fade-in" style={{ backgroundColor: toast.type === 'success' ? '#18181B' : toast.type === 'error' ? '#B91C1C' : '#DC2626' }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5} /> : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />}
          <span className="text-white font-bold text-[13px] tracking-wide">{toast.msg}</span>
        </div>
      )}
    </>
  );
}
