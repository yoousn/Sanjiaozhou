import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Home, Crosshair, Target, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../utils';

type SortableCategoryWidgetProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isEditing: boolean;
  size: 'compact' | 'full';
  onToggleSize: () => void;
};

export function SortableCategoryWidget({
  activeTab,
  setActiveTab,
  isEditing,
  size,
  onToggleSize
}: SortableCategoryWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: 'category-widget',
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const categories = [
    { id: 'home', icon: Home, label: '全部' },
    { id: 'ar', icon: Crosshair, label: '突击步枪' },
    { id: 'br', icon: Crosshair, label: '战斗步枪' },
    { id: 'smg', icon: Target, label: '冲锋枪' },
    { id: 'lmg', icon: Target, label: '轻机枪' },
    { id: 'dmr', icon: Crosshair, label: '精准射手步枪' },
    { id: 'sr', icon: Target, label: '狙击步枪' },
    { id: 'pistol', icon: Target, label: '手枪' }
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative bg-white/50 dark:bg-[#18181b]/50 backdrop-blur-md rounded-2xl border shadow-sm transition-all duration-200",
        isDragging ?"border-zinc-900 dark:border-white shadow-xl scale-105":"border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md",
        isEditing ?"p-3 pt-8 pb-4":"p-1.5",
        size ==='full'?"col-span-full w-full":"col-span-1")}
    >
      {isEditing && (
        <div className="absolute top-0 left-0 w-full h-8 flex items-center justify-between px-3 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-t-2xl border-b border-zinc-200/50 dark:border-zinc-700/50">
          <div {...attributes} {...listeners} className="flex items-center gap-1.5 text-muted hover:text-zinc-900 dark:hover:text-zinc-100 cursor-grab active:cursor-grabbing px-2 py-1 -ml-2">
            <GripVertical size={14} />
            <span className="text-[11px] font-bold uppercase tracking-widest">拖动模块</span>
          </div>
          <button onClick={onToggleSize} className="text-muted hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-1" title="切换大小">
            {size === 'full' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      )}

      <div className={cn("flex items-center overflow-x-auto no-scrollbar max-w-full pt-12 -mt-10 pb-2 -mb-2",
        size ==='full'?"gap-2 sm:gap-4 justify-start sm:justify-center":"gap-1.5 justify-start")}>
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => !isEditing && setActiveTab(cat.id)}
              className={cn("p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-zinc-900/10 active:scale-95 group relative flex items-center justify-center shrink-0",
                isActive 
                  ?"bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md":"bg-transparent text-muted hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                isEditing &&"pointer-events-none opacity-50")}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-300", isActive &&"scale-110", size ==='full'?"sm:mr-2":"")} />
              {size === 'full' && (
                <span className="hidden sm:block text-[13px] font-bold whitespace-nowrap">{cat.label}</span>
              )}
              
              {size !== 'full' && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[12px] font-bold rounded-lg opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                  {cat.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
}