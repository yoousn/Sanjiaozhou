import React, { useState } from 'react';
import { Search, Edit3, Plus, X, Save, ArrowUpDown, Radio, Moon, Sun } from 'lucide-react';
import { cn, inputClasses } from '../utils';

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
  searchSuggestions
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
  searchSuggestions: string[]
}) {
  const [isFocused, setIsFocused] = useState(false);

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
          className="w-full pl-11 pr-12 py-3 rounded-2xl bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-300 dark:focus:border-zinc-600 transition duration-200 text-sm font-bold"
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
          className="p-2 md:p-2.5 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10 active:scale-95"
          title={isDarkMode ? "切换为日间模式" : "切换为暗黑模式"}
        >
          {isDarkMode ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />}
        </button>

        {!isEditing && (
          <>
            <button
              onClick={onOpenCollect}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-[12px] bg-emerald-500 border border-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:bg-emerald-600 transition duration-200 outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-95"
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
                className={cn(inputClasses, "pl-8 pr-6 py-2 rounded-full font-bold text-[13px] bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-700 cursor-pointer appearance-none hover:border-zinc-300 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10")}
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
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-[12px] bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10 active:scale-95"
          >
            <Edit3 size={14} strokeWidth={2.5}/>
            <span>编辑模式</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onAddNew}
              className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full font-bold text-[11px] bg-emerald-500 border border-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:bg-emerald-600 transition duration-200 outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-95 shadow-[inset_0_1px_rgba(255,255,255,0.3)]"
            >
              <Plus size={12} strokeWidth={2.5}/>
              <span className="hidden sm:inline">新增条目</span>
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full font-bold text-[11px] bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/10 active:scale-95"
            >
              <X size={12} strokeWidth={2.5}/>
              <span className="hidden sm:inline">取消</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full font-bold text-[11px] bg-zinc-900 text-white border border-zinc-950 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-zinc-800 transition duration-200 outline-none focus:ring-4 focus:ring-zinc-900/20 active:scale-95 shadow-[inset_0_1px_rgba(255,255,255,0.2)]"
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
