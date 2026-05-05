import { Home, Settings, Users, LogIn, LogOut, User, Palette } from 'lucide-react';
import { cn, getButtonClassName, radiusClassMap, sidebarWidthClassMap } from '../utils';
import type { UiButtonStyle, UiRadius, UiSidebarWidth } from '../types';

const APP_VERSION = `v${__APP_VERSION__}`;

export function Sidebar({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenAppearance,
  sidebarWidth,
  controlRadius,
  buttonStyle,
  auth,
  onOpenAuth,
  onLogout,
}: {
  activeTab: string,
  setActiveTab: (tab: string) => void,
  onOpenSettings: () => void,
  onOpenAppearance: () => void,
  sidebarWidth: UiSidebarWidth,
  controlRadius: UiRadius,
  buttonStyle: UiButtonStyle,
  auth: any,
  onOpenAuth: () => void,
  onLogout?: () => void,
}) {
  const radiusClass = radiusClassMap[controlRadius];
  const sidebarWidthClasses = sidebarWidthClassMap[sidebarWidth];

  return (
    <>
      <nav className={cn("hidden md:flex flex-col h-screen fixed left-0 top-0 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-[#F8F9FA] dark:bg-[#0b0b0c] transition-colors duration-300 z-40 p-4 pt-8 shadow-[1px_0_20px_rgba(0,0,0,0.02)] overflow-y-auto", sidebarWidthClasses.nav)}>
        <div className="flex items-center gap-3 px-2 mb-8 w-full hover:opacity-80 transition-opacity cursor-pointer shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-900 to-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
            <span className="font-extrabold text-sm tracking-tighter">🐴</span>
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-black text-[14px] tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">Arsenal</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Base</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 w-full shrink-0">
          <div className="px-3 mb-2 hidden lg:block">
            <span className="text-[9px] font-black text-muted uppercase tracking-wider">Navigation</span>
          </div>
          
          <button
            onClick={() => setActiveTab('home')}
            className={cn("flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 transition duration-200 outline-none focus:ring-2 focus:ring-zinc-900/10 active:scale-95 group w-full",
              radiusClass,
              activeTab ==='home'? cn(getButtonClassName(buttonStyle ==='outline'?'solid': buttonStyle,'default'),'dark:bg-zinc-100 dark:text-zinc-900')
                :"text-muted font-semibold hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white")}
          >
            <Home size={16} className={cn("transition-transform duration-300", activeTab ==='home'&&"scale-110")} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className={cn("hidden lg:block whitespace-nowrap text-[13px]", activeTab ==='home'?"font-bold":"font-semibold")}>
              首页/改枪码
            </span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={cn("flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 w-full group mb-1",
              radiusClass,
              activeTab ==='community'? cn(getButtonClassName(buttonStyle ==='outline'?'solid': buttonStyle,'default'),'dark:bg-zinc-100 dark:text-zinc-900 text-zinc-900')
                :"text-muted hover:text-zinc-900 dark:hover:text-white",
            )}
          >
            <Users size={16} strokeWidth={activeTab === 'community' ? 2.5 : 2} className={cn("transition-transform duration-300", activeTab ==='community'&&"scale-110")} />
            <span className={cn("hidden lg:block text-[13px]", activeTab ==='community'?"font-bold":"font-semibold")}>社区</span>
          </button>
        </div>

        <div className="mt-auto mb-6 w-full px-2 shrink-0 pt-8 flex flex-col gap-1">
          {auth.isAuthenticated ? (
            <div className={cn("flex items-center justify-between px-3 py-2.5 mb-2 bg-zinc-100 dark:bg-zinc-800/50", radiusClass)}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-[10px] text-white dark:text-black font-black shrink-0">
                  {auth.user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{auth.user?.username}</span>
              </div>
              <button onClick={onLogout || auth.logout} className="p-1.5 text-muted hover:text-red-500 transition-colors" title="退出登录">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className={cn("flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-zinc-900 dark:hover:text-white w-full group mb-2",
                radiusClass
              )}
            >
              <LogIn size={16} />
              <span className="hidden lg:block text-[13px] font-bold">登录/注册</span>
            </button>
          )}

          <button
            onClick={onOpenAppearance}
            className={cn("flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 w-full group",
              radiusClass,
              activeTab ==='appearance'? cn(getButtonClassName(buttonStyle ==='outline'?'solid': buttonStyle,'default'),'dark:bg-zinc-100 dark:text-zinc-900 text-zinc-900')
                :"text-muted hover:text-zinc-900 dark:hover:text-white")}
          >
            <Palette size={16} strokeWidth={activeTab === 'appearance' ? 2.5 : 2} className={cn("transition-transform duration-300", activeTab ==='appearance'&&"scale-110")} />
            <span className={cn("hidden lg:block text-[13px]", activeTab ==='appearance'?"font-bold":"font-semibold")}>外观设置</span>
          </button>

          <button
            onClick={onOpenSettings}
            className={cn("flex items-center lg:justify-start justify-center gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-zinc-900 dark:hover:text-white w-full group",
              radiusClass
            )}
          >
            <Settings size={16} strokeWidth={2} className="group-hover:rotate-45 transition-transform duration-300" />
            <span className="hidden lg:block text-[13px] font-bold">系统设置</span>
          </button>
          <div className="mt-3 px-3 hidden lg:block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile nav rounded pill style */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] h-14 rounded-full border border-zinc-200/80 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md z-50 px-2 flex items-center justify-around shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setActiveTab('home')}
          className={cn("flex items-center justify-center gap-1.5 px-3 py-2 outline-none transition duration-200 active:scale-95",
            radiusClass,
            activeTab ==='home'? cn(getButtonClassName(buttonStyle ==='outline'?'solid': buttonStyle,'default'),'shadow-sm') :"text-muted")}
        >
          <Home size={16} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          {activeTab === 'home' && (
            <span className="text-[11px] font-bold whitespace-nowrap">改枪码</span>
          )}
        </button>

        <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

        <button
          onClick={() => setActiveTab('community')}
          className={cn("flex items-center justify-center px-3 py-2 outline-none transition duration-200 active:scale-95",
            activeTab ==='community'? cn(getButtonClassName(buttonStyle ==='outline'?'solid': buttonStyle,'default'),'shadow-sm') :"text-muted hover:text-zinc-900 dark:hover:text-white",
            radiusClass
          )}
        >
          <Users size={16} strokeWidth={activeTab === 'community' ? 2.5 : 2} />
          {activeTab === 'community' && (
            <span className="text-[11px] font-bold whitespace-nowrap">社区</span>
          )}
        </button>

        <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

        <button
          onClick={auth.isAuthenticated ? (onLogout || auth.logout) : onOpenAuth}
          className={cn("flex items-center justify-center px-3 py-2 outline-none transition duration-200 active:scale-95 text-muted hover:text-zinc-900 dark:hover:text-white",
            radiusClass
          )}
        >
          {auth.isAuthenticated ? <LogOut size={16} /> : <LogIn size={16} />}
        </button>
      </nav>
    </>
  );
}