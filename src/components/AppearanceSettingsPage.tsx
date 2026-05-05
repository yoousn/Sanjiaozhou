import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Trash2, Eye, Palette, RotateCcw, Image as ImageIcon, Type, Code, FileCode, Fingerprint, Sparkles, CheckCircle2, AlertCircle, Crosshair } from 'lucide-react';
import { cn, getButtonClassName, radiusClassMap, DEFAULT_APPEARANCE_CONFIG } from '../utils';
import { AppearanceConfig } from '../types';

type Props = {
  appearanceConfig: AppearanceConfig;
  setAppearanceConfig: React.Dispatch<React.SetStateAction<AppearanceConfig>>;
  resetAppearance: () => void;
  uiPreferences: { controlRadius: 'lg' | 'xl' | 'full'; buttonStyle: 'soft' | 'solid' | 'outline' };
  showToast?: (msg: string, type?: 'success' | 'warn' | 'error') => void;
};

export function AppearanceSettingsPage({ appearanceConfig, setAppearanceConfig, resetAppearance, uiPreferences, showToast }: Props) {
  const [draft, setDraft] = useState<AppearanceConfig>(appearanceConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(appearanceConfig);
  }, [appearanceConfig]);

  // 成功/失败提示 3 秒后自动消失
  useEffect(() => {
    if (!saveStatus) return;
    const t = setTimeout(() => setSaveStatus(null), 3000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const radiusClass = radiusClassMap[uiPreferences.controlRadius];

  const panelClass = cn(
    'border border-zinc-200/50 dark:border-zinc-800/50 p-6 md:p-8 shadow-sm mb-6 backdrop-blur-md',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );
  const actionButtonClass = cn(
    'px-6 py-2.5 text-[13px] font-black transition flex items-center gap-2 disabled:opacity-60',
    radiusClass,
    getButtonClassName(uiPreferences.buttonStyle === 'soft' ? 'solid' : uiPreferences.buttonStyle, 'default')
  );
  const textButtonClass = 'text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition';

  const handleDraftChange = <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    setUploadError(null);
    try {
      const res = await fetch('/api/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setAppearanceConfig(draft);
      const msg = '外观设置已保存，全站生效';
      setSaveStatus({ type: 'success', msg });
      showToast?.(msg, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败';
      setSaveStatus({ type: 'error', msg });
      showToast?.(msg, 'warn');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要恢复默认外观吗？所有自定义设置将被重置。')) return;
    setDraft(DEFAULT_APPEARANCE_CONFIG);
    setAppearanceConfig(DEFAULT_APPEARANCE_CONFIG);
    setSaveStatus(null);
    try {
      await fetch('/api/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_APPEARANCE_CONFIG),
      });
      const msg = '已恢复默认外观';
      setSaveStatus({ type: 'success', msg });
      showToast?.(msg, 'success');
    } catch (e) {
      const msg = '恢复默认失败，请刷新页面重试';
      setSaveStatus({ type: 'error', msg });
      showToast?.(msg, 'warn');
    }
  };

  const handleUpload = async (file: File, type: 'favicon' | 'background') => {
    setUploadError(null);
    const isFav = type === 'favicon';
    isFav ? setIsUploadingFavicon(true) : setIsUploadingBg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/appearance/upload/${type}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      handleDraftChange(isFav ? 'faviconUrl' : 'backgroundUrl', data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '上传失败');
    } finally {
      isFav ? setIsUploadingFavicon(false) : setIsUploadingBg(false);
    }
  };

  const handleDeleteFavicon = async () => {
    if (!draft.faviconUrl) return;
    try {
      const res = await fetch('/api/appearance/upload/favicon', { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      handleDraftChange('faviconUrl', '');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleDeleteBackground = async () => {
    if (!draft.backgroundUrl) return;
    try {
      const res = await fetch('/api/appearance/upload/background', { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      handleDraftChange('backgroundUrl', '');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const SectionTitle = ({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} className="text-zinc-500" />
        <h3 className="text-lg font-black text-zinc-900 dark:text-white">{title}</h3>
      </div>
      {desc && <p className="text-[13px] text-zinc-500 pl-7">{desc}</p>}
    </div>
  );

  const SliderField = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = useState(value);
    // sync when value prop changes from outside (e.g. reset)
    useEffect(() => { setDisplayValue(value); if (inputRef.current) inputRef.current.value = String(value); }, [value]);

    const handleInput = () => {
      const el = inputRef.current;
      if (!el) return;
      setDisplayValue(Number(el.value));
    };

    const handleCommit = () => {
      const el = inputRef.current;
      if (!el) return;
      onChange(Number(el.value));
    };

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
          <span className="text-[12px] font-mono font-bold text-zinc-700 dark:text-zinc-300">{displayValue}{unit}</span>
        </div>
        <input
          ref={inputRef}
          type="range" min={min} max={max} defaultValue={value}
          onInput={handleInput}
          onPointerUp={handleCommit}
          onMouseUp={handleCommit}
          onKeyUp={handleCommit}
          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
        />
      </div>
    );
  };

  const previewBgStyle: React.CSSProperties = draft.customEnabled && draft.backgroundUrl
    ? { backgroundImage: `url(${draft.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: draft.backgroundFixed ? 'fixed' : 'scroll' }
    : {};

  const previewOverlayStyle: React.CSSProperties = draft.customEnabled
    ? { backdropFilter: `blur(${draft.blurStrength}px)`, WebkitBackdropFilter: `blur(${draft.blurStrength}px)`, background: `rgba(255,255,255,${draft.opacity / 100})` }
    : {};

  const glassBg: React.CSSProperties = draft.customEnabled
    ? { background: 'rgba(255,255,255,0.45)', backdropFilter: `blur(${draft.blurStrength}px)` }
    : { background: 'rgba(255,255,255,1)' };

  const darkGlassBg: React.CSSProperties = draft.customEnabled
    ? { background: 'rgba(18,18,20,0.55)', backdropFilter: `blur(${draft.blurStrength}px)` }
    : { background: 'rgba(18,18,20,1)' };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in mt-4">
      <h2 className="text-3xl font-black tracking-tighter mb-8 flex items-center gap-3">
        <Palette size={28} className="text-zinc-400" /> 外观设置
      </h2>

      {saveStatus && (
        <div className={cn("mb-6 p-4 rounded-2xl border text-[13px] font-bold flex items-center gap-2",
          saveStatus.type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
        )}>
          {saveStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveStatus.msg}
        </div>
      )}

      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {uploadError}
        </div>
      )}

      <div className={panelClass} style={glassBg}>
        <SectionTitle icon={Type} title="站点信息" desc="设置站点名称和描述，用于页面标题和元信息。" />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">站点名称</label>
            <input type="text" value={draft.siteName} onChange={(e) => handleDraftChange('siteName', e.target.value)}
              className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition backdrop-blur-sm" placeholder="站点名称" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">站点描述</label>
            <input type="text" value={draft.siteDescription} onChange={(e) => handleDraftChange('siteDescription', e.target.value)}
              className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition backdrop-blur-sm" placeholder="站点描述，用于元信息及社交媒体卡片" />
          </div>
        </div>
      </div>

      <div className={panelClass} style={glassBg}>
        <SectionTitle icon={Code} title="自定义代码" desc="在所有页面加载时注入自定义 HTML/CSS/JavaScript。" />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileCode size={12} /> 自定义头部 (&lt;/head&gt; 前)</label>
            <textarea value={draft.customHead} onChange={(e) => handleDraftChange('customHead', e.target.value)} rows={4}
              className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition resize-y backdrop-blur-sm"
              placeholder="<style>...</style> 或 <script>...</script>" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileCode size={12} /> 自定义 Body 底部 (&lt;/body&gt; 前)</label>
            <textarea value={draft.customBody} onChange={(e) => handleDraftChange('customBody', e.target.value)} rows={4}
              className="w-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition resize-y backdrop-blur-sm"
              placeholder="<script>...</script>" />
          </div>
        </div>
      </div>

      <div className={panelClass} style={glassBg}>
        <SectionTitle icon={Fingerprint} title="自定义 Favicon" desc="在浏览器标签页显示的图标，更新后可能需要清除缓存才能看到更改。" />
        <div className="flex items-center gap-4 flex-wrap">
          {draft.faviconUrl ? (
            <div className="flex items-center gap-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm">
              <img src={draft.faviconUrl} alt="favicon" className="w-8 h-8 rounded" />
              <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400">当前 Favicon</span>
              <button onClick={handleDeleteFavicon} className="p-1.5 text-zinc-400 hover:text-red-500 transition" title="删除"><Trash2 size={14} /></button>
            </div>
          ) : <span className="text-[12px] font-bold text-zinc-400">尚未设置 Favicon</span>}
          <input ref={faviconRef} type="file" accept="image/x-icon,image/png,image/jpeg,image/svg+xml" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'favicon'); e.target.value = ''; }} />
          <button onClick={() => faviconRef.current?.click()} disabled={isUploadingFavicon} className={cn(actionButtonClass, 'px-4 py-2 text-[12px]')}>
            {isUploadingFavicon && <Loader2 size={12} className="animate-spin" />}
            <Upload size={12} /> {isUploadingFavicon ? '上传中...' : '上传 Favicon'}
          </button>
        </div>
      </div>

      <div className={panelClass} style={glassBg}>
        <div className="flex items-center justify-between mb-6">
          <SectionTitle icon={Sparkles} title="自定义外观" desc="开启后可设置自定义背景图片和玻璃拟态效果。" />
          <button onClick={() => handleDraftChange('customEnabled', !draft.customEnabled)}
            className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', draft.customEnabled ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700')}>
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform', draft.customEnabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div className={cn('flex flex-col gap-6', !draft.customEnabled && 'opacity-50 pointer-events-none select-none')}>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><ImageIcon size={12} /> 背景图片</label>
            <div className="flex items-center gap-3">
              <input type="text" value={draft.backgroundUrl} onChange={(e) => handleDraftChange('backgroundUrl', e.target.value)}
                className="flex-1 bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition backdrop-blur-sm"
                placeholder="图片 URL 或随机图 API 地址，留空则不显示" />
              {draft.backgroundUrl && (
                <button onClick={handleDeleteBackground} className="p-2 text-zinc-400 hover:text-red-500 transition shrink-0" title="删除背景图"><Trash2 size={16} /></button>
              )}
              <input ref={bgRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'background'); e.target.value = ''; }} />
              <button onClick={() => bgRef.current?.click()} disabled={isUploadingBg} className={cn(actionButtonClass, 'px-3 py-2 text-[12px] shrink-0')}>
                {isUploadingBg && <Loader2 size={12} className="animate-spin" />}
                <Upload size={12} /> {isUploadingBg ? '上传中...' : '上传'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => handleDraftChange('backgroundFixed', !draft.backgroundFixed)}
              className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', draft.backgroundFixed ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700')}>
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform', draft.backgroundFixed ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">背景固定显示（不随页面滚动）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SliderField label="毛玻璃模糊强度" value={draft.blurStrength} min={0} max={20} unit="px" onChange={(v) => handleDraftChange('blurStrength', v)} />
            <SliderField label="整体透明度" value={draft.opacity} min={0} max={100} unit="%" onChange={(v) => handleDraftChange('opacity', v)} />
            <SliderField label="圆角大小" value={draft.radius} min={0} max={16} unit="px" onChange={(v) => handleDraftChange('radius', v)} />
            <SliderField label="光晕强度" value={draft.glow} min={0} max={20} unit="px" onChange={(v) => handleDraftChange('glow', v)} />
          </div>
        </div>
      </div>

      <div className={panelClass} style={glassBg}>
        <SectionTitle icon={Crosshair} title="枪械卡片样式" desc="调整首页枪械卡片的不透明度与底色。" />
        <div className="flex flex-col gap-6">
          <SliderField label="卡片不透明度" value={draft.gunCardOpacity} min={0} max={100} unit="%" onChange={(v) => handleDraftChange('gunCardOpacity', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">亮色模式卡片底色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={draft.gunCardColorLight} onChange={(e) => handleDraftChange('gunCardColorLight', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer shrink-0" />
                <input type="text" value={draft.gunCardColorLight} onChange={(e) => handleDraftChange('gunCardColorLight', e.target.value)}
                  className="flex-1 bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition backdrop-blur-sm" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">暗色模式卡片底色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={draft.gunCardColorDark} onChange={(e) => handleDraftChange('gunCardColorDark', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer shrink-0" />
                <input type="text" value={draft.gunCardColorDark} onChange={(e) => handleDraftChange('gunCardColorDark', e.target.value)}
                  className="flex-1 bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition backdrop-blur-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass} style={glassBg}>
        <div className="flex items-center gap-2 mb-4"><Eye size={18} className="text-zinc-500" /><h3 className="text-lg font-black text-zinc-900 dark:text-white">实时预览</h3></div>
        <div className="relative h-48 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50" style={previewBgStyle}>
          <div className="absolute inset-0 flex items-center justify-center" style={previewOverlayStyle}>
            <div className="px-6 py-4 border border-white/20 dark:border-white/10"
              style={{
                borderRadius: draft.customEnabled ? draft.radius : 12,
                boxShadow: draft.customEnabled ? `0 4px ${draft.glow}px rgba(0,0,0,0.1)` : undefined,
                background: draft.customEnabled ? `rgba(255,255,255,${draft.opacity / 100})` : undefined,
                backdropFilter: draft.customEnabled ? `blur(${draft.blurStrength}px)` : undefined,
              }}>
              <span className="text-[13px] font-black text-zinc-900 dark:text-white">卡片预览效果</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 pb-8">
        <button onClick={handleReset} className={textButtonClass}><RotateCcw size={12} className="inline mr-1" /> 恢复默认</button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(actionButtonClass, 'px-6 py-2.5')}
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
