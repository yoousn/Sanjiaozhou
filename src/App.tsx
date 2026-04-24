import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, Radio } from 'lucide-react';
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
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GunCard } from './components/GunCard';
import { AddGunModal } from './components/AddGunModal';
import { CollectModal } from './components/CollectModal';
import { useToast } from './components/useToast';
import { cn } from './utils';

import { CSS } from '@dnd-kit/utilities';
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
  useSortable
} from '@dnd-kit/sortable';

type SortableGunCardProps = React.ComponentProps<typeof GunCard> & {
  idx: number;
  activeTab: string;
};

function SortableGunCard({ group, idx, isEditing, activeTab, ...props }: SortableGunCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
    position: 'relative' as const,
  };

  if (!isEditing) {
    return (
      <div
        className="self-start animate-fade-in w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl"
        style={{ animationDelay: `${idx * 0.04}s` }}
      >
        <GunCard group={group} isEditing={false} {...props} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="self-start w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <GunCard
        group={group}
        isEditing={true}
        cardDragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
}

const EMPTY_META: CollectMeta = {
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

const EMPTY_PROVIDER_FORM: CollectModelProviderInput = {
  id: '',
  name: '',
  baseUrl: '',
  apiKey: '',
  models: [],
  selectedModel: '',
};

const EMPTY_SEARCH: CollectSearchResult = {
  creators: [],
  guns: [],
  creatorIds: [],
  videos: [],
  logs: [],
  errors: [],
  requestId: '',
  isPending: false,
};

function normalizeCollectSearchResult(
  data: Partial<CollectSearchResult> | null | undefined,
  fallback: { guns?: string[]; creatorIds?: string[]; requestId?: string; isPending?: boolean } = {}
): CollectSearchResult {
  return {
    creators: Array.isArray(data?.creators) ? data.creators : [],
    guns: Array.isArray(data?.guns) ? data.guns : (fallback.guns || []),
    creatorIds: Array.isArray(data?.creatorIds) ? data.creatorIds : (fallback.creatorIds || []),
    videos: Array.isArray(data?.videos) ? data.videos : [],
    logs: Array.isArray(data?.logs) ? data.logs : [],
    errors: Array.isArray(data?.errors) ? data.errors : [],
    requestId: typeof data?.requestId === 'string' ? data.requestId : (fallback.requestId || ''),
    isPending: typeof data?.isPending === 'boolean' ? data.isPending : Boolean(fallback.isPending),
  };
}

function buildModelOptionValue(providerId: string, model: string) {
  return `${providerId}::${model}`;
}

function parseModelOptionValue(value: string) {
  const [providerId = '', ...modelParts] = (value || '').split('::');
  return {
    providerId,
    model: modelParts.join('::'),
  };
}

function normalizeCollectMeta(data: Partial<CollectMeta> | null | undefined): CollectMeta {
  const providers = Array.isArray(data?.providers) ? data.providers.map((provider) => ({
    id: String(provider.id || ''),
    name: String(provider.name || ''),
    baseUrl: String(provider.baseUrl || ''),
    models: Array.isArray(provider.models) ? provider.models.map(String) : [],
    hasApiKey: Boolean(provider.hasApiKey),
  })) : [];

  const modelOptions = Array.isArray(data?.modelOptions) ? data.modelOptions.map((option) => ({
    value: String(option.value || ''),
    providerId: String(option.providerId || ''),
    providerName: String(option.providerName || ''),
    model: String(option.model || ''),
    label: String(option.label || ''),
  })) : [];

  return {
    creators: Array.isArray(data?.creators) ? data.creators : [],
    models: Array.isArray(data?.models) ? data.models.map(String) : [],
    defaultModel: String(data?.defaultModel || ''),
    defaultGuns: Array.isArray(data?.defaultGuns) ? data.defaultGuns.map(String) : [],
    providers,
    modelOptions,
    concurrency: {
      searchEnabled: Boolean(data?.concurrency?.searchEnabled),
      applyEnabled: Boolean(data?.concurrency?.applyEnabled),
    },
  };
}

function normalizePresetGunsInput(value: string) {
  return [...new Set(value.split(/[，,\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function buildProviderFormFromMeta(meta: CollectMeta, providerId: string): CollectModelProviderInput {
  const provider = meta.providers.find((item) => item.id === providerId);
  const selectedOption = meta.modelOptions.find((option) => option.providerId === providerId);
  return {
    id: provider?.id || '',
    name: provider?.name || '',
    baseUrl: provider?.baseUrl || '',
    apiKey: '',
    models: provider?.models || [],
    selectedModel: selectedOption?.model || provider?.models[0] || '',
  };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.warn('API returned invalid JSON:', text);
    return {};
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'mode-select' | 'collect' | 'auto-collect' | 'settings'>('none');
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

  type CustomTheme = {
    themeColor: string;
    textColorLight: string;
    textColorDark: string;
    gunNameColorLight: string;
    gunNameColorDark: string;
  };
  const DEFAULT_THEME: CustomTheme = {
    themeColor: '#10b981',
    textColorLight: '#18181b',
    textColorDark: '#f4f4f5',
    gunNameColorLight: '#18181b',
    gunNameColorDark: '#f4f4f5',
  };
  const [customTheme, setCustomTheme] = useState<CustomTheme>(() => {
    try {
      const saved = localStorage.getItem('customTheme');
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
  }, [customTheme]);

  const [autoCollectConfig, setAutoConfig] = useState({ 
    enabled: false, 
    model: '', 
    intervalHours: 1,
    creatorIds: [] as string[],
    logs: [] as any[] 
  });
  const [isSavingAuto, setIsSavingAuto] = useState(false);
  const { toast, showToast } = useToast();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const stopSearchPolling = () => {
    if (searchPollRef.current !== null) {
      window.clearInterval(searchPollRef.current);
      searchPollRef.current = null;
    }
  };

  const [savedData, setSavedData] = useState<GunGroup[]>([]);
  const [draftData, setDraftData] = useState<GunGroup[]>([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  useEffect(() => {
    const fetchData = (silent = false) => {
      if (!silent) {
        setIsRefreshingData(true);
      }

      fetch('/api/builds')
        .then(safeJson)
        .then(data => {
          setSavedData(data);
        })
        .catch(err => {
          console.error('加载失败:', err);
        })
        .finally(() => {
          if (!silent) {
            setIsRefreshingData(false);
          }
        });
    };

    fetchData(true);

    const interval = setInterval(() => {
      if (!isEditing && activeModal === 'none' && !isSearchingCollect && !isPreviewingCollect && !isApplyingCollect) {
        fetchData(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isEditing, activeModal, isSearchingCollect, isPreviewingCollect, isApplyingCollect]);

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
        setSelectedModel((prev: string) => {
          if (prev && data.modelOptions.some((option) => option.value === prev)) {
            return prev;
          }
          return data.defaultModel || '';
        });
        setSelectedProviderId((prev) => {
          const providerId = prev || parseModelOptionValue(data.defaultModel).providerId || data.providers[0]?.id || '';
          return data.providers.some((provider) => provider.id === providerId) ? providerId : (data.providers[0]?.id || '');
        });
      })
      .catch(err => {
        console.error('加载采集配置失败:', err);
        showToast('加载采集配置失败', 'warn');
      });
  }, [activeModal]);

  useEffect(() => {
    if (!isProviderModalOpen) return;
    setProviderForm(buildProviderFormFromMeta(collectMeta, selectedProviderId));
  }, [isProviderModalOpen, collectMeta, selectedProviderId]);

  const refreshCollectMeta = async () => {
    const res = await fetch('/api/collect/meta');
    const rawData = await safeJson(res);
    if (!res.ok) {
      throw new Error(rawData?.error || '加载采集配置失败');
    }
    const data = normalizeCollectMeta(rawData);
    setCollectMeta(data);
    setPresetGunInput(data.defaultGuns.join(', '));
    setSearchConcurrencyEnabled(data.concurrency.searchEnabled);
    setApplyConcurrencyEnabled(data.concurrency.applyEnabled);
    setSelectedModel((prev) => prev && data.modelOptions.some((option) => option.value === prev) ? prev : (data.defaultModel || ''));
    setSelectedProviderId((prev) => data.providers.some((provider) => provider.id === prev) ? prev : (parseModelOptionValue(data.defaultModel).providerId || data.providers[0]?.id || ''));
    return data;
  };

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
      console.error('保存预设枪械失败:', error);
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
        body: JSON.stringify({
          baseUrl: providerForm.baseUrl,
          apiKey: providerForm.apiKey,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '获取模型列表失败');
      const models = Array.isArray(data?.models) ? data.models.map(String) : [];
      setProviderForm((prev) => ({
        ...prev,
        models,
        selectedModel: models.includes(prev.selectedModel || '') ? (prev.selectedModel || '') : (models[0] || ''),
      }));
      showToast(`已获取 ${models.length} 个模型`);
    } catch (error) {
      console.error('获取模型列表失败:', error);
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
      const nextProviderId = providerForm.id || nextMeta.providers.find((provider) => provider.baseUrl === providerForm.baseUrl && provider.name === providerForm.name)?.id || '';
      setCollectMeta(nextMeta);
      setSelectedProviderId(nextProviderId || parseModelOptionValue(nextMeta.defaultModel).providerId || nextMeta.providers[0]?.id || '');
      if (providerForm.selectedModel) {
        const nextValue = buildModelOptionValue(nextProviderId, providerForm.selectedModel);
        setSelectedModel(nextMeta.modelOptions.some((option) => option.value === nextValue) ? nextValue : nextMeta.defaultModel);
      } else {
        setSelectedModel(nextMeta.defaultModel);
      }
      setIsProviderModalOpen(false);
      showToast('模型源已保存');
    } catch (error) {
      console.error('保存模型源失败:', error);
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
      console.error('删除模型源失败:', error);
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
        body: JSON.stringify({
          searchEnabled: nextSearchEnabled,
          applyEnabled: nextApplyEnabled,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '保存并发配置失败');
      setCollectMeta(normalizeCollectMeta(data?.meta));
    } catch (error) {
      console.error('保存并发配置失败:', error);
      showToast(error instanceof Error ? error.message : '保存并发配置失败', 'warn');
    }
  };

  const requestDeleteGroup = (groupId: string) => {
    const group = draftData.find(g => g.id === groupId);
    handleDeleteGroup(groupId);
    showToast(`已删除枪系 ${group?.name || ''}`, 'warn');
  };

  const requestDeleteVariant = (groupId: string, variantId: string) => {
    const group = draftData.find(g => g.id === groupId);
    const variant = group?.variants.find(v => v.id === variantId);
    handleDeleteVariant(groupId, variantId);
    showToast(`已删除配置 ${variant?.buildType || '该配置'}`, 'warn');
  };

  const [sortBy, setSortBy] = useState('default');

  const sourceData = isEditing ? draftData : savedData;
  const viewData = sourceData.filter(g => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.name.toLowerCase().includes(q) || 
             g.variants.some(v => (v.buildType || '').toLowerCase().includes(q) || (v.code || '').toLowerCase().includes(q));
    }
    if (activeTab === 'home') return true;
    return g.category === activeTab;
  }).sort((a, b) => {
      const pinA = (a as any).pinned ? 1 : 0;
      const pinB = (b as any).pinned ? 1 : 0;
      if (pinA !== pinB) {
        return pinB - pinA;
      }

    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'zh-CN');
    }
    if (sortBy === 'date') {
      const dateA = a.variants.length > 0 ? a.variants.reduce((max, v) => v.date > max ? v.date : max, a.variants[0].date) : '';
      const dateB = b.variants.length > 0 ? b.variants.reduce((max, v) => v.date > max ? v.date : max, b.variants[0].date) : '';
      return dateB.localeCompare(dateA);
    }
    if (sortBy === 'price') {
      const parsePrice = (priceStr: string) => {
        let num = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        if (priceStr.toLowerCase().includes('w')) num *= 10000;
        return num;
      };
      const priceA = a.variants.length > 0 ? Math.max(...a.variants.map(v => parsePrice(v.price))) : 0;
      const priceB = b.variants.length > 0 ? Math.max(...b.variants.map(v => parsePrice(v.price))) : 0;
      return priceB - priceA;
    }
    return 0;
  });

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
      setSavedData(draftData);
      setIsEditing(false);
      showToast('已保存！');
    } catch (e) {
      console.error('保存失败:', e);
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
      setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, pinned: !(g as any).pinned } : g));
      return;
    }

    const updateFn = (prev: GunGroup[]) => prev.map(g => g.id === groupId ? { ...g, pinned: !(g as any).pinned } : g);
    const newSavedData = updateFn(savedData);
    setSavedData(newSavedData);
    
    try {
      await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSavedData)
      });
    } catch(e) {
      console.error('置顶保存失败:', e);
      showToast('置顶失败，请检查网络', 'warn');
    }
  };

  const handleUpdateVariant = (groupId: string, variantId: string, field: keyof GunVariant, val: string | boolean) => {
    setDraftData(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          variants: g.variants.map(v => v.id === variantId ? { ...v, [field]: val } : v)
        };
      }
      return g;
    }));
  };

  const handleDeleteVariant = (groupId: string, variantId: string) => {
    setDraftData(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, variants: g.variants.filter(v => v.id !== variantId) };
      }
      return g;
    }));
  };

  const handleAddVariant = (groupId: string) => {
    const newVariant: GunVariant = {
      id: `v_${Date.now()}`,
      tier: 'T1',
      price: '10W',
      buildType: '新配置',
      code: '',
      date: new Date().toISOString().split('T')[0],
      author: '',
      sourceUrl: '',
      locked: false,
    };
    setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, variants: [...g.variants, newVariant] } : g));
  };

  const handleConfirmNewGun = (name: string, category: string, variantProps: Omit<GunVariant, 'id'>) => {
    const newGroupId = `g_${Date.now()}`;
    const newGroup: GunGroup = {
      id: newGroupId,
      name,
      category,
      variants: [{ id: `v_${Date.now()}`, ...variantProps }]
    };
    setDraftData(prev => [newGroup, ...prev]);
    setIsModalOpen(false);
    showToast('已新增枪械体系！');
  };

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
      if (!requestId) {
        throw new Error('搜索任务创建失败');
      }

      setCollectSearchResult(normalizeCollectSearchResult(null, {
        guns,
        creatorIds,
        requestId,
        isPending: true,
      }));
      setSelectedModel((prev) => prev || collectMeta.defaultModel || '');

      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`/api/collect/search/status/${encodeURIComponent(requestId)}`);
          const statusData = await safeJson(statusRes);
          if (!statusRes.ok) throw new Error(statusData?.error || '搜索状态获取失败');

          const isDone = Boolean(statusData?.done);
          const result = statusData?.result as Partial<CollectSearchResult> | undefined;
          const nextResult = normalizeCollectSearchResult(result || {
            guns,
            creatorIds,
            logs: statusData?.logs,
            errors: statusData?.error ? [String(statusData.error)] : [],
          }, {
            guns,
            creatorIds,
            requestId,
            isPending: !isDone,
          });

          setCollectSearchResult({
            ...nextResult,
            logs: Array.isArray(statusData?.logs) ? statusData.logs : nextResult.logs,
            errors: statusData?.error
              ? [...(nextResult.errors || []), String(statusData.error)]
              : nextResult.errors,
            requestId,
            isPending: !isDone,
          });

          if (!isDone) {
            return false;
          }

          stopSearchPolling();
          setIsSearchingCollect(false);

          if (nextResult.videos.length > 0) {
            showToast(`已命中 ${nextResult.videos.length} 个视频`);
          } else if ((nextResult.errors || []).length > 0) {
            showToast(nextResult.errors![0], 'warn');
          } else {
            showToast('搜索完成，但没有命中视频', 'warn');
          }

          return true;
        } catch (error) {
          stopSearchPolling();
          setIsSearchingCollect(false);
          const message = error instanceof Error ? error.message : '搜索状态获取失败';
          setCollectSearchResult(normalizeCollectSearchResult({
            logs: [{ timestamp: Date.now(), stage: 'request-error', message }],
            errors: [message],
          }, { guns, creatorIds, requestId, isPending: false }));
          showToast(message, 'warn');
          return true;
        }
      };

      const finishedImmediately = await pollStatus();
      if (!finishedImmediately && searchPollRef.current === null && startData?.success) {
        searchPollRef.current = window.setInterval(() => {
          void pollStatus();
        }, 1200);
      }
    } catch (e) {
      stopSearchPolling();
      console.error('搜索失败:', e);
      const message = e instanceof Error ? e.message : '搜索失败';
      setCollectSearchResult(normalizeCollectSearchResult({
        logs: [{ timestamp: Date.now(), stage: 'request-error', message }],
        errors: [message],
      }, { guns, creatorIds, isPending: false }));
      setIsSearchingCollect(false);
      showToast(message, 'warn');
    }
  };

  const handleCancelSearch = async () => {
    if (collectSearchResult.requestId && isSearchingCollect) {
      try {
        await fetch(`/api/collect/search/cancel/${encodeURIComponent(collectSearchResult.requestId)}`, { method: 'POST' });
      } catch (e) {
        console.error('取消搜索失败:', e);
      }
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
      const nextPreview: CollectPreview = {
        ...data,
        groups: Array.isArray(data?.groups) ? data.groups : [],
        errors: Array.isArray(data?.errors) ? data.errors : [],
      };
      setCollectPreview(nextPreview);
      return nextPreview;
    } catch (e) {
      console.error('预览失败:', e);
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
      console.error('模型测试失败:', e);
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

    const selectedVideos = (collectSearchResult.videos || []).filter((video) => video && videoIds.includes(video.id));
    const previewResult = await handlePreviewCollect(guns, creatorIds, videoIds, model, selectedVideos);
    if (!previewResult.groups || previewResult.groups.length === 0) {
      if (previewResult.errors?.length) {
        showToast(previewResult.errors[0], 'warn');
      } else {
        showToast('没有可加入的网站内容', 'warn');
      }
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
      console.error('写入失败:', e);
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

  const handleReorderVariants = (groupId: string, activeId: string, overId: string) => {
    setDraftData(prev => prev.map(g => {
      if (g.id === groupId) {
        const oldIndex = g.variants.findIndex(v => v.id === activeId);
        const newIndex = g.variants.findIndex(v => v.id === overId);
        return {
          ...g,
          variants: arrayMove(g.variants, oldIndex, newIndex)
        };
      }
      return g;
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftData(prev => {
        const oldIndex = prev.findIndex(g => g.id === active.id);
        const newIndex = prev.findIndex(g => g.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  };

  return (
    <>
      <style>{`
        :root {
          --color-emerald-500: ${customTheme.themeColor};
          --color-emerald-600: ${customTheme.themeColor};
          --color-emerald-50: ${customTheme.themeColor}1A;
        }
      `}</style>
      <div 
        className="flex min-h-screen bg-[#F8F9FA] dark:bg-[#0b0b0c] selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300"
        style={{ 
          color: isDarkMode ? customTheme.textColorDark : customTheme.textColorLight,
          '--user-gun-color': isDarkMode ? customTheme.gunNameColorDark : customTheme.gunNameColorLight,
        } as React.CSSProperties}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setActiveModal('settings')} />

      <main className="flex-1 md:ml-20 lg:ml-56 p-4 md:p-6 lg:p-8 pb-32">
        <div className="max-w-[1600px] mx-auto">
          <Header
            isEditing={isEditing}
            onEditStart={handleEditStart}
            onSave={handleSave}
            onCancel={handleCancel}
            onAddNew={() => setIsModalOpen(true)}
            onOpenCollect={() => setActiveModal('mode-select')}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchSuggestions={Array.from(new Set(sourceData.map(g => g.name)))}
          />

          <div className="mb-6 pl-1 mt-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2" style={{ color: 'inherit' }}>
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-500">马坤时代</span> <span className="text-zinc-300 font-bold tracking-normal opacity-50 text-2xl">/ Base</span>
            </h1>
            <p className="text-[13px] opacity-70 font-medium max-w-lg" style={{ color: 'inherit' }}>
              专注修脚。基于顶级重回修脚时代架构运行。
            </p>
          </div>

          {isEditing && sortBy === 'default' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCardDragEnd}
            >
              <SortableContext items={viewData.map(g => g.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 relative">
                  {viewData.map((group, idx) => (
                    <SortableGunCard
                      key={`${activeTab}-${group.id}`}
                      group={group}
                      idx={idx}
                      isEditing={isEditing}
                      activeTab={activeTab}
                      onUpdateGroup={handleUpdateGroup}
                      onDeleteGroup={requestDeleteGroup}
                      onUpdateVariant={handleUpdateVariant}
                      onDeleteVariant={requestDeleteVariant}
                      onAddVariant={handleAddVariant}
                      onReorderVariants={handleReorderVariants}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                  {viewData.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-400 animate-fade-in">
                      <div className="w-16 h-16 bg-white shadow-sm border border-zinc-200/50 rounded-2xl flex items-center justify-center mb-4">
                        <Sparkles size={24} className="text-zinc-300" />
                      </div>
                      <p className="font-bold text-xs tracking-widest uppercase text-zinc-500">该分类下暂无任何条目</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 relative">
              {viewData.map((group, idx) => (
                <div
                  key={`${activeTab}-${group.id}`}
                  className="self-start animate-fade-in w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <GunCard
                    group={group}
                    isEditing={isEditing}
                    onUpdateGroup={handleUpdateGroup}
                    onDeleteGroup={requestDeleteGroup}
                    onUpdateVariant={handleUpdateVariant}
                    onDeleteVariant={requestDeleteVariant}
                    onAddVariant={handleAddVariant}
                    onReorderVariants={handleReorderVariants}
                    onTogglePin={handleTogglePin}
                  />
                </div>
              ))}

              {viewData.length === 0 && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-400 animate-fade-in">
                  <div className="w-16 h-16 bg-white shadow-sm border border-zinc-200/50 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-zinc-300" />
                  </div>
                  <p className="font-bold text-xs tracking-widest uppercase text-zinc-500">该分类下暂无任何条目</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-0 pointer-events-none z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #00000004 1px, transparent 1px), linear-gradient(to bottom, #00000004 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}>
      </div>

      {isModalOpen && (
        <AddGunModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmNewGun}
        />
      )}

      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60" onClick={() => setActiveModal('none')} />
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-md flex flex-col gap-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-black text-zinc-900 dark:text-white">外观设置</h3>
               <button onClick={() => setActiveModal('none')} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"><X size={16} strokeWidth={2.5}/></button>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">主题强调色</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={customTheme.themeColor} onChange={e => setCustomTheme(p => ({...p, themeColor: e.target.value}))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                  <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase">{customTheme.themeColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">日间文字颜色</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={customTheme.textColorLight} onChange={e => setCustomTheme(p => ({...p, textColorLight: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">暗黑文字颜色</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={customTheme.textColorDark} onChange={e => setCustomTheme(p => ({...p, textColorDark: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">日间枪械名颜色</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={customTheme.gunNameColorLight} onChange={e => setCustomTheme(p => ({...p, gunNameColorLight: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">暗黑枪械名颜色</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={customTheme.gunNameColorDark} onChange={e => setCustomTheme(p => ({...p, gunNameColorDark: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setCustomTheme(DEFAULT_THEME)} className="text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">恢复默认配置</button>
              <button onClick={() => setActiveModal('none')} className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-black rounded-xl hover:opacity-80 transition active:scale-95">完成</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'mode-select' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60" onClick={() => setActiveModal('none')} />
          <div className="bg-white rounded-3xl p-8 relative z-10 w-full max-w-sm flex flex-col gap-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-black text-zinc-900">选择采集模式</h3>
               <button onClick={() => setActiveModal('none')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="grid gap-3">
              <button onClick={() => setActiveModal('collect')} className="py-4 px-4 border border-zinc-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 font-bold text-zinc-700 hover:text-emerald-700 transition flex items-center justify-between text-left">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[14px]">手动采集</span>
                  <span className="text-[11px] font-medium text-zinc-500">自己搜索并勾选视频加入网站</span>
                </div>
                <Radio size={18} strokeWidth={2.5}/>
              </button>
              <button onClick={() => setActiveModal('auto-collect')} className="py-4 px-4 border border-zinc-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 font-bold text-zinc-700 hover:text-blue-700 transition flex items-center justify-between text-left">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[14px]">自动采集配置</span>
                  <span className="text-[11px] font-medium text-zinc-500">每小时自动获取聪聪最新视频</span>
                </div>
                <Sparkles size={18} strokeWidth={2.5}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'auto-collect' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60" onClick={() => setActiveModal('none')} />
          <div className="bg-white rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-2xl flex flex-col gap-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black text-zinc-900">自动采集设置</h3>
                 <p className="text-[12px] font-medium text-zinc-500 mt-1">后台智能比对记录，自动过滤重复视频并加入新卡片</p>
               </div>
               <button onClick={() => setActiveModal('none')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X size={16} strokeWidth={2.5}/></button>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200 mt-2">
              <span className="font-bold text-[13px]">开启后台定时采集</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoCollectConfig.enabled} onChange={e => {
                  const checked = e.target.checked;
                  setAutoConfig(p => ({...p, enabled: checked}));
                }} />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">监听博主 (多选)</label>
              <div className="flex flex-wrap gap-2">
                {collectMeta.creators.map(creator => {
                  const active = (autoCollectConfig.creatorIds || []).includes(creator.id);
                  return (
                    <button
                      key={creator.id}
                      onClick={() => setAutoConfig(p => ({
                        ...p,
                        creatorIds: active ? (p.creatorIds || []).filter(id => id !== creator.id) : [...(p.creatorIds || []), creator.id]
                      }))}
                      className={cn("px-3 py-1.5 rounded-xl border text-[12px] font-bold transition", active ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300")}
                    >
                      {creator.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">执行频率</label>
              <select value={autoCollectConfig.intervalHours || 1} onChange={e => setAutoConfig(p => ({...p, intervalHours: Number(e.target.value)}))} className="w-full border border-zinc-200 bg-white py-2.5 px-3 rounded-xl text-[13px] font-bold shadow-sm focus:ring-4 focus:ring-zinc-900/10 outline-none">
                <option value={1 / 60}>每 1 分钟检测一次 (测试专用)</option>
                <option value={1}>每 1 小时检测一次</option>
                <option value={2}>每 2 小时检测一次</option>
                <option value={4}>每 4 小时检测一次</option>
                <option value={12}>每 12 小时检测一次</option>
                <option value={24}>每 24 小时检测一次</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">使用的提取模型</label>
              <select 
                value={autoCollectConfig.model} 
                onChange={e => setAutoConfig(p => ({...p, model: e.target.value}))}
                className="w-full border border-zinc-200 bg-white py-2.5 px-3 rounded-xl text-[13px] font-bold shadow-sm focus:ring-4 focus:ring-zinc-900/10 outline-none"
              >
                <option value="">-- 请选择模型 --</option>
                {collectMeta.modelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={async () => {
                setIsSavingAuto(true);
                try {
                  const res = await fetch('/api/collect/auto', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ 
                       enabled: autoCollectConfig.enabled, 
                       model: autoCollectConfig.model,
                       intervalHours: autoCollectConfig.intervalHours || 1,
                       creatorIds: autoCollectConfig.creatorIds || []
                     })
                  });
                  const data = await safeJson(res);
                  if (!res.ok) throw new Error(data?.error || '保存配置失败');
                  showToast('自动采集配置已保存');
                } catch(e) {
                  showToast(e instanceof Error ? e.message : '保存配置失败', 'warn');
                } finally {
                  setIsSavingAuto(false);
                }
              }}
              disabled={isSavingAuto}
              className="py-3 bg-zinc-900 text-white rounded-2xl font-black text-[13px] hover:bg-zinc-800 transition disabled:opacity-60"
            >
              {isSavingAuto ? '保存中...' : '保存配置'}
            </button>

            <div className="mt-2 flex flex-col gap-2">
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">运行日志 (仅存最近100条)</h4>
              <div className="bg-zinc-900 text-zinc-300 font-mono text-[11px] p-4 rounded-2xl h-48 overflow-y-auto flex flex-col gap-2 shadow-inner">
                {(autoCollectConfig.logs || []).length === 0 ? (
                   <span className="opacity-50">暂无日志...</span>
                ) : (
                   (autoCollectConfig.logs || []).map((log, i) => (
                     <div key={i} className={log?.success ? "text-emerald-400" : "text-red-400"}>
                       <span className="text-zinc-500">[{log?.time}]</span> {log?.message}
                     </div>
                   ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'collect' && (
        <CollectModal
          isOpen={activeModal === 'collect'}
          isSearching={isSearchingCollect || isRefreshingData}
          isPreviewing={isPreviewingCollect}
          isTestingModel={isTestingModel}
          isApplying={isApplyingCollect}
          meta={collectMeta}
          searchResult={collectSearchResult}
          selectedVideoIds={selectedVideoIds}
          selectedModel={selectedModel}
          selectedProviderId={selectedProviderId}
          modelTestResult={modelTestResult}
          preview={collectPreview}
          presetGunInput={presetGunInput}
          isSavingPresetGuns={isSavingPresetGuns}
          isProviderModalOpen={isProviderModalOpen}
          providerForm={providerForm}
          isFetchingProviderModels={isFetchingProviderModels}
          isSavingProvider={isSavingProvider}
          searchConcurrencyEnabled={searchConcurrencyEnabled}
          applyConcurrencyEnabled={applyConcurrencyEnabled}
          onClose={handleCloseCollectModal}
          onSearch={handleSearchCollect}
          onCancelSearch={handleCancelSearch}
          onSelectedVideoIdsChange={setSelectedVideoIds}
          onSelectedModelChange={setSelectedModel}
          onSelectedProviderIdChange={setSelectedProviderId}
          onTestModel={handleTestModel}
          onApply={handleApplyCollect}
          onPresetGunInputChange={setPresetGunInput}
          onSavePresetGuns={handleSavePresetGuns}
          onOpenProviderModal={() => setIsProviderModalOpen(true)}
          onCloseProviderModal={() => setIsProviderModalOpen(false)}
          onProviderFormChange={setProviderForm}
          onFetchProviderModels={handleFetchProviderModels}
          onSaveProvider={handleSaveProvider}
          onDeleteProvider={handleDeleteProvider}
          onSearchConcurrencyChange={(value) => void handleSaveConcurrency(value, applyConcurrencyEnabled)}
          onApplyConcurrencyChange={(value) => void handleSaveConcurrency(searchConcurrencyEnabled, value)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_12px_44px_rgba(0,0,0,0.12)] pointer-events-none animate-fade-in"
          style={{ backgroundColor: toast.type === 'success' ? '#18181B' : '#DC2626' }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5} /> : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />}
          <span className="text-white font-bold text-[13px] tracking-wide">{toast.msg}</span>
        </div>
      )}
    </div>
    </>
  );
}
