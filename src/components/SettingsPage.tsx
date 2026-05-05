import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn, radiusClassMap, getButtonClassName } from '../utils';
import { UiPreferences } from '../types';
import { CustomTheme } from '../hooks/useTheme';

export type SettingsPageProps = {
  uiPreferences: UiPreferences;
  customTheme: CustomTheme;
  setCustomTheme: React.Dispatch<React.SetStateAction<CustomTheme>>;
  resetTheme: () => void;
  cookieStatus: { exists: boolean; mtime?: string } | null;
  isUploadingCookie: boolean;
  handleCookieUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  cookieTestResult: { success: boolean; message: string } | null;
  dailyPwdLogs: Array<{ time: string; message: string; success: boolean }>;
  isRefreshingDailyPwd: boolean;
  handleRefreshDailyPwd: () => Promise<void>;
  onClearDailyPwdLogs?: (days: string) => Promise<void>;
};

export function SettingsPage({
  uiPreferences,
  customTheme,
  setCustomTheme,
  resetTheme,
  cookieStatus,
  isUploadingCookie,
  handleCookieUpload,
  cookieTestResult,
  dailyPwdLogs,
  isRefreshingDailyPwd,
  handleRefreshDailyPwd,
  onClearDailyPwdLogs,
}: SettingsPageProps) {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearTarget, setClearTarget] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const clearOptions = [
    { label: '全部', value: 'all' },
    { label: '1个月', value: '30' },
    { label: '7天', value: '7' },
    { label: '3天', value: '3' },
    { label: '1天', value: '1' },
  ];

  const handleClearConfirm = async () => {
    if (!clearTarget || !onClearDailyPwdLogs) return;
    setIsClearing(true);
    try {
      await onClearDailyPwdLogs(clearTarget);
      setShowClearDialog(false);
      setClearTarget(null);
    } catch {
      // error handled by parent toast
    } finally {
      setIsClearing(false);
    }
  };
  const radiusClass = radiusClassMap[uiPreferences.controlRadius];
  const settingsActionButtonClass = cn(
    'px-6 py-2.5 text-[13px] font-black transition flex items-center gap-2 disabled:opacity-60',
    radiusClass,
    getButtonClassName(uiPreferences.buttonStyle === 'soft' ? 'solid' : uiPreferences.buttonStyle, 'default')
  );
  const textButtonClass = 'text-[13px] font-bold text-muted hover:text-zinc-900 dark:hover:text-white transition';
  const settingsPanelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm mb-6',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );

  return (
    <div className="max-w-3xl mx-auto animate-fade-in mt-4">
      <h2 className="text-3xl font-black tracking-tighter mb-8 flex items-center gap-3">
        系统设置
      </h2>

      <div className={settingsPanelClass}>
        <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">Bilibili 采集 Cookie</h3>
        <p className="text-[13px] text-muted mb-6">上传 Netscape 格式的 cookies.txt 文件以更新采集凭证。上传后会自动进行一次抓取测试以验证有效性。</p>

        {cookieStatus && (
          <div className="mb-6 p-4 bg-zinc-50 dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            {cookieStatus.exists ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
                  <span className="text-[13px] font-black text-zinc-700 dark:text-zinc-300">当前已有生效的 Cookie 文件</span>
                </div>
                <span className="text-[12px] font-bold text-muted">更新于: {new Date(cookieStatus.mtime!).toLocaleString('zh-CN')}</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-muted" strokeWidth={2.5} />
                <span className="text-[13px] font-black text-muted">当前未上传任何 Cookie 文件</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <input type="file" accept=".txt" id="cookie-upload" className="hidden" onChange={handleCookieUpload} />
          <label htmlFor="cookie-upload" className={cn(settingsActionButtonClass,'cursor-pointer')}>
            {isUploadingCookie && <Loader2 size={14} className="animate-spin" />}
            {isUploadingCookie ? '正在测试...' : '上传 cookies.txt'}
          </label>
          {cookieTestResult && (
            <span className={cn("text-[13px] font-bold px-4 py-2.5 rounded-xl border", cookieTestResult.success ?"bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400":"bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400")}>
              {cookieTestResult.message}
            </span>
          )}
        </div>
      </div>

      <div className={settingsPanelClass}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">每日密码日志</h3>
            <p className="text-[13px] text-muted">记录每日密码缓存读取、手动刷新和后台自动抓取状态，仅保留最近 100 条。</p>
          </div>
          <div className="flex items-center gap-2">
            {dailyPwdLogs.length > 0 && (
              <button
                type="button"
                onClick={() => { setShowClearDialog(true); setClearTarget(null); }}
                className="flex items-center gap-1 text-[11px] font-bold text-muted hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
              >
                <Trash2 size={12} />
                清空日志
              </button>
            )}
            <button
              type="button"
              onClick={handleRefreshDailyPwd}
              disabled={isRefreshingDailyPwd}
              className={cn(settingsActionButtonClass,'shrink-0 px-4')}
            >
              {isRefreshingDailyPwd && <Loader2 size={12} className="animate-spin" />}
              {isRefreshingDailyPwd ? '获取中...' : '获取'}
            </button>
          </div>
        </div>
        <div className="bg-zinc-900 text-zinc-300 font-mono text-[11px] p-4 rounded-2xl h-36 overflow-y-auto flex flex-col gap-2 shadow-inner">
          {dailyPwdLogs.length === 0 ? (
            <span className="opacity-50">暂无日志...</span>
          ) : (
            dailyPwdLogs.map((log, i) => (
              <div key={i} className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                <span className="text-muted">[{log.time}]</span> {log.message}
              </div>
            ))
          )}
        </div>

        {showClearDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowClearDialog(false); setClearTarget(null); }} />
            <div className="relative bg-white dark:bg-[#18181b] rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="text-[14px] font-black text-zinc-900 dark:text-white mb-1">清空每日密码日志</h4>
              <p className="text-[12px] text-muted mb-4">选择需要清理的时间范围</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {clearOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setClearTarget(opt.value)}
                    className={cn("py-1.5 px-1 rounded-xl text-[11px] font-bold transition border",
                      clearTarget === opt.value
                        ?"bg-red-50 dark:bg-red-500/10 border-red-500 text-red-600 dark:text-red-400":"bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600  hover:border-zinc-300")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {clearTarget && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                  <p className="text-[12px] font-bold text-red-600 dark:text-red-400">确认删除{clearOptions.find(o => o.value === clearTarget)?.label}的日志吗？</p>
                  <p className="text-[11px] text-red-500/70 mt-0.5">删除后不可恢复</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowClearDialog(false); setClearTarget(null); }}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleClearConfirm}
                  disabled={!clearTarget || isClearing}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-40"
                >
                  {isClearing ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={settingsPanelClass}>
        <h3 className="text-lg font-black mb-6 text-zinc-900 dark:text-white">个性化设置</h3>
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-[12px] font-bold text-muted uppercase tracking-widest mb-2">主题强调色</label>
            <div className="flex items-center gap-3">
              <input type="color" value={customTheme.themeColor} onChange={e => setCustomTheme(p => ({...p, themeColor: e.target.value}))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase">{customTheme.themeColor}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-muted uppercase tracking-widest mb-2">日间文字颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={customTheme.textColorLight} onChange={e => setCustomTheme(p => ({...p, textColorLight: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-muted uppercase tracking-widest mb-2">暗黑文字颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={customTheme.textColorDark} onChange={e => setCustomTheme(p => ({...p, textColorDark: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-muted uppercase tracking-widest mb-2">日间枪械名颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={customTheme.gunNameColorLight} onChange={e => setCustomTheme(p => ({...p, gunNameColorLight: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-muted uppercase tracking-widest mb-2">暗黑枪械名颜色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={customTheme.gunNameColorDark} onChange={e => setCustomTheme(p => ({...p, gunNameColorDark: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
            <button onClick={resetTheme} className={textButtonClass}>恢复默认主题</button>
          </div>
        </div>
      </div>
    </div>
  );
}
