import React, { useState, useRef } from 'react';
import { Loader2, Upload, Trash2, Eye, Palette, RotateCcw, Image as ImageIcon, Type, Code, FileCode, Fingerprint, Sparkles } from 'lucide-react';
import { cn, getButtonClassName, radiusClassMap } from '../utils';
import { AppearanceConfig } from '../types';

type Props = {
  appearanceConfig: AppearanceConfig;
  updateAppearance: <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => void;
  resetAppearance: () => void;
  uiPreferences: { controlRadius: 'lg' | 'xl' | 'full'; buttonStyle: 'soft' | 'solid' | 'outline' };
};

export function AppearanceSettingsPage({ appearanceConfig, updateAppearance, resetAppearance, uiPreferences }: Props) {
  const radiusClass = radiusClassMap[uiPreferences.controlRadius];
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const panelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm mb-6',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );
  const actionButtonClass = cn(
    'px-6 py-2.5 text-[13px] font-black transition flex items-center gap-2 disabled:opacity-60',
    radiusClass,
    getButtonClassName(uiPreferences.buttonStyle === 'soft' ? 'solid' : uiPreferences.buttonStyle, 'default')
  );
  const textButtonClass = 'text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition';

  const handleUpload = async (file: File, type: 'favicon' | 'background') => {
    setUploadError(null);
    const isFav = type === 'favicon';
    isFav ? setIsUploadingFavicon(true) : setIsUploadingBg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/upload/${type}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      updateAppearance(isFav ? 'faviconUrl' : 'backgroundUrl', data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '上传失败');
    } finally {
      isFav ? setIsUploadingFavicon(false) : setIsUploadingBg(false);
    }
  };

  const handleDeleteFavicon = async () => {
    if (!appearanceConfig.faviconUrl) return;
    try {
      const res = await fetch('/api/upload/favicon', { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      updateAppearance('faviconUrl', '');
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

  const SliderField = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-[12px] font-mono font-bold text-zinc-700 dark:text-zinc-300">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
      />
    </div>
  );

  const previewBgStyle: React.CSSProperties = appearanceConfig.customEnabled && appearanceConfig.backgroundUrl
    ? { backgroundImage: `url(${appearanceConfig.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: appearanceConfig.backgroundFixed ? 'fixed' : 'scroll' }
    : {};

  const previewOverlayStyle: React.CSSProperties = appearanceConfig.customEnabled
    ? { backdropFilter: `blur(${appearanceConfig.blurStrength}px)`, WebkitBackdropFilter: `blur(${appearanceConfig.blurStrength}px)`, background: `rgba(255,255,255,${appearanceConfig.opacity / 100})` }
    : {};

  return (
    <div className="max-w-3xl mx-auto animate-fade-in mt-4">
      <h2 className="text-3xl font-black tracking-tighter mb-8 flex items-center gap-3">
        <Palette size={28} className="text-zinc-400" /> 外观设置
      </h2>

      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-bold">{uploadError}</div>
      )}

      <div className={panelClass}>
        <SectionTitle icon={Type} title="站点信息" desc="设置站点名称和描述，用于页面标题和元信息。" />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">站点名称</label>
            <input type="text" value={appearanceConfig.siteName} onChange={(e) => updateAppearance('siteName', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition" placeholder="站点名称" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">站点描述</label>
            <input type="text" value={appearanceConfig.siteDescription} onChange={(e) => updateAppearance('siteDescription', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition" placeholder="站点描述，用于元信息及社交媒体卡片" />
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle icon={Code} title="自定义代码" desc="在所有页面加载时注入自定义 HTML/CSS/JavaScript。" />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileCode size={12} /> 自定义头部 (&lt;/head&gt; 前)</label>
            <textarea value={appearanceConfig.customHead} onChange={(e) => updateAppearance('customHead', e.target.value)} rows={4}
              className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition resize-y"
              placeholder="<style>...</style> 或 <script>...</script>" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileCode size={12} /> 自定义 Body 底部 (&lt;/body&gt; 前)</label>
            <textarea value={appearanceConfig.customBody} onChange={(e) => updateAppearance('customBody', e.target.value)} rows={4}
              className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition resize-y"
              placeholder="<script>...</script>" />
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle icon={Fingerprint} title="自定义 Favicon" desc="在浏览器标签页显示的图标，更新后可能需要清除缓存才能看到更改。" />
        <div className="flex items-center gap-4 flex-wrap">
          {appearanceConfig.faviconUrl ? (
            <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800">
              <img src={appearanceConfig.faviconUrl} alt="favicon" className="w-8 h-8 rounded" />
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

      <div className={panelClass}>
        <div className="flex items-center justify-between mb-6">
          <SectionTitle icon={Sparkles} title="自定义外观" desc="开启后可设置自定义背景图片和玻璃拟态效果。" />
          <button onClick={() => updateAppearance('customEnabled', !appearanceConfig.customEnabled)}
            className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', appearanceConfig.customEnabled ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700')}>
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform', appearanceConfig.customEnabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div className={cn('flex flex-col gap-6', !appearanceConfig.customEnabled && 'opacity-50 pointer-events-none select-none')}>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><ImageIcon size={12} /> 背景图片</label>
            <div className="flex items-center gap-3">
              <input type="text" value={appearanceConfig.backgroundUrl} onChange={(e) => updateAppearance('backgroundUrl', e.target.value)}
                className="flex-1 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-[13px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 transition"
                placeholder="图片 URL 或随机图 API 地址，留空则不显示" />
              <input ref={bgRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'background'); e.target.value = ''; }} />
              <button onClick={() => bgRef.current?.click()} disabled={isUploadingBg} className={cn(actionButtonClass, 'px-3 py-2 text-[12px] shrink-0')}>
                {isUploadingBg && <Loader2 size={12} className="animate-spin" />}
                <Upload size={12} /> {isUploadingBg ? '上传中...' : '上传'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => updateAppearance('backgroundFixed', !appearanceConfig.backgroundFixed)}
              className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', appearanceConfig.backgroundFixed ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700')}>
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform', appearanceConfig.backgroundFixed ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">背景固定显示（不随页面滚动）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SliderField label="毛玻璃模糊强度" value={appearanceConfig.blurStrength} min={0} max={20} unit="px" onChange={(v) => updateAppearance('blurStrength', v)} />
            <SliderField label="整体透明度" value={appearanceConfig.opacity} min={70} max={100} unit="%" onChange={(v) => updateAppearance('opacity', v)} />
            <SliderField label="圆角大小" value={appearanceConfig.radius} min={0} max={16} unit="px" onChange={(v) => updateAppearance('radius', v)} />
            <SliderField label="光晕强度" value={appearanceConfig.glow} min={0} max={20} unit="px" onChange={(v) => updateAppearance('glow', v)} />
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex items-center gap-2 mb-4"><Eye size={18} className="text-zinc-500" /><h3 className="text-lg font-black text-zinc-900 dark:text-white">实时预览</h3></div>
        <div className="relative h-48 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800" style={previewBgStyle}>
          <div className="absolute inset-0 flex items-center justify-center" style={previewOverlayStyle}>
            <div className="px-6 py-4 border border-white/20 dark:border-white/10"
              style={{
                borderRadius: appearanceConfig.customEnabled ? appearanceConfig.radius : 12,
                boxShadow: appearanceConfig.customEnabled ? `0 4px ${appearanceConfig.glow}px rgba(0,0,0,0.1)` : undefined,
                background: appearanceConfig.customEnabled ? `rgba(255,255,255,${appearanceConfig.opacity / 100})` : undefined,
              }}>
              <span className="text-[13px] font-black text-zinc-900 dark:text-white">卡片预览效果</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 pb-8">
        <button onClick={resetAppearance} className={textButtonClass}><RotateCcw size={12} className="inline mr-1" /> 恢复默认外观</button>
      </div>
    </div>
  );
}
