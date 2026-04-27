import React, { useState } from 'react';
import { Search, Edit3, Plus, X, Save, ArrowUpDown, Radio, Moon, Sun } from 'lucide-react';
import { cn, getButtonClassName, inputClasses, radiusClassMap } from '../utils';
import type { UiButtonStyle, UiRadius } from '../types';

export function Header({
  isEditing,
  onEditStart,
  onSave,
  onCancel,
  onAddNew,
  onOpenCollect,
  sortBy,
  onSortChange,
  isDarkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  controlRadius,
  buttonStyle,
}: {
  isEditing: boolean,
  onEditStart: () => void,
  onSave: () => void,
  onCancel: () => void,
  onAddNew: () => void,
  onOpenCollect: () => void,
  sortBy: string,
  onSortChange: (sort: string) => void,
  isDarkMode: boolean,
  onToggleDarkMode: () => void,
  searchQuery: string,
  onSearchChange: (q: string) => void,
  searchSuggestions: string[],
  controlRadius: UiRadius,
  buttonStyle: UiButtonStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const radiusClass = radiusClassMap[controlRadius];
  const iconButtonClass = cn(
    'p-2 md:p-2.5 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10 active:scale-95',
    radiusClass,
    getButtonClassName(buttonStyle, 'default'),
    'dark:bg-[#121214] dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white'
  );
  const primaryButtonClass = cn(
    'flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 font-bold text-[12px] transition duration-200 outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-95',
    radiusClass,
    getButtonClassName(buttonStyle, 'primary')
  );
  const defaultButtonClass = cn(
    'flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 font-bold text-[12px] transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10 active:scale-95',
    radiusClass,
    getButtonClassName(buttonStyle, 'default')
  );
  const compactButtonClass = cn(
    'flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 font-bold text-[11px] transition duration-200 outline-none active:scale-95',
    radiusClass
  );

  const filteredSuggestions = searchSuggestions
    .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()) && s.toLowerCase() !== searchQuery.toLowerCase())
    .slice(0, 6);

  return (
    <header className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-30">
      <div className="relative w-full max-w-sm group" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
          <Search size={18} strokeWidth={2.5}/>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="搜索枪械配置..."
          className={cn(
            "w-full pl-11 pr-12 py-3 bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-300 dark:focus:border-zinc-600 transition duration-200 text-sm font-bold",
            radiusClass
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 outline-none"
            title="清除搜索"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}

        {isFocused && searchQuery && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 py-2 bg-white dark:bg-[#1c1c1f] border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                onClick={() => onSearchChange(s)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-white/5 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors outline-none"
              >
                <Search size={14} className="text-zinc-400 shrink-0" strokeWidth={3} />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
        <button
          onClick={onToggleDarkMode}
          className={iconButtonClass}
          title={isDarkMode ? "切换为日间模式" : "切换为暗黑模式"}
        >
          {isDarkMode ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />}
        </button>

        {!isEditing && (
          <>
            <button
              onClick={onOpenCollect}
              className={primaryButtonClass}
            >
              <Radio size={14} strokeWidth={2.5}/>
              <span>采集</span>
            </button>

            <div className="relative flex items-center">
              <div className="absolute left-2.5 text-zinc-400 pointer-events-none">
                <ArrowUpDown size={14} strokeWidth={2.5} />
              </div>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className={cn(
                  inputClasses,
                  "pl-8 pr-6 py-2 font-bold text-[13px] bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-700 cursor-pointer appearance-none hover:border-zinc-300 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10",
                  radiusClass
                )}
              >
                <option value="default">默认排序</option>
                <option value="name">按名称</option>
                <option value="date">按创建日期</option>
                <option value="price">按价格</option>
              </select>
              <div className="absolute right-3 pointer-events-none text-zinc-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </>
        )}

        {!isEditing ? (
          <button
            onClick={onEditStart}
            className={defaultButtonClass}
          >
            <Edit3 size={14} strokeWidth={2.5}/>
            <span>编辑模式</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onAddNew}
              className={cn(compactButtonClass, getButtonClassName(buttonStyle, 'primary'))}
            >
              <Plus size={12} strokeWidth={2.5}/>
              <span className="hidden sm:inline">新增条目</span>
            </button>
            <button
              onClick={onCancel}
              className={cn(compactButtonClass, getButtonClassName(buttonStyle, 'default'))}
            >
              <X size={12} strokeWidth={2.5}/>
              <span className="hidden sm:inline">取消</span>
            </button>
            <button
              onClick={onSave}
              className={cn(compactButtonClass, getButtonClassName(buttonStyle === 'soft' ? 'solid' : buttonStyle, 'default'))}
            >
              <Save size={12} strokeWidth={2.5}/>
              <span className="hidden sm:inline">保存</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
