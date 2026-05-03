import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils';
import { CollectMeta } from '../types';
import { overlayFade, scaleIn } from './motionPresets';

export type AutoCollectConfig = {
  enabled: boolean;
  model: string;
  backupModel: string;
  intervalHours: number;
  creatorIds: string[];
  logs: Array<{ time: string; message: string; success: boolean }>;
  hasRetry?: boolean;
  retryVideos?: any[];
};

export type AutoCollectConfigModalProps = {
  onClose: () => void;
  config: AutoCollectConfig;
  setConfig: React.Dispatch<React.SetStateAction<AutoCollectConfig>>;
  meta: CollectMeta;
  isSaving: boolean;
  onSave: () => Promise<void>;
};

export function AutoCollectConfigModal({
  onClose,
  config,
  setConfig,
  meta,
  isSaving,
  onSave,
}: AutoCollectConfigModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 overscroll-contain" onWheel={(event) => event.stopPropagation()}>
        <motion.div
          className="absolute inset-0 bg-zinc-900/60"
          onClick={onClose}
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="exit"
        />
        <motion.div
          className="bg-white dark:bg-[#121214] rounded-3xl p-6 md:p-8 relative z-10 w-full max-w-2xl flex flex-col gap-5 shadow-2xl"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">自动采集设置</h3>
            <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">后台智能比对记录，自动过滤重复视频并加入新卡片</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 mt-2">
          <span className="font-bold text-[13px] dark:text-zinc-300">开启后台定时采集</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => setConfig((p) => ({ ...p, enabled: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">监听博主 (多选)</label>
          <div className="flex flex-wrap gap-2">
            {meta.creators.map((creator) => {
              const active = config.creatorIds.includes(creator.id);
              return (
                <button
                  key={creator.id}
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      creatorIds: active
                        ? p.creatorIds.filter((id) => id !== creator.id)
                        : [...p.creatorIds, creator.id],
                    }))
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-[12px] font-bold transition",
                    active
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                      : "bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  {creator.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">执行频率</label>
          <select
            value={config.intervalHours}
            onChange={(e) => setConfig((p) => ({ ...p, intervalHours: Number(e.target.value) }))}
            className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 rounded-xl text-[13px] font-bold shadow-sm focus:ring-4 focus:ring-zinc-900/10 outline-none"
          >
            <option value={1 / 60}>每 1 分钟检测一次 (测试专用)</option>
            <option value={1}>每 1 小时检测一次</option>
            <option value={2}>每 2 小时检测一次</option>
            <option value={4}>每 4 小时检测一次</option>
            <option value={12}>每 12 小时检测一次</option>
            <option value={24}>每 24 小时检测一次</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">主提取模型</label>
            <select
              value={config.model}
              onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))}
              className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 rounded-xl text-[13px] font-bold shadow-sm focus:ring-4 focus:ring-zinc-900/10 outline-none"
            >
              <option value="">-- 请选择模型 --</option>
              {meta.modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">备用提取模型</label>
            <select
              value={config.backupModel}
              onChange={(e) => setConfig((p) => ({ ...p, backupModel: e.target.value }))}
              className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 rounded-xl text-[13px] font-bold shadow-sm focus:ring-4 focus:ring-zinc-900/10 outline-none"
            >
              <option value="">-- 不使用备用模型 --</option>
              {meta.modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[13px] hover:opacity-90 transition disabled:opacity-60"
        >
          {isSaving ? '保存中...' : '保存配置'}
        </button>

        <div className="mt-2 flex flex-col gap-2">
          {config.hasRetry && config.retryVideos && config.retryVideos.length > 0 && (
            <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl border border-red-100 dark:border-red-500/20">
              <div className="flex justify-between items-center">
                <h4 className="text-[12px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  等待重试的视频 ({config.retryVideos.length})
                </h4>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/collect/auto/cancel-retry', { method: 'POST' });
                      setConfig(p => ({ ...p, hasRetry: false, retryVideos: [] }));
                    } catch (e) {
                      console.error('Failed to cancel retry', e);
                    }
                  }}
                  className="text-[11px] px-3 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-bold hover:bg-red-200 transition"
                >
                  一键终止全部
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                {config.retryVideos.map(v => (
                  <div key={v.bvid || v.id} className="flex justify-between items-center bg-white dark:bg-[#18181b] p-2 rounded-xl border border-red-100 dark:border-red-500/10">
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]" title={v.title}>{v.title || v.bvid || v.id}</span>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/collect/auto/cancel-retry', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoId: v.bvid || v.id })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setConfig(p => ({ ...p, hasRetry: data.hasRetry, retryVideos: data.retryVideos || [] }));
                          }
                        } catch (e) {
                          console.error('Failed to cancel specific retry', e);
                        }
                      }}
                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    >
                      单独取消
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-1">
            <h4 className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">运行日志 (仅存最近100条)</h4>
          </div>
          <div className="bg-zinc-900 text-zinc-300 font-mono text-[11px] p-4 rounded-2xl h-48 overflow-y-auto flex flex-col gap-2 shadow-inner">
            {config.logs.length === 0 ? (
              <span className="opacity-50">暂无日志...</span>
            ) : (
              config.logs.map((log, i) => (
                <div key={i} className={log.success ? "text-emerald-400" : "text-red-400"}>
                  <span className="text-zinc-500">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
