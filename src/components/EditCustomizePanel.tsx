import React from 'react';
import { cn } from '../utils';
import {
  UiPreferences,
  UiCardSize,
  UiRadius,
  UiButtonStyle,
  UiSidebarWidth,
  DrawerPositionPc,
  DrawerPositionMobile,
} from '../types';
import {
  getOptionIndex,
  CARD_SIZE_OPTIONS,
  CARD_MIN_HEIGHT_OPTIONS,
  VARIANTS_PER_PAGE_OPTIONS,
  GRID_COLUMNS_OPTIONS,
  GRID_GAP_OPTIONS,
  SIDEBAR_WIDTH_OPTIONS,
  RADIUS_OPTIONS,
  BUTTON_STYLE_OPTIONS,
} from '../constants';
import { ALL_NAV_ITEMS } from './Navigation/Drawer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

type SliderFieldProps = {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  value: number;
  onChange: (nextIndex: number) => void;
};

function SliderField({ label, valueLabel, min, max, value, onChange }: SliderFieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{label}</label>
        <span className="text-[12px] font-black text-zinc-900 dark:text-white">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-zinc-900 dark:accent-white"
      />
    </div>
  );
}

function SortableNavItem({ id, label, isHidden, onToggleHide }: { id: string, label: string, isHidden: boolean, onToggleHide: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 mb-1 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-200 dark:border-zinc-700/50">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <GripVertical size={16} />
        </button>
        <span className={cn("text-[13px] font-bold", isHidden ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-200")}>{label}</span>
      </div>
      <button onClick={() => onToggleHide(id)} className={cn("p-1.5 rounded transition", isHidden ? "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10")}>
        {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export type EditCustomizePanelProps = {
  uiPreferences: UiPreferences;
  updateUiPreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  resetUiPreferences: () => void;
};

export function EditCustomizePanel({
  uiPreferences,
  updateUiPreference,
  resetUiPreferences,
}: EditCustomizePanelProps) {
  const settingsPanelClass = cn(
    'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm mb-6 flex flex-col xl:flex-row gap-8',
    uiPreferences.controlRadius === 'full' ? 'rounded-[2rem]' : 'rounded-3xl'
  );
  const settingsSelectClass = cn(
    'w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] py-2.5 px-3 text-[13px] font-bold shadow-sm outline-none focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10',
    uiPreferences.controlRadius === 'full' ? 'rounded-full' : uiPreferences.controlRadius === 'xl' ? 'rounded-xl' : 'rounded-lg'
  );

  const cardSizeIndex = getOptionIndex(CARD_SIZE_OPTIONS.map((o) => o.value), uiPreferences.cardSize);
  const cardMinHeightIndex = getOptionIndex(CARD_MIN_HEIGHT_OPTIONS, uiPreferences.cardMinHeight);
  const gridGapIndex = getOptionIndex(GRID_GAP_OPTIONS, uiPreferences.gridGap);
  const radiusIndex = getOptionIndex(RADIUS_OPTIONS.map((o) => o.value), uiPreferences.controlRadius);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = uiPreferences.navItemsOrder.indexOf(active.id as string);
      const newIndex = uiPreferences.navItemsOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextOrder = [...uiPreferences.navItemsOrder];
        const [moved] = nextOrder.splice(oldIndex, 1);
        nextOrder.splice(newIndex, 0, moved);
        updateUiPreference('navItemsOrder', nextOrder);
      }
    }
  };

  const handleToggleHide = (id: string) => {
    if (id === 'home' || id === 'settings') return; // Cannot hide home/settings
    const nextHidden = uiPreferences.hiddenNavItems.includes(id)
      ? uiPreferences.hiddenNavItems.filter(i => i !== id)
      : [...uiPreferences.hiddenNavItems, id];
    updateUiPreference('hiddenNavItems', nextHidden);
  };

  return (
    <div className={settingsPanelClass}>
      <div className="flex-1">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-[15px] font-black text-zinc-900 dark:text-white">界面自定义</h3>
            <p className="text-[13px] text-zinc-500">编辑模式下直接调整卡片和抽屉配置，刷新后会自动保留。</p>
          </div>
          <button onClick={resetUiPreferences} className="text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">恢复默认 UI 设置</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SliderField
            label="卡片尺寸"
            valueLabel={CARD_SIZE_OPTIONS[cardSizeIndex].label}
            min={0}
            max={CARD_SIZE_OPTIONS.length - 1}
            value={cardSizeIndex}
            onChange={(nextIndex) => updateUiPreference('cardSize', CARD_SIZE_OPTIONS[nextIndex].value as UiCardSize)}
          />
          <SliderField
            label="卡片最小高度"
            valueLabel={`${CARD_MIN_HEIGHT_OPTIONS[cardMinHeightIndex]} px`}
            min={0}
            max={CARD_MIN_HEIGHT_OPTIONS.length - 1}
            value={cardMinHeightIndex}
            onChange={(nextIndex) => updateUiPreference('cardMinHeight', CARD_MIN_HEIGHT_OPTIONS[nextIndex])}
          />
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">每张卡片显示配置数</label>
            <select value={uiPreferences.variantsPerPage} onChange={(e) => updateUiPreference('variantsPerPage', Number(e.target.value) as 2 | 3 | 4)} className={settingsSelectClass}>
              {VARIANTS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">桌面列数</label>
            <select value={uiPreferences.gridColumns} onChange={(e) => updateUiPreference('gridColumns', Number(e.target.value) as 3 | 4)} className={settingsSelectClass}>
              {GRID_COLUMNS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} 列</option>
              ))}
            </select>
          </div>
          <SliderField
            label="卡片间距"
            valueLabel={`${GRID_GAP_OPTIONS[gridGapIndex]} px`}
            min={0}
            max={GRID_GAP_OPTIONS.length - 1}
            value={gridGapIndex}
            onChange={(nextIndex) => updateUiPreference('gridGap', GRID_GAP_OPTIONS[nextIndex])}
          />
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">侧栏宽度</label>
            <select value={uiPreferences.sidebarWidth} onChange={(e) => updateUiPreference('sidebarWidth', e.target.value as UiSidebarWidth)} className={settingsSelectClass}>
              {SIDEBAR_WIDTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <SliderField
            label="控件圆角"
            valueLabel={RADIUS_OPTIONS[radiusIndex].label}
            min={0}
            max={RADIUS_OPTIONS.length - 1}
            value={radiusIndex}
            onChange={(nextIndex) => updateUiPreference('controlRadius', RADIUS_OPTIONS[nextIndex].value as UiRadius)}
          />
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">按钮样式</label>
            <select value={uiPreferences.buttonStyle} onChange={(e) => updateUiPreference('buttonStyle', e.target.value as UiButtonStyle)} className={settingsSelectClass}>
              {BUTTON_STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">桌面端抽屉位置</label>
            <select value={uiPreferences.drawerPositionPc} onChange={(e) => updateUiPreference('drawerPositionPc', e.target.value as DrawerPositionPc)} className={settingsSelectClass}>
              <option value="left">左侧</option>
              <option value="right">右侧</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">移动端抽屉位置</label>
            <select value={uiPreferences.drawerPositionMobile} onChange={(e) => updateUiPreference('drawerPositionMobile', e.target.value as DrawerPositionMobile)} className={settingsSelectClass}>
              <option value="bottom">底部</option>
              <option value="side">侧边</option>
            </select>
          </div>
        </div>
      </div>

      <div className="w-full xl:w-72 flex flex-col gap-3 shrink-0">
        <div>
          <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">导航排序与显隐</label>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-3">拖拽调整顺序，点击眼睛隐藏。部分基础分类不可隐藏。</p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={uiPreferences.navItemsOrder} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col max-h-80 overflow-y-auto pr-1">
              {uiPreferences.navItemsOrder.map(id => {
                const item = ALL_NAV_ITEMS.find(i => i.id === id);
                if (!item) return null;
                return (
                  <SortableNavItem
                    key={id}
                    id={id}
                    label={item.label}
                    isHidden={uiPreferences.hiddenNavItems.includes(id)}
                    onToggleHide={handleToggleHide}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
