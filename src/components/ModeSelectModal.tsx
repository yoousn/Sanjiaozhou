import React from 'react';
import { X, Radio, Sparkles } from 'lucide-react';

export type ModeSelectModalProps = {
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAuto: () => void;
};

export function ModeSelectModal({
  onClose,
  onSelectManual,
  onSelectAuto,
}: ModeSelectModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60" onClick={onClose} />
      <div className="bg-white rounded-3xl p-8 relative z-10 w-full max-w-sm flex flex-col gap-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-zinc-900">选择采集模式</h3>
          <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="grid gap-3">
          <button
            onClick={onSelectManual}
            className="py-4 px-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-bold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition flex items-center justify-between text-left"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-[14px]">手动采集</span>
              <span className="text-[11px] font-medium text-muted">自己搜索并勾选视频加入网站</span>
            </div>
            <Radio size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={onSelectAuto}
            className="py-4 px-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-400 transition flex items-center justify-between text-left"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-[14px]">自动采集配置</span>
              <span className="text-[11px] font-medium text-muted">每小时自动获取博主最新视频</span>
            </div>
            <Sparkles size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
