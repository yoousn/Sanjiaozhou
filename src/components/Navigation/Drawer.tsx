import React, { useState, useEffect } from 'react';
import { Home, Crosshair, Target, Settings, Users, Menu, X } from 'lucide-react';
import { cn, getButtonClassName, radiusClassMap, sidebarWidthClassMap } from '../../utils';
import type { UiPreferences } from '../../types';

// @ts-ignore
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'v1.0.7';

export const ALL_NAV_ITEMS = [
  { id: 'home', icon: Home, label: '全部体系' },
  { id: 'ar', icon: Crosshair, label: '突击步枪' },
  { id: 'br', icon: Crosshair, label: '战斗步枪' },
  { id: 'smg', icon: Target, label: '冲锋枪' },
  { id: 'lmg', icon: Target, label: '轻机枪' },
  { id: 'dmr', icon: Crosshair, label: '精准射手步枪' },
  { id: 'sr', icon: Target, label: '狙击步枪' },
  { id: 'pistol', icon: Target, label: '手枪' },
  { id: 'community', icon: Users, label: '社区' }
];

export function Drawer({
  activeTab,
  setActiveTab,
  onOpenSettings,
  uiPreferences,
  isEditing,
  updateUiPreference,
}: {
  activeTab: string,
  setActiveTab: (tab: string) => void,
  onOpenSettings: () => void,
  uiPreferences: UiPreferences,
  isEditing: boolean,
  updateUiPreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void,
}) {
  const [isOpen, setIsOpen] = useState(uiPreferences.drawerOpenPc);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsOpen(uiPreferences.drawerOpenPc);
    }
  }, [uiPreferences.drawerOpenPc]);

  const isPcLeft = uiPreferences.drawerPositionPc === 'left';
  const isMobileBottom = uiPreferences.drawerPositionMobile === 'bottom';

  const visibleNavItems = uiPreferences.navItemsOrder
    .filter(id => !uiPreferences.hiddenNavItems.includes(id))
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id)!)
    .filter(Boolean);

  const standardItems = visibleNavItems.filter(i => i.id !== 'community' && i.id !== 'settings');
  const hasCommunity = visibleNavItems.some(i => i.id === 'community');

  const radiusClass = radiusClassMap[uiPreferences.controlRadius];
  const sidebarWidthClasses = sidebarWidthClassMap[uiPreferences.sidebarWidth];

  const handleNavClick = (id: string) => {
    if (id === 'settings') onOpenSettings();
    else setActiveTab(id);
    if (window.innerWidth < 768) {
      setIsOpen(false);
      setIsMobileOpen(false);
    }
  };

  const handleClose = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    } else {
      setIsOpen(false);
      if (isEditing) updateUiPreference('drawerOpenPc', false);
    }
  };

  const handleOpen = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(true);
    } else {
      setIsOpen(true);
      if (isEditing) updateUiPreference('drawerOpenPc', true);
    }
  };

  const currentIsOpen = window.innerWidth < 768 ? isMobileOpen : isOpen;

  return (
    <>
      {currentIsOpen && (
        <div 
          className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md z-40 transition-all duration-300"
          onClick={handleClose}
        />
      )}

      <div 
        className={cn(
          "fixed z-50 bg-[#F8F9FA] dark:bg-[#0b0b0c] border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 flex flex-col p-4",
          "md:h-screen md:max-w-sm w-full",
          sidebarWidthClasses.nav,
          !currentIsOpen && "opacity-0 pointer-events-none",
          
          currentIsOpen ? "translate-x-0 translate-y-0" : (
            "max-md:" + (isMobileBottom ? "translate-y-full" : "-translate-x-full") +
            " md:" + (isPcLeft ? "-translate-x-full" : "translate-x-full")
          ),
          
          "max-md:fixed",
          isMobileBottom 
            ? "max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:rounded-t-[2rem] max-md:max-h-[85vh] max-md:h-auto max-md:border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)]" 
            : "max-md:top-0 max-md:h-screen max-md:w-64 max-md:border-r max-md:left-0",
          "md:top-0 md:h-screen md:border-x",
          isPcLeft ? "md:left-0 md:border-r" : "md:right-0 md:border-l"
        )}
        style={{
          paddingBottom: isMobileBottom ? 'calc(1rem + env(safe-area-inset-bottom))' : '1rem'
        }}
      >
        <div className="flex items-center justify-between gap-3 px-2 mb-8 w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-900 to-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
              <span className="font-extrabold text-sm tracking-tighter">🐴</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[14px] tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">Arsenal</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base</span>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1 md:hidden bg-black/5 dark:bg-white/5 rounded-full">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="flex flex-col gap-1 w-full overflow-y-auto flex-1 pb-4">
          <div className="px-3 mb-2">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Categories</span>
          </div>
          {standardItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex items-center justify-start gap-3 px-3 py-2.5 transition duration-200 outline-none focus:ring-2 focus:ring-zinc-900/10 active:scale-95 group w-full",
                  radiusClass,
                  isActive
                    ? cn(getButtonClassName(uiPreferences.buttonStyle === 'outline' ? 'solid' : uiPreferences.buttonStyle, 'default'), 'dark:bg-zinc-100 dark:text-zinc-900')
                    : "text-zinc-500 font-semibold hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Icon size={16} className={cn("transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("whitespace-nowrap text-[13px]", isActive ? "font-bold" : "font-semibold")}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto pt-4 w-full px-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
          {hasCommunity && (
            <button
              onClick={() => handleNavClick('community')}
              className={cn(
                "flex items-center justify-start gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 w-full group mb-1",
                activeTab === 'community'
                  ? cn(getButtonClassName(uiPreferences.buttonStyle === 'outline' ? 'solid' : uiPreferences.buttonStyle, 'default'), 'dark:bg-zinc-100 dark:text-zinc-900 text-zinc-900')
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
                radiusClass
              )}
            >
              <Users size={16} strokeWidth={activeTab === 'community' ? 2.5 : 2} className={cn("transition-transform duration-300", activeTab === 'community' && "scale-110")} />
              <span className={cn("text-[13px]", activeTab === 'community' ? "font-bold" : "font-semibold")}>社区</span>
            </button>
          )}
          <button
            onClick={() => handleNavClick('settings')}
            className={cn(
              "flex items-center justify-start gap-3 px-3 py-2.5 transition duration-200 outline-none hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white w-full group",
              radiusClass
            )}
          >
            <Settings size={16} strokeWidth={2} className="group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-[13px] font-bold">系统设置</span>
          </button>
          <div className="mt-3 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </div>

      {!currentIsOpen && (
        <button
          onClick={handleOpen}
          className={cn(
            "fixed z-40 flex items-center justify-center p-3 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-xl transition-all active:scale-95 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white",
            "max-md:bottom-8 max-md:left-1/2 max-md:-translate-x-1/2 max-md:px-6 max-md:gap-2 max-md:h-12",
            "md:top-6 md:h-12 md:w-12", isPcLeft ? "md:left-6" : "md:right-6"
          )}
        >
          <Menu size={20} strokeWidth={2.5} />
          <span className="md:hidden text-[13px] font-bold tracking-widest uppercase">MENU</span>
        </button>
      )}
    </>
  );
}
