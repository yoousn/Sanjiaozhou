import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  GunGroup,
  GunVariant,
  CollectMeta,
  CollectPreview,
  CollectSearchResult,
  ModelTestResult,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GunCard } from './components/GunCard';
import { AddGunModal } from './components/AddGunModal';
import { CollectModal } from './components/CollectModal';

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

function SortableGunCard({ group, idx, isEditing, activeTab, ...props }: any) {
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

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isSearchingCollect, setIsSearchingCollect] = useState(false);
  const [isPreviewingCollect, setIsPreviewingCollect] = useState(false);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [isApplyingCollect, setIsApplyingCollect] = useState(false);
  const [collectMeta, setCollectMeta] = useState<CollectMeta>(EMPTY_META);
  const [collectSearchResult, setCollectSearchResult] = useState<CollectSearchResult>(EMPTY_SEARCH);
  const [collectPreview, setCollectPreview] = useState<CollectPreview | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelTestResult, setModelTestResult] = useState<ModelTestResult | null>(null);
  const searchPollRef = useRef<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'warn' = 'success') => {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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
        .then(res => res.json())
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
      if (!isEditing && !isCollectModalOpen && !isSearchingCollect && !isPreviewingCollect && !isApplyingCollect) {
        fetchData(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isEditing, isCollectModalOpen, isSearchingCollect, isPreviewingCollect, isApplyingCollect]);

  useEffect(() => {
    if (!isCollectModalOpen) return;
    fetch('/api/collect/meta')
      .then(res => res.json())
      .then((data: CollectMeta) => {
        setCollectMeta(data);
        setSelectedModel(prev => prev || data.defaultModel || '');
      })
      .catch(err => {
        console.error('加载采集配置失败:', err);
        showToast('加载采集配置失败', 'warn');
      });
  }, [isCollectModalOpen]);

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
    if (activeTab === 'home') return true;
    return g.category === activeTab;
  }).sort((a, b) => {
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

  const handleSearchCollect = async (guns: string[], creatorIds: string[]) => {
    setIsSearchingCollect(true);
    setCollectPreview(null);
    setSelectedVideoIds([]);
    setModelTestResult(null);

    try {
      const res = await fetch('/api/collect/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guns, creatorIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '搜索失败');
      const nextResult: CollectSearchResult = {
        creators: Array.isArray(data?.creators) ? data.creators : [],
        guns: Array.isArray(data?.guns) ? data.guns : guns,
        creatorIds: Array.isArray(data?.creatorIds) ? data.creatorIds : creatorIds,
        videos: Array.isArray(data?.videos) ? data.videos : [],
        logs: Array.isArray(data?.logs) ? data.logs : [],
        errors: Array.isArray(data?.errors) ? data.errors : [],
      };
      setCollectSearchResult(nextResult);
      setSelectedModel((prev) => prev || collectMeta.defaultModel || '');
      if (nextResult.videos.length > 0) {
        showToast(`已命中 ${nextResult.videos.length} 个视频`);
      } else {
        showToast('搜索完成，但没有命中视频', 'warn');
      }
    } catch (e) {
      console.error('搜索失败:', e);
      const message = e instanceof Error ? e.message : '搜索失败';
      setCollectSearchResult({ ...EMPTY_SEARCH, logs: [{ timestamp: Date.now(), stage: 'request-error', message }], errors: [message], guns, creatorIds });
      showToast(message, 'warn');
    } finally {
      setIsSearchingCollect(false);
    }
  };

  const handlePreviewCollect = async (guns: string[], creatorIds: string[], videoIds: string[], model: string) => {
    setIsPreviewingCollect(true);
    try {
      const res = await fetch('/api/collect/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guns, creatorIds, videoIds, model }),
      });
      const data = await res.json();
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
      const data = await res.json();
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

    const previewResult = await handlePreviewCollect(guns, creatorIds, videoIds, model);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '写入失败');
      setSavedData(Array.isArray(data?.data) ? data.data : []);
      setCollectPreview(null);
      setCollectSearchResult(EMPTY_SEARCH);
      setSelectedVideoIds([]);
      setModelTestResult(null);
      setIsCollectModalOpen(false);
      showToast('已自动加入网站');
    } catch (e) {
      console.error('写入失败:', e);
      showToast(e instanceof Error ? e.message : '写入失败', 'warn');
    } finally {
      setIsApplyingCollect(false);
    }
  };

  const handleCloseCollectModal = () => {
    if (isSearchingCollect || isPreviewingCollect || isTestingModel || isApplyingCollect) return;
    setIsCollectModalOpen(false);
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
    <div className="flex min-h-screen bg-[#F8F9FA] text-zinc-900 selection:bg-zinc-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 md:ml-20 lg:ml-56 p-4 md:p-6 lg:p-8 pb-32">
        <div className="max-w-[1600px] mx-auto">
          <Header
            isEditing={isEditing}
            onEditStart={handleEditStart}
            onSave={handleSave}
            onCancel={handleCancel}
            onAddNew={() => setIsModalOpen(true)}
            onOpenCollect={() => setIsCollectModalOpen(true)}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <div className="mb-6 pl-1 mt-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-500">修脚时代</span> <span className="text-zinc-300 font-bold tracking-normal opacity-50 text-2xl">/ Base</span>
            </h1>
            <p className="text-[13px] text-zinc-500 font-medium max-w-lg">
              结构化管理中心。基于顶级网页架构运行。
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

      {isCollectModalOpen && (
        <CollectModal
          isOpen={isCollectModalOpen}
          isSearching={isSearchingCollect || isRefreshingData}
          isPreviewing={isPreviewingCollect}
          isTestingModel={isTestingModel}
          isApplying={isApplyingCollect}
          meta={collectMeta}
          searchResult={collectSearchResult}
          selectedVideoIds={selectedVideoIds}
          selectedModel={selectedModel}
          modelTestResult={modelTestResult}
          preview={collectPreview}
          onClose={handleCloseCollectModal}
          onSearch={handleSearchCollect}
          onSelectedVideoIdsChange={setSelectedVideoIds}
          onSelectedModelChange={setSelectedModel}
          onTestModel={handleTestModel}
          onApply={handleApplyCollect}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_12px_44px_rgba(0,0,0,0.12)] pointer-events-none animate-fade-in"
          style={{ backgroundColor: toast.type === 'success' ? '#18181B' : '#DC2626' }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5} /> : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />}
          <span className="text-white font-bold text-[13px] tracking-wide">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
