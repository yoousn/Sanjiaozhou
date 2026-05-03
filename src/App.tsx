import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertCircle, Loader2, Sparkles, CheckCircle2, Home, Crosshair, Target } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { arrayMove } from '@dnd-kit/sortable';
import {
  GunGroup,
  GunVariant,
  CollectMeta,
  ModelTestResult,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GunCard } from './components/GunCard';
import { AddGunModal } from './components/AddGunModal';
import { SortableGunCard } from './components/SortableGunCard';
import { DailyPwdCard } from './components/DailyPwdCard';
import { EditCustomizePanel } from './components/EditCustomizePanel';
import { AutoCollectConfigModal, AutoCollectConfig } from './components/AutoCollectConfigModal';
import { AuthModal } from './components/AuthModal';
import { ModelConfigModal } from './components/ModelConfigModal';

const CommunityPage = React.lazy(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const SettingsPage = React.lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));

import { useToast } from './hooks/useToast';
import { useDailyPassword } from './hooks/useDailyPassword';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
} from './constants';
import {
  normalizeCollectMeta,
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

import { SortableCategoryWidget } from './components/SortableCategoryWidget';

export default function App() {
  const queryClient = useQueryClient();
  const mobileVersionLabel = `v${__APP_VERSION__}`;
  const { toast, showToast } = useToast();
  const theme = useTheme();
  const daily = useDailyPassword(showToast);
  const auth = useAuth();

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('active_nav_tab') || 'home');
  useEffect(() => {
    localStorage.setItem('active_nav_tab', activeTab);
  }, [activeTab]);

  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'auto-collect' | 'model-config' | 'auth'>('none');

  const [isTestingModel, setIsTestingModel] = useState(false);
  const [collectMeta, setCollectMeta] = useState<CollectMeta>(EMPTY_META);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER_FORM);
  const [fetchedProviderModels, setFetchedProviderModels] = useState<string[]>([]);
  const [isFetchingProviderModels, setIsFetchingProviderModels] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<ModelTestResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    backupModel: '',
    intervalHours: 1,
    creatorIds: [],
    logs: []
  });
  const [isSavingAuto, setIsSavingAuto] = useState(false);

  const [draftData, setDraftData] = useState<GunGroup[]>([]);

  const { data: savedData = [], isFetching: isRefreshingData, error: queryError, refetch } = useQuery({
    queryKey: ['builds'],
    queryFn: async () => {
      const res = await fetch('/api/builds');
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '加载失败');
      return data as GunGroup[];
    },
    refetchInterval: (query) => {
      if (isEditing || activeModal !== 'none') return false;
      return 60000;
    },
  });
  const savedDataLoadError = queryError instanceof Error ? queryError.message : null;

  const setSavedData = (newData: GunGroup[]) => {
    queryClient.setQueryData(['builds'], newData);
  };

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

  useEffect(() => {
    if (activeModal === 'auto-collect') {
      fetch('/api/collect/auto')
        .then(safeJson)
        .then(data => setAutoConfig({
           enabled: Boolean(data.enabled),
           model: data.model || '',
           backupModel: data.backupModel || '',
           intervalHours: Number(data.intervalHours) || 1,
           creatorIds: Array.isArray(data.creatorIds) ? data.creatorIds : [],
           logs: Array.isArray(data.logs) ? data.logs : [],
           hasRetry: Boolean(data.hasRetry),
           retryVideos: Array.isArray(data.retryVideos) ? data.retryVideos : []
        }));
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === 'auto-collect' || activeModal === 'model-config') {
      fetch('/api/collect/meta')
      .then(safeJson)
      .then((rawData) => {
        const data = normalizeCollectMeta(rawData);
        setCollectMeta(data);
        setSelectedModel((prev) => (prev && data.modelOptions.some(o => o.value === prev) ? prev : data.defaultModel || ''));
        setSelectedProviderId((prev) => {
          const providerId = prev || parseModelOptionValue(data.defaultModel).providerId || data.providers[0]?.id || '';
          return data.providers.some(p => p.id === providerId) ? providerId : (data.providers[0]?.id || '');
        });
      })
      .catch(err => {
        console.error('加载模型配置失败:', err);
        showToast('加载模型配置失败', 'warn');
      });
    }
  }, [activeModal, showToast]);

  useEffect(() => {
    if (activeModal !== 'model-config') return;
    if (selectedProviderId === '') return;
    setProviderForm(buildProviderFormFromMeta(collectMeta, selectedProviderId));
    setFetchedProviderModels([]);
  }, [activeModal, collectMeta, selectedProviderId]);

  const handleFetchProviderModels = async () => {
    if (!providerForm.baseUrl.trim()) {
      showToast('请先填写接口地址', 'warn');
      return;
    }
    setIsFetchingProviderModels(true);
    try {
      const res = await fetch('/api/collect/providers/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ baseUrl: providerForm.baseUrl, apiKey: providerForm.apiKey }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '获取模型列表失败');
      const models = Array.isArray(data?.models) ? data.models.map(String) : [];
      if (models.length === 0) {
        throw new Error(data?.error || '未获取到模型，请检查接口地址是否为 OpenAI 兼容地址');
      }
      setFetchedProviderModels(models);
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
    if (providerForm.models.length === 0) {
      showToast('请先获取模型', 'warn');
      return;
    }
    setIsSavingProvider(true);
    try {
      const res = await fetch('/api/collect/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
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
      const savedProvider = nextMeta.providers.find(p => p.baseUrl === providerForm.baseUrl && p.name === providerForm.name);
      const nextProviderId = providerForm.id || savedProvider?.id || '';
      const savedSelectedModel = data?.defaultModel ? String(data.defaultModel) : providerForm.selectedModel;
      setCollectMeta(nextMeta);
      setSelectedProviderId(nextProviderId || parseModelOptionValue(nextMeta.defaultModel).providerId || nextMeta.providers[0]?.id || '');
      if (savedSelectedModel && nextProviderId) {
        const nextValue = buildModelOptionValue(nextProviderId, savedSelectedModel);
        setSelectedModel(nextMeta.modelOptions.some(o => o.value === nextValue) ? nextValue : nextMeta.defaultModel);
      } else {
        setSelectedModel(nextMeta.defaultModel);
      }
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
        credentials: 'same-origin',
        body: JSON.stringify({ id: providerForm.id }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '删除模型源失败');
      const nextMeta = normalizeCollectMeta(data?.meta);
      setCollectMeta(nextMeta);
      setSelectedProviderId(parseModelOptionValue(nextMeta.defaultModel).providerId || nextMeta.providers[0]?.id || '');
      setSelectedModel(nextMeta.defaultModel || '');
      setFetchedProviderModels([]);
      showToast('模型源已删除', 'warn');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除模型源失败', 'warn');
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleChatModel = async (model: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    const res = await fetch('/api/model/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ model, messages }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || '模型回复失败');
    return data;
  };

  const handleTestModel = async (model: string) => {
    setIsTestingModel(true);
    setModelTestResult(null);
    try {
      const res = await fetch('/api/model/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ model }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '模型测试失败');
      if (!data?.success) throw new Error(data?.error || '模型测试失败');
      setModelTestResult(data);
      showToast('模型测试成功', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '模型测试失败';
      setModelTestResult({ model, success: false, latencyMs: 0, error: message });
      showToast(message, 'warn');
    } finally {
      setIsTestingModel(false);
    }
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
        credentials: 'same-origin',
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
      const res = await fetch('/api/builds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(newSavedData) });
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
      const res = await fetch('/api/config/cookie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ content }) });
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
    if (!over || active.id === over.id) return;

    const sortableItems = [...viewData.map(g => g.id)];
    const widgetIdx = Math.min(theme.uiPreferences.categoryWidgetIndex || 0, sortableItems.length);
    sortableItems.splice(widgetIdx, 0, 'category-widget');

    const oldIndex = sortableItems.indexOf(active.id as string);
    const newIndex = sortableItems.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(sortableItems, oldIndex, newIndex);
      const newWidgetIdx = newItems.indexOf('category-widget');
      
      if (newWidgetIdx !== widgetIdx) {
        theme.updateUiPreference('categoryWidgetIndex', newWidgetIdx);
      }

      if (active.id !== 'category-widget') {
        setDraftData(prev => {
          const oldGroupIndex = prev.findIndex(g => g.id === active.id);
          const overId = over.id === 'category-widget' 
            ? (newIndex > oldIndex ? newItems[newIndex - 1] : newItems[newIndex + 1])
            : over.id;
          const newGroupIndex = prev.findIndex(g => g.id === overId);
          return (oldGroupIndex !== -1 && newGroupIndex !== -1) ? arrayMove(prev, oldGroupIndex, newGroupIndex) : prev;
        });
      }
    }
  };

  const [sortBy, setSortBy] = useState(() => localStorage.getItem('sortBy') || 'date');
  const handleSortChange = (val: string) => {
    setSortBy(val);
    localStorage.setItem('sortBy', val);
  };
  const sourceData = isEditing ? draftData : savedData;
  const viewData = useMemo(() => {
    return sourceData.filter(g => {
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
  }, [sourceData, searchQuery, activeTab, sortBy]);

  const sidebarWidthClasses = sidebarWidthClassMap[theme.uiPreferences.sidebarWidth];
  const gridClassName = cn('grid grid-cols-1 md:grid-cols-2 relative', theme.uiPreferences.gridColumns === 3 ? 'xl:grid-cols-3 2xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4', gridGapClassMap[theme.uiPreferences.gridGap]);

  const GROUPS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(0);
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, searchQuery, sortBy]);
  // 编辑模式或拖拽排序时不分页，避免冲突
  const shouldPaginate = !isEditing && viewData.length > GROUPS_PER_PAGE;
  const totalPages = shouldPaginate ? Math.ceil(viewData.length / GROUPS_PER_PAGE) : 1;
  const pagedViewData = useMemo(() => {
    if (!shouldPaginate) return viewData;
    const start = currentPage * GROUPS_PER_PAGE;
    return viewData.slice(start, start + GROUPS_PER_PAGE);
  }, [viewData, shouldPaginate, currentPage]);

  const renderGridElements = (useSortableWrapper: boolean) => {
    const dataToRender = pagedViewData;
    const widgetIdx = Math.min(theme.uiPreferences.categoryWidgetIndex || 0, dataToRender.length);
    const widget = (
      <SortableCategoryWidget
        key="category-widget"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEditing={isEditing && useSortableWrapper}
        size={theme.uiPreferences.categoryWidgetSize || 'full'}
        onToggleSize={() => theme.updateUiPreference('categoryWidgetSize', theme.uiPreferences.categoryWidgetSize === 'full' ? 'compact' : 'full')}
      />
    );

    const elements = dataToRender.map((group, idx) => {
      if (useSortableWrapper) {
        return <SortableGunCard key={`${activeTab}-${group.id}`} group={group} idx={idx} isEditing={isEditing} activeTab={activeTab} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} onUpdateVariant={handleUpdateVariant} onDeleteVariant={handleDeleteVariant} onAddVariant={handleAddVariant} onReorderVariants={handleReorderVariants} onTogglePin={handleTogglePin} cardSize={theme.uiPreferences.cardSize} cardMinHeight={theme.uiPreferences.cardMinHeight} variantsPerPage={theme.uiPreferences.variantsPerPage} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />;
      }
      return (
        <motion.div key={`${activeTab}-${group.id}`} className="self-start w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: idx * 0.04 }}>
          <GunCard group={group} isEditing={isEditing} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} onUpdateVariant={handleUpdateVariant} onDeleteVariant={handleDeleteVariant} onAddVariant={handleAddVariant} onReorderVariants={handleReorderVariants} onTogglePin={handleTogglePin} cardSize={theme.uiPreferences.cardSize} cardMinHeight={theme.uiPreferences.cardMinHeight} variantsPerPage={theme.uiPreferences.variantsPerPage} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />
        </motion.div>
      );
    });

    elements.splice(widgetIdx, 0, widget as any);
    return elements;
  };

  const currentAppTitle = theme.uiPreferences.appTitle || '马坤时代';
  const currentAppSubtitle = theme.uiPreferences.appSubtitle || '专注修脚。基于顶级重回修脚时代架构运行。';

  return (
    <>
      <style>{`:root { --color-emerald-500: ${theme.customTheme.themeColor}; --color-emerald-600: ${theme.customTheme.themeColor}; --color-emerald-50: ${theme.customTheme.themeColor}1A; }`}</style>
      <div className="flex min-h-screen bg-[#F8F9FA] dark:bg-[#0b0b0c] selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300" style={{ color: theme.isDarkMode ? theme.customTheme.textColorDark : theme.customTheme.textColorLight, '--user-gun-color': theme.isDarkMode ? theme.customTheme.gunNameColorDark : theme.customTheme.gunNameColorLight } as React.CSSProperties}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setActiveTab('settings')} sidebarWidth={theme.uiPreferences.sidebarWidth} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} auth={auth} onOpenAuth={() => setActiveModal('auth')} onLogout={async () => { await auth.logout(); showToast('已退出登录'); }} />
        <main className={cn('flex-1 p-4 md:p-6 lg:p-8 pb-32', sidebarWidthClasses.main)}>
          <div className="md:hidden fixed left-4 bottom-24 z-40 pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400/90 dark:text-zinc-500/90">{mobileVersionLabel}</span>
          </div>
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'community' ? (
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center py-24 animate-fade-in"><Loader2 size={24} className="animate-spin text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500">正在加载社区模块...</p></div>}>
                <CommunityPage auth={auth} onOpenAuth={() => setActiveModal('auth')} showToast={showToast} />
              </React.Suspense>
            ) : activeTab === 'settings' ? (
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center py-24 animate-fade-in"><Loader2 size={24} className="animate-spin text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500">正在加载设置模块...</p></div>}>
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
              </React.Suspense>
            ) : (
              <>
                <Header isEditing={isEditing} onEditStart={handleEditStart} onSave={handleSave} onCancel={handleCancel} onAddNew={() => setIsModalOpen(true)} onOpenCollect={() => setActiveModal('auto-collect')} onOpenModelConfig={() => setActiveModal('model-config')} sortBy={sortBy} onSortChange={handleSortChange} isDarkMode={theme.isDarkMode} onToggleDarkMode={() => theme.setIsDarkMode(!theme.isDarkMode)} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchSuggestions={Array.from(new Set(sourceData.map(g => g.name)))} controlRadius={theme.uiPreferences.controlRadius} buttonStyle={theme.uiPreferences.buttonStyle} />
                {isRefreshingData && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in"><Loader2 size={24} className="animate-spin text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500">正在加载...</p></div>
                ) : savedDataLoadError && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in"><AlertCircle size={24} className="text-zinc-400 mb-4" /><p className="text-[13px] font-bold text-zinc-500 mb-4">{savedDataLoadError}</p><button onClick={() => { void refetch(); }} className="px-4 py-2 bg-zinc-900 text-white text-[12px] font-bold rounded-xl hover:bg-zinc-800 transition">重试</button></div>
                ) : (
                  <>
                    <div className="mb-8 pl-1 mt-2">
                      <div className="flex flex-row items-center justify-between gap-4 md:gap-8 w-full overflow-hidden">
                        <div className="flex-1 min-w-[200px] pr-2 md:pr-8">
                          <div className="w-full">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 w-full max-w-sm">
                                <input
                                  type="text"
                                  value={currentAppTitle}
                                  onChange={e => theme.updateUiPreference('appTitle', e.target.value)}
                                  className="text-3xl md:text-4xl font-black tracking-tighter bg-transparent border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-white w-full"
                                  placeholder="主标题"
                                />
                                <input
                                  type="text"
                                  value={currentAppSubtitle}
                                  onChange={e => theme.updateUiPreference('appSubtitle', e.target.value)}
                                  className="text-[13px] opacity-70 font-medium bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-white w-full"
                                  placeholder="副标题描述"
                                />
                              </div>
                            ) : (
                              <>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2"><span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-500">{currentAppTitle}</span> <span className="text-zinc-300 font-bold tracking-normal opacity-50 text-2xl">/ Base</span></h1>
                                <p className="text-[13px] opacity-70 font-medium max-w-lg">{currentAppSubtitle}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <DailyPwdCard dailyPwd={daily.dailyPwd} copiedDailyPwdKey={daily.copiedDailyPwdKey} handleCopyDailyPwd={daily.handleCopyDailyPwd} />
                      </div>
                    </div>
                    {isEditing && (
                      <EditCustomizePanel uiPreferences={theme.uiPreferences} updateUiPreference={theme.updateUiPreference} resetUiPreferences={() => theme.setUiPreferences(require('./utils').DEFAULT_UI_PREFERENCES)} />
                    )}
                    {isEditing && sortBy === 'default' ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                        <SortableContext items={(() => {
                           const items = [...viewData.map(g => g.id)];
                           items.splice(Math.min(theme.uiPreferences.categoryWidgetIndex || 0, items.length), 0, 'category-widget');
                           return items;
                        })()} strategy={rectSortingStrategy}>
                          <div className={gridClassName}>
                            {renderGridElements(true)}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className={gridClassName}>
                        {renderGridElements(false)}
                      </div>
                    )}
                    {viewData.length === 0 && (
                      <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-400 animate-fade-in"><div className="w-16 h-16 bg-white shadow-sm border border-zinc-200/50 rounded-2xl flex items-center justify-center mb-4"><Sparkles size={24} className="text-zinc-300" /></div><p className="font-bold text-xs tracking-widest uppercase text-zinc-500">该分类下暂无任何条目</p></div>
                    )}
                    {shouldPaginate && totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                          disabled={currentPage === 0}
                          className="px-3 py-1.5 text-[12px] font-bold rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          上一页
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCurrentPage(i)}
                            className={cn(
                              'min-w-[32px] h-8 text-[12px] font-bold rounded-lg transition',
                              i === currentPage
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                            )}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={currentPage >= totalPages - 1}
                          className="px-3 py-1.5 text-[12px] font-bold rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          下一页
                        </button>
                        <span className="ml-2 text-[11px] font-medium text-zinc-400">
                          共 {viewData.length} 条
                        </span>
                      </div>
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
              const res = await fetch('/api/collect/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ enabled: autoCollectConfig.enabled, model: autoCollectConfig.model, backupModel: autoCollectConfig.backupModel, intervalHours: autoCollectConfig.intervalHours || 1, creatorIds: autoCollectConfig.creatorIds || [] }) });
              const data = await safeJson(res);
              if (!res.ok) throw new Error(data?.error || '保存配置失败');
              showToast('自动采集配置已保存');
            } catch(e) { showToast(e instanceof Error ? e.message : '保存配置失败', 'warn'); }
            finally { setIsSavingAuto(false); }
          }}
        />
      )}
      {activeModal === 'model-config' && (
        <ModelConfigModal
          onClose={() => setActiveModal('none')}
          meta={collectMeta}
          selectedProviderId={selectedProviderId}
          selectedModel={selectedModel}
          providerForm={providerForm}
          isFetchingProviderModels={isFetchingProviderModels}
          isSavingProvider={isSavingProvider}
          isTestingModel={isTestingModel}
          modelTestResult={modelTestResult}
          onSelectedProviderIdChange={setSelectedProviderId}
          onSelectedModelChange={setSelectedModel}
          onProviderFormChange={setProviderForm}
          onFetchProviderModels={handleFetchProviderModels}
          onSaveProvider={handleSaveProvider}
          onDeleteProvider={handleDeleteProvider}
          onTestModel={handleTestModel}
          onChatModel={handleChatModel}
        />
      )}
      {activeModal === 'auth' && (
        <AuthModal isOpen={activeModal === 'auth'} onClose={() => setActiveModal('none')}
          onLogin={async (u, p) => {
            const result = await auth.login(u, p);
            showToast('登录成功，欢迎回来！');
            return result;
          }}
          onRegister={async (u, p) => {
            const result = await auth.register(u, p);
            showToast('注册成功，已自动登录！');
            return result;
          }}
          showToast={showToast}
        />
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-24 md:bottom-10 left-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_12px_44px_rgba(0,0,0,0.12)] pointer-events-none"
            style={{ backgroundColor: toast.type === 'success' ? '#18181B' : toast.type === 'error' ? '#B91C1C' : '#DC2626' }}
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5} /> : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />}
            <span className="text-white font-bold text-[13px] tracking-wide">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
