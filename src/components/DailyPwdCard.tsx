import React from 'react';
import { Sparkles } from 'lucide-react';

export type DailyPwdCardProps = {
  dailyPwd: { date: string; data: Record<string, string> } | null;
  copiedDailyPwdKey: string | null;
  handleCopyDailyPwd: (mapName: string, pwd: string) => Promise<void>;
};

export function DailyPwdCard({
  dailyPwd,
  copiedDailyPwdKey,
  handleCopyDailyPwd,
}: DailyPwdCardProps) {
  if (!dailyPwd) return null;

  return (
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
  );
}
