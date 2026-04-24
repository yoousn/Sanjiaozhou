import React from 'react';
import { Home, Crosshair, Target, Settings } from 'lucide-react';
import { cn } from '../utils';

export function Sidebar({ activeTab, setActiveTab, onOpenSettings }: { activeTab: string, setActiveTab: (tab: string) => void, onOpenSettings: () => void }) {
  const navItems = [
    { id: 'home', icon: Home, label: '全部体系' },
    { id: 'ar', icon: Crosshair, label: '突击步枪' },
    { id: 'br', icon: Crosshair, label: '战斗步枪' },
    { id: 'smg', icon: Target, label: '冲锋枪' },
    { id: 'lmg', icon: Target, label: '轻机枪' },
    { id: 'dmr', icon: Crosshair, label: '精准射手步枪' },
    { id: 'sr', icon: Target, label: '狙击步枪' },
    { id: 'pistol', icon: Target, label: '手枪' }
  ];

  return (
    <>
      <nav className="hidden md:flex flex-col w-20 lg:w-56 h-screen fixed left-0 top-0 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-[#F8F9FA] dark:bg-[#0b0b0c] transition-colors duration-300 z-40 p-4 pt-8 shadow-[1px_0_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 px-2 mb-8 w-full hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-900 to-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
            <span className="font-extrabold text-sm tracking-tighter">🐴</span>
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-black text-[14px] tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">Arsenal</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 w-full">
          <div className="px-3 mb-2 hidden lg:block">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Categories</span>
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 rounded-xl transition duration-200 outline-none focus:ring-2 focus:ring-zinc-900/10 active:scale-95 group w-full",
                  isActive 
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm" 
                    : "text-zinc-500 font-semibold hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Icon size={16} className={cn("transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("hidden lg:block whitespace-nowrap text-[13px]", isActive ? "font-bold" : "font-semibold")}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto mb-6 w-full px-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 rounded-xl transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white w-full group"
          >
            <Settings size={16} strokeWidth={2} className="group-hover:rotate-45 transition-transform duration-300" />
            <span className="hidden lg:block text-[13px] font-bold">系统设置</span>
          </button>
        </div>
      </nav>

      {/* Mobile nav rounded pill style */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] h-14 rounded-full border border-zinc-200/80 bg-white/95 backdrop-blur-md z-50 px-2 flex items-center justify-around shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-2 rounded-full outline-none transition duration-200 active:scale-95",
                isActive ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500"
              )}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="text-[11px] font-bold whitespace-nowrap">{item.label}</span>
              )}
            </button>
          )
        })}
        <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center px-3 py-2 rounded-full outline-none transition duration-200 active:scale-95 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <Settings size={16} strokeWidth={2} />
        </button>
      </nav>
    </>
  );
}
