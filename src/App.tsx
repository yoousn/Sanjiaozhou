import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, Radio, Loader2, Settings2, Download } from 'lucide-react';
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
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GunCard } from './components/GunCard';
import { AddGunModal } from './components/AddGunModal';
import { CollectModal } from './components/CollectModal';
import { useToast } from './components/useToast';
import {
  cn,
  buildModelOptionValue,
  parseModelOptionValue,
  DEFAULT_UI_PREFERENCES,
  getButtonClassName,
  gridGapClassMap,
  radiusClassMap,
  sidebarWidthClassMap,
} from './utils';

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
  const mobileVersionLabel = `v${__APP_VERSION__}`;
  const [activeTab, setActiveTab] = useState('home');
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'mode-select' | 'collect' | 'auto-collect'>('none');
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

  const [dailyPwd, setDailyPwd] = useState<{date: string, data: Record<string, string>} | null>(null);
  const [dailyPwdLogs, setDailyPwdLogs] = useState<Array<{ time: string; message: string; success: boolean }>>([]);
  const [isRefreshingDailyPwd, setIsRefreshingDailyPwd] = useState(false);
  const [copiedDailyPwdKey, setCopiedDailyPwdKey] = useState<string | null>(null);
  const dailyPwdCopyTimerRef = useRef<number | null>(null);
  const dailyPwdPollTimerRef = useRef<number | null>(null);
  const dailyPwdDateWatcherRef = useRef<number | null>(null);
  const dailyPwdRequestInFlightRef = useRef(false);
  const dailyPwdLatestRef = useRef<{ date: string; data: Record<string, string> } | null>(null);
  const currentBeijingDayRef = useRef(new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  const [isUploadingCookie, setIsUploadingCookie] = useState(false);
  const [cookieTestResult, setCookieTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [cookieStatus, setCookieStatus] = useState<{ exists: boolean; mtime?: string } | null>(null);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [settingsFileStatus, setSettingsFileStatus] = useState<{ exists: boolean; mtime?: string } | null>(null);
  const [isDownloadingSettings, setIsDownloadingSettings] = useState(false);

  const fetchCookieStatus = () => {
    fetch('/api/config/cookie/status')
      .then(res => res.json())
      .then(data => setCookieStatus(data))
      .catch(console.error);
  };

  const fetchSettingsFileStatus = () => {
    fetch('/api/config/settings-file/status')
      .then(res => res.json())
      .then(data => setSettingsFileStatus(data))
      .catch(console.error);
  };

  const fetchDailyPwdLogs = () => {
    fetch('/api/daily-password/logs')
      .then(safeJson)
      .then(data => setDailyPwdLogs(Array.isArray(data?.logs) ? data.logs : []))
      .catch(console.error);
  };

  const stopDailyPwdPolling = () => {
    if (dailyPwdPollTimerRef.current !== null) {
      window.clearTimeout(dailyPwdPollTimerRef.current);
      dailyPwdPollTimerRef.current = null;
    }
  };

  const scheduleDailyPwdPolling = (delay = 2 * 60 * 1000) => {
    stopDailyPwdPolling();
    dailyPwdPollTimerRef.current = window.setTimeout(() => {
      dailyPwdPollTimerRef.current = null;
      void syncDailyPwd({ forceRefreshToday: true });
    }, delay);
  };

  const syncDailyPwd = async ({ forceRefreshToday = false }: { forceRefreshToday?: boolean } = {}) => {
    if (dailyPwdRequestInFlightRef.current) {
      return;
    }

    dailyPwdRequestInFlightRef.current = true;

    try {
      const res = await fetch('/api/daily-password');
      const data = await safeJson(res);
      const applied = res.ok && applyDailyPwd(data);
      const needsRefresh = forceRefreshToday || !applied || shouldRefreshDailyPwd(data);

      if (!needsRefresh) {
        stopDailyPwdPolling();
        return;
      }

      const refreshRes = await fetch('/api/daily-password/refresh', { method: 'POST' });
      const refreshData = await safeJson(refreshRes);
      if (refreshRes.ok) {
        const payload = refreshData.data ?? refreshData;
        const refreshApplied = applyDailyPwd(payload);
        if (refreshApplied && isDailyPwdForToday(dailyPwdLatestRef.current)) {
          stopDailyPwdPolling();
          fetchDailyPwdLogs();
          return;
        }
      }

      scheduleDailyPwdPolling();
      fetchDailyPwdLogs();
    } catch (error) {
      console.error(error);
      scheduleDailyPwdPolling();
    } finally {
      dailyPwdRequestInFlightRef.current = false;
    }
  };

  const handleRefreshDailyPwd = async () => {
    if (isRefreshingDailyPwd) return;
    setIsRefreshingDailyPwd(true);
    try {
      const res = await fetch('/api/daily-password/refresh', { method: 'POST' });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || '获取每日密码失败');
      }
      applyDailyPwd(data?.data ?? data);
      stopDailyPwdPolling();
      fetchDailyPwdLogs();
      showToast('每日密码已更新');
    } catch (error) {
      console.error('手动获取每日密码失败:', error);
      fetchDailyPwdLogs();
      showToast(error instanceof Error ? error.message : '获取每日密码失败', 'warn');
    } finally {
      setIsRefreshingDailyPwd(false);
    }
  };

  useEffect(() => {
    dailyPwdLatestRef.current = dailyPwd;
  }, [dailyPwd]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchCookieStatus();
      fetchSettingsFileStatus();
      fetchDailyPwdLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    void syncDailyPwd();
  }, []);

  useEffect(() => {
    const checkDailyPwdDateChange = () => {
      const today = getBeijingToday();
      if (today === currentBeijingDayRef.current) {
        return;
      }
      currentBeijingDayRef.current = today;
      void syncDailyPwd({ forceRefreshToday: true });
    };

    dailyPwdDateWatcherRef.current = window.setInterval(checkDailyPwdDateChange, 60 * 1000);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        checkDailyPwdDateChange();
        if (!isDailyPwdForToday(dailyPwdLatestRef.current) || shouldRefreshDailyPwd(dailyPwdLatestRef.current)) {
          void syncDailyPwd({ forceRefreshToday: true });
        }
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      if (dailyPwdDateWatcherRef.current !== null) {
        window.clearInterval(dailyPwdDateWatcherRef.current);
        dailyPwdDateWatcherRef.current = null;
      }
      stopDailyPwdPolling();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (dailyPwdCopyTimerRef.current !== null) {
        window.clearTimeout(dailyPwdCopyTimerRef.current);
      }
    };
  }, []);

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
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => {
    try {
      const saved = localStorage.getItem('uiPreferences');
      if (!saved) {
        return DEFAULT_UI_PREFERENCES;
      }
      const parsed = JSON.parse(saved) as Partial<UiPreferences>;
      return { ...DEFAULT_UI_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_UI_PREFERENCES;
    }
  });

  useEffect(() => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
  }, [customTheme]);

  useEffect(() => {
    localStorage.setItem('uiPreferences', JSON.stringify(uiPreferences));
  }, [uiPreferences]);

  const [autoCollectConfig, setAutoConfig] = useState({
    enabled: false,
    model: '',
    intervalHours: 1,
    creatorIds: [] as string[],
    logs: [] as Array<{ time: string; message: string; success: boolean }>
  });
  const [isSavingAuto, setIsSavingAuto] = useState(false);
  const { toast, showToast } = useToast();

  const hasGarbledDailyPwd = (data: Record<string, string>) => Object.keys(data).some(key => key.includes('�'));
  const getBeijingToday = () => new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const isDailyPwdForToday = (payload: { date: string; data: Record<string, string> } | null | undefined) => {
    if (!payload?.date) {
      return false;
    }
    return payload.date === getBeijingToday();
  };

  const applyDailyPwd = (data: Record<string, string> | { date: string; data: Record<string, string> } | null | undefined) => {
    if (data && 'date' in data && 'data' in data && data.data && typeof data.data === 'object') {
      const nextDailyPwd = data as { date: string; data: Record<string, string> };
      dailyPwdLatestRef.current = nextDailyPwd;
      setDailyPwd(nextDailyPwd);
      return true;
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data as Record<string, string>).length > 0 && !('error' in data)) {
      const today = getBeijingToday();
      const nextDailyPwd = { date: today, data: data as Record<string, string> };
      dailyPwdLatestRef.current = nextDailyPwd;
      setDailyPwd(nextDailyPwd);
      return true;
    }
    return false;
  };

  const shouldRefreshDailyPwd = (data: Record<string, string> | { date: string; data: Record<string, string> } | null | undefined) => {
    if (data && 'date' in data && 'data' in data && typeof (data as { data: Record<string, string> }).data === 'object' && !Array.isArray((data as { data: Record<string, string> }).data)) {
      const typed = data as { date: string; data: Record<string, string> };
      return typed.date !== getBeijingToday() || hasGarbledDailyPwd(typed.data);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && !('error' in data)) {
      return hasGarbledDailyPwd(data as Record<string, string>);
    }
    return true;
  };

  const handleCopyDailyPwd = async (mapName: string, pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      if (dailyPwdCopyTimerRef.current !== null) {
        window.clearTimeout(dailyPwdCopyTimerRef.current);
      }
      setCopiedDailyPwdKey(mapName);
      dailyPwdCopyTimerRef.current = window.setTimeout(() => {
        setCopiedDailyPwdKey((prev) => (prev === mapName ? null : prev));
        dailyPwdCopyTimerRef.current = null;
      }, 500);
      showToast(`${mapName} 密码已复制`);
    } catch (error) {
      console.error('复制密码失败:', error);
      showToast('复制失败，请手动复制', 'warn');
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const radiusClass = radiusClassMap[uiPreferences.controlRadius];
  const gridClassName = cn(
    'grid grid-cols-1 md:grid-cols-2 relative',
    uiPreferences.gridColumns === 3 ? 'xl:grid-cols-3 2xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4',
    gridGapClassMap[uiPreferences.gridGap]
  );
  const sidebarWidthClasses = sidebarWidthClassMap[uiPreferences.sidebarWidth];
  const settingsActionButtonClass = cn(
    'px-6 py-2.5 text-[13px] font-black transition flex items-center gap-2 disabled:opacity-60',
    radiusClass,
    getButtonClassName(uiPreferences.buttonStyle === 'soft' ? 'solid' : uiPreferences.buttonStyle, 'default')
  );
  const textButtonClass = 'text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition';
  const settingsPanelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm mb-6',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );
  const settingsSelectClass = cn(
    'w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 text-[13px] font-bold shadow-sm outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10',
    radiusClass
  );
  const updateUiPreference = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setUiPreferences((prev: UiPreferences) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    return () => { stopSearchPolling(); };
  }, []);

  const stopSearchPolling = () => {
    if (searchPollRef.current !== null) {
      window.clearInterval(searchPollRef.current);
      searchPollRef.current = null;
    }
  };

  const [savedData, setSavedData] = useState<GunGroup[]>([]);
  const [draftData, setDraftData] = useState<GunGroup[]>([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  const [savedDataLoadError, setSavedDataLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = (silent = false) => {
      if (!silent) {
        setIsRefreshingData(true);
      }

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
          if (!silent) {
            setIsRefreshingData(false);
          }
        });
    };

    fetchData(false);

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
    if (!window.confirm(`确定删除枪系「${group?.name || ''}」？此操作不可撤销。`)) return;
    handleDeleteGroup(groupId);
    showToast(`已删除枪系 ${group?.name || ''}`, 'warn');
  };

  const requestDeleteVariant = (groupId: string, variantId: string) => {
    const group = draftData.find(g => g.id === groupId);
    const variant = group?.variants.find(v => v.id === variantId);
    if (!window.confirm(`确定删除配置「${variant?.buildType || '该配置'}」？此操作不可撤销。`)) return;
    handleDeleteVariant(groupId, variantId);
    showToast(`已删除配置 ${variant?.buildType || '该配置'}`, 'warn');
  };

  const handleCookieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCookie(true);
    setCookieTestResult(null);
    try {
      const content = await file.text();
      const res = await fetch('/api/config/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || data?.error || '上传失败');
      setCookieTestResult({ success: Boolean(data.success), message: String(data.message || '测试完成') });
      fetchCookieStatus();
    } catch(err) {
      setCookieTestResult({ success: false, message: err instanceof Error ? err.message : '上传异常' });
    } finally {
      setIsUploadingCookie(false);
      e.target.value = ''; // 允许重复上传相同文件
    }
  };

  const handleDownloadData = async () => {
    setIsDownloadingData(true);
    try {
      const res = await fetch('/api/builds');
      const data = await safeJson(res);
      if (!res.ok) throw new Error('获取数据失败');
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('数据文件 data.json 已开始下载');
    } catch (err) {
      console.error('下载数据失败:', err);
      showToast(err instanceof Error ? err.message : '下载数据失败', 'warn');
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleDownloadSettingsFile = async () => {
    setIsDownloadingSettings(true);
    try {
      const res = await fetch('/api/config/settings-file');
      const data = await safeJson(res);
      if (!res.ok) throw new Error('获取配置失败');
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collect_settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('配置文件 collect_settings.json 已开始下载');
    } catch (err) {
      console.error('下载配置失败:', err);
      showToast(err instanceof Error ? err.message : '下载配置失败', 'warn');
    } finally {
      setIsDownloadingSettings(false);
    }
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
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
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
      const serverData = await safeJson(res);
      setSavedData(Array.isArray(serverData) ? serverData : draftData);
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
      setDraftData(prev => prev.map(g => g.id === groupId ? { ...g, pinned: !g.pinned } : g));
      return;
    }

    const updateFn = (prev: GunGroup[]) => prev.map(g => g.id === groupId ? { ...g, pinned: !g.pinned } : g);
    const previousSavedData = savedData;
    const newSavedData = updateFn(savedData);
    setSavedData(newSavedData);

    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSavedData)
      });
      if (!res.ok) {
        throw new Error('网络请求异常');
      }
      const serverData = await safeJson(res);
      setSavedData(Array.isArray(serverData) ? serverData : newSavedData);
    } catch (e) {
      setSavedData(previousSavedData);
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
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setActiveTab('settings')}
          sidebarWidth={uiPreferences.sidebarWidth}
          controlRadius={uiPreferences.controlRadius}
          buttonStyle={uiPreferences.buttonStyle}
        />

        <main className={cn('flex-1 p-4 md:p-6 lg:p-8 pb-32', sidebarWidthClasses.main)}>
          <div className="md:hidden fixed left-4 bottom-24 z-40 pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400/90 dark:text-zinc-500/90">
              {mobileVersionLabel}
            </span>
          </div>
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'settings' ? (
              <div className="max-w-3xl mx-auto animate-fade-in mt-4">
                <h2 className="text-3xl font-black tracking-tighter mb-8 flex items-center gap-3">
                  系统设置
                </h2>

                <div className={settingsPanelClass}>
                  <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">数据管理</h3>
                  <p className="text-[13px] text-zinc-500 mb-6">为方便多端同步，部署代码前可先下载线上最新的数据和配置文件进行备份与替换。</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={handleDownloadData}
                      disabled={isDownloadingData}
                      className={settingsActionButtonClass}
                    >
                      {isDownloadingData ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {isDownloadingData ? '正在准备...' : '下载 data.json'}
                    </button>
                    <button
                      onClick={handleDownloadSettingsFile}
                      disabled={isDownloadingSettings}
                      className={settingsActionButtonClass}
                    >
                      {isDownloadingSettings ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {isDownloadingSettings ? '正在准备...' : '下载 collect_settings.json'}
                    </button>
                  </div>
                </div>

                <div className={settingsPanelClass}>
                  <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">Bilibili 采集 Cookie</h3>
                  <p className="text-[13px] text-zinc-500 mb-6">上传 Netscape 格式的 cookies.txt 文件以更新采集凭证。上传后会自动进行一次抓取测试以验证有效性。</p>

                  {cookieStatus && (
                    <div className="mb-6 p-4 bg-zinc-50 dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                      {cookieStatus.exists ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
                            <span className="text-[13px] font-black text-zinc-700 dark:text-zinc-300">当前已有生效的 Cookie 文件</span>
                          </div>
                          <span className="text-[12px] font-bold text-zinc-500">更新于: {new Date(cookieStatus.mtime!).toLocaleString('zh-CN')}</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={18} className="text-zinc-400" strokeWidth={2.5} />
                          <span className="text-[13px] font-black text-zinc-500">当前未上传任何 Cookie 文件</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <input type="file" accept=".txt" id="cookie-upload" className="hidden" onChange={handleCookieUpload} />
                    <label htmlFor="cookie-upload" className={cn(settingsActionButtonClass, 'cursor-pointer')}>
                      {isUploadingCookie && <Loader2 size={14} className="animate-spin" />}
                      {isUploadingCookie ? '正在测试...' : '上传 cookies.txt'}
                    </label>
                    {cookieTestResult && (
                      <span className={cn("text-[13px] font-bold px-4 py-2.5 rounded-xl border", cookieTestResult.success ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400")}>
                        {cookieTestResult.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className={settingsPanelClass}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">每日密码日志</h3>
                      <p className="text-[13px] text-zinc-500">记录每日密码缓存读取、手动刷新和后台自动抓取状态，仅保留最近 100 条。</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRefreshDailyPwd()}
                      disabled={isRefreshingDailyPwd}
                      className={cn(settingsActionButtonClass, 'shrink-0 px-4')}
                    >
                      {isRefreshingDailyPwd && <Loader2 size={12} className="animate-spin" />}
                      {isRefreshingDailyPwd ? '获取中...' : '获取'}
                    </button>
                  </div>
                  <div className="bg-zinc-900 text-zinc-300 font-mono text-[11px] p-4 rounded-2xl h-36 overflow-y-auto flex flex-col gap-2 shadow-inner">
                    {dailyPwdLogs.length === 0 ? (
                      <span className="opacity-50">暂无日志...</span>
                    ) : (
                      dailyPwdLogs.map((log, i) => (
                        <div key={i} className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                          <span className="text-zinc-500">[{log.time}]</span> {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={settingsPanelClass}>
                  <h3 className="text-lg font-black mb-6 text-zinc-900 dark:text-white">个性化设置</h3>
                  <div className="flex flex-col gap-6">
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

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                      <div className="mb-4">
                        <h4 className="text-[14px] font-black text-zinc-900 dark:text-white">界面自定义</h4>
                        <p className="mt-1 text-[13px] text-zinc-500">调整卡片尺寸、列表密度、布局列数与按钮外观，刷新后会自动保留。</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">卡片尺寸</label>
                          <select value={uiPreferences.cardSize} onChange={(e) => updateUiPreference('cardSize', e.target.value as UiPreferences['cardSize'])} className={settingsSelectClass}>
                            <option value="compact">紧凑</option>
                            <option value="default">默认</option>
                            <option value="roomy">宽松</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">卡片最小高度</label>
                          <select value={uiPreferences.cardMinHeight} onChange={(e) => updateUiPreference('cardMinHeight', Number(e.target.value) as UiPreferences['cardMinHeight'])} className={settingsSelectClass}>
                            <option value={300}>300</option>
                            <option value={330}>330</option>
                            <option value={360}>360</option>
                            <option value={400}>400</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">每张卡片显示配置数</label>
                          <select value={uiPreferences.variantsPerPage} onChange={(e) => updateUiPreference('variantsPerPage', Number(e.target.value) as UiPreferences['variantsPerPage'])} className={settingsSelectClass}>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">桌面列数</label>
                          <select value={uiPreferences.gridColumns} onChange={(e) => updateUiPreference('gridColumns', Number(e.target.value) as UiPreferences['gridColumns'])} className={settingsSelectClass}>
                            <option value={3}>3 列</option>
                            <option value={4}>4 列</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">卡片间距</label>
                          <select value={uiPreferences.gridGap} onChange={(e) => updateUiPreference('gridGap', Number(e.target.value) as UiPreferences['gridGap'])} className={settingsSelectClass}>
                            <option value={12}>12</option>
                            <option value={16}>16</option>
                            <option value={20}>20</option>
                            <option value={24}>24</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">侧栏宽度</label>
                          <select value={uiPreferences.sidebarWidth} onChange={(e) => updateUiPreference('sidebarWidth', e.target.value as UiPreferences['sidebarWidth'])} className={settingsSelectClass}>
                            <option value="compact">紧凑</option>
                            <option value="default">默认</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">控件圆角</label>
                          <select value={uiPreferences.controlRadius} onChange={(e) => updateUiPreference('controlRadius', e.target.value as UiPreferences['controlRadius'])} className={settingsSelectClass}>
                            <option value="lg">LG</option>
                            <option value="xl">XL</option>
                            <option value="full">FULL</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">按钮样式</label>
                          <select value={uiPreferences.buttonStyle} onChange={(e) => updateUiPreference('buttonStyle', e.target.value as UiPreferences['buttonStyle'])} className={settingsSelectClass}>
                            <option value="soft">柔和</option>
                            <option value="solid">实心</option>
                            <option value="outline">描边</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                      <button onClick={() => setCustomTheme(DEFAULT_THEME)} className={textButtonClass}>恢复默认主题</button>
                      <button onClick={() => setUiPreferences(DEFAULT_UI_PREFERENCES)} className={textButtonClass}>恢复默认 UI 设置</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                  controlRadius={uiPreferences.controlRadius}
                  buttonStyle={uiPreferences.buttonStyle}
                />

                {isRefreshingData && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                    <Loader2 size={24} className="animate-spin text-zinc-400 mb-4" />
                    <p className="text-[13px] font-bold text-zinc-500">正在加载...</p>
                  </div>
                ) : savedDataLoadError && savedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                    <AlertCircle size={24} className="text-zinc-400 mb-4" />
                    <p className="text-[13px] font-bold text-zinc-500 mb-4">{savedDataLoadError}</p>
                    <button onClick={() => { setSavedDataLoadError(null); setIsRefreshingData(true); fetch('/api/builds').then(safeJson).then(data => { setSavedData(data); setSavedDataLoadError(null); }).catch(err => setSavedDataLoadError('加载失败')).finally(() => setIsRefreshingData(false)); }} className="px-4 py-2 bg-zinc-900 text-white text-[12px] font-bold rounded-xl hover:bg-zinc-800 transition">重试</button>
                  </div>
                ) : (
                  <>
                  <div className="mb-6 pl-1 mt-2">
                  <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2" style={{ color: 'inherit' }}>
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-500">马坤时代</span> <span className="text-zinc-300 font-bold tracking-normal opacity-50 text-2xl">/ Base</span>
                      </h1>
                      <p className="text-[13px] opacity-70 font-medium max-w-lg" style={{ color: 'inherit' }}>
                        专注修脚。基于顶级重回修脚时代架构运行。
                      </p>
                    </div>
                    
                    {dailyPwd && (
                      <div className="w-full flex justify-center">
                        <div className="bg-white dark:bg-[#121214] border border-emerald-500/20 shadow-sm rounded-2xl px-3 py-3 md:px-4 md:py-3.5 animate-fade-in relative overflow-hidden max-w-4xl w-full xl:w-auto">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"></div>
                          <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Sparkles size={12} className="text-emerald-500" />
                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.22em]">今日密码</span>
                              </div>
                              <span className="text-[11px] font-semibold text-zinc-400">{dailyPwd.date}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
                              {Object.entries(dailyPwd.data).map(([mapName, pwd]) => {
                                const password = String(pwd);
                                const isCopied = copiedDailyPwdKey === mapName;
                                return (
                                  <button
                                    key={mapName}
                                    type="button"
                                    onClick={() => void handleCopyDailyPwd(mapName, password)}
                                    className={`group relative min-w-[84px] overflow-hidden rounded-[18px] border px-2.5 py-2 transition-all duration-500 ease-out ${isCopied ? 'border-emerald-500/80 bg-emerald-50 dark:bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10'}`}
                                    title={`点击复制 ${mapName} 密码`}
                                  >
                                    <span
                                      className={`pointer-events-none absolute inset-0 bg-emerald-600 transition-all duration-500 ease-out ${isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.92]'}`}
                                    />
                                    <div className="relative z-10 flex flex-col items-center text-center transition-colors duration-200">
                                      <span className={`text-[10px] font-bold leading-none ${isCopied ? 'text-white/85' : 'text-zinc-500 dark:text-zinc-400'}`}>{mapName}</span>
                                      <span className={`mt-1.5 text-[16px] font-black font-mono tracking-[0.1em] leading-none ${isCopied ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`}>{password}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && sortBy === 'default' ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCardDragEnd}
                  >
                    <SortableContext items={viewData.map(g => g.id)} strategy={rectSortingStrategy}>
      <div
        className={gridClassName}
      >
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
                            cardSize={uiPreferences.cardSize}
                            cardMinHeight={uiPreferences.cardMinHeight}
                            variantsPerPage={uiPreferences.variantsPerPage}
                            controlRadius={uiPreferences.controlRadius}
                            buttonStyle={uiPreferences.buttonStyle}
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
                  <div className={gridClassName}>
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
                          cardSize={uiPreferences.cardSize}
                          cardMinHeight={uiPreferences.cardMinHeight}
                          variantsPerPage={uiPreferences.variantsPerPage}
                          controlRadius={uiPreferences.controlRadius}
                          buttonStyle={uiPreferences.buttonStyle}
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
                </>
              )}
            </>
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

      {activeModal === 'mode-select' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60" onClick={() => setActiveModal('none')} />
          <div className="bg-white rounded-3xl p-8 relative z-10 w-full max-w-sm flex flex-col gap-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-black text-zinc-900">选择采集模式</h3>
               <button onClick={() => setActiveModal('none')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="grid gap-3">
              <button onClick={() => setActiveModal('collect')} className="py-4 px-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-bold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition flex items-center justify-between text-left">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[14px]">手动采集</span>
                  <span className="text-[11px] font-medium text-zinc-500">自己搜索并勾选视频加入网站</span>
                </div>
                <Radio size={18} strokeWidth={2.5}/>
              </button>
              <button onClick={() => setActiveModal('auto-collect')} className="py-4 px-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-400 transition flex items-center justify-between text-left">
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
          <div className="bg-white dark:bg-[#121214] rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-2xl flex flex-col gap-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black text-zinc-900 dark:text-white">自动采集设置</h3>
                 <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">后台智能比对记录，自动过滤重复视频并加入新卡片</p>
               </div>
               <button onClick={() => setActiveModal('none')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X size={16} strokeWidth={2.5}/></button>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 mt-2">
              <span className="font-bold text-[13px] dark:text-zinc-300">开启后台定时采集</span>
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
          style={{ backgroundColor: toast.type === 'success' ? '#18181B' : toast.type === 'error' ? '#B91C1C' : '#DC2626' }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5} /> : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />}
          <span className="text-white font-bold text-[13px] tracking-wide">{toast.msg}</span>
        </div>
      )}
    </div>
    </>
  );
}
