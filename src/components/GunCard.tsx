import React, { useState } from 'react';
import { Trash2, Plus, GripVertical, Pin } from 'lucide-react';
import { cardSizeClassMap, cn, getButtonClassName, inputClasses, radiusClassMap } from '../utils';
import { GunGroup, GunVariant, UiButtonStyle, UiCardSize, UiRadius } from '../types';
import { VariantItem } from './VariantItem';

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
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableVariant: React.FC<{
  variant: GunVariant,
  isEditing: boolean,
  onUpdateVariant: (vid: string, field: keyof GunVariant, val: string | boolean) => void,
  onDeleteVariant: (vid: string) => void,
  copiedId: string | null,
  handleCopy: (code: string, id: string) => void,
  controlRadius: UiRadius,
  buttonStyle: UiButtonStyle,
}> = ({
  variant,
  isEditing,
  onUpdateVariant,
  onDeleteVariant,
  copiedId,
  handleCopy,
  controlRadius,
  buttonStyle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: variant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
    position: 'relative' as const,
  };

  if (!isEditing) {
    return (
      <VariantItem
        variant={variant}
        isEditing={false}
        onUpdateVariant={onUpdateVariant}
        onDeleteVariant={onDeleteVariant}
        copiedId={copiedId}
        handleCopy={handleCopy}
        controlRadius={controlRadius}
        buttonStyle={buttonStyle}
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center group/sortable">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 text-zinc-300 hover:text-emerald-500 transition-colors touch-none"
        title="拖动排序"
      >
        <GripVertical size={16} />
      </div>
      <div className="flex-1 min-w-0 pointer-events-auto">
        <VariantItem
          variant={variant}
          isEditing={true}
          onUpdateVariant={onUpdateVariant}
          onDeleteVariant={onDeleteVariant}
          copiedId={copiedId}
          handleCopy={handleCopy}
          controlRadius={controlRadius}
          buttonStyle={buttonStyle}
        />
      </div>
    </div>
  );
}

export function GunCard({
  group,
  isEditing,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateVariant,
  onDeleteVariant,
  onAddVariant,
  onReorderVariants,
  onTogglePin,
  cardDragHandleProps,
  cardSize = 'default',
  cardMinHeight = 330,
  variantsPerPage = 3,
  controlRadius = 'xl',
  buttonStyle = 'soft',
}: {
  group: GunGroup,
  isEditing: boolean,
  onUpdateGroup: (groupId: string, field: keyof GunGroup, value: string) => void,
  onDeleteGroup: (groupId: string) => void,
  onUpdateVariant: (groupId: string, variantId: string, field: keyof GunVariant, val: string | boolean) => void,
  onDeleteVariant: (groupId: string, variantId: string) => void,
  onAddVariant: (groupId: string) => void,
  onReorderVariants?: (groupId: string, activeId: string, overId: string) => void,
  onTogglePin?: (groupId: string) => void,
  cardDragHandleProps?: React.HTMLAttributes<HTMLElement>,
  cardSize?: UiCardSize,
  cardMinHeight?: number,
  variantsPerPage?: number,
  controlRadius?: UiRadius,
  buttonStyle?: UiButtonStyle,
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pinMessage, setPinMessage] = useState<{ text: string, type: 'pin' | 'unpin' } | null>(null);
  const pinTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const radiusClass = radiusClassMap[controlRadius];
  const cardPaddingClass = cardSizeClassMap[cardSize];
  const actionButtonClass = cn(
    'transition duration-200 outline-none active:scale-95',
    radiusClass,
    getButtonClassName(buttonStyle === 'outline' ? 'soft' : buttonStyle, 'default')
  );

  React.useEffect(() => {
    return () => {
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
    };
  }, []);

  const pageSize = variantsPerPage;
  const totalPages = Math.ceil(group.variants.length / pageSize);

  React.useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  const displayedVariants = group.variants.slice(page * pageSize, (page + 1) * pageSize);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => { setCopiedId(null); }, 2000);
    } catch {
      // Fallback for non-HTTPS environments
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (succeeded) {
          setCopiedId(id);
          setTimeout(() => { setCopiedId(null); }, 2000);
        }
      } catch {
        // Both clipboard methods failed — silently ignore
      }
    }
  };

  const handlePinClick = () => {
    if (onTogglePin) {
      const isCurrentlyPinned = !!group.pinned;
      onTogglePin(group.id);
      setPinMessage({ text: !isCurrentlyPinned ? '已置顶！' : '取消！', type: !isCurrentlyPinned ? 'pin' : 'unpin' });
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
      pinTimeoutRef.current = setTimeout(() => setPinMessage(null), 1500);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderVariants) {
      onReorderVariants(group.id, active.id as string, over.id as string);
    }
  };

  return (
    <div
      className={cn(
        "group/card relative flex flex-col rounded-2xl transition duration-200 h-full",
        cardPaddingClass,
        "bg-white dark:bg-[#121214] border hover:-translate-y-0.5",
        isEditing
          ? "border-emerald-500/40 ring-4 ring-emerald-500/10 shadow-[0_8px_30px_rgb(16,185,129,0.06)] bg-white/80 dark:bg-[#121214]/80"
          : "border-zinc-200/80 dark:border-zinc-800"
      )}
    >
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/50 dark:border-white/5" />

      <div className="mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 relative z-10">
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full">
             <div className="flex items-center gap-2 w-full">
              {cardDragHandleProps && (
                <div
                  {...cardDragHandleProps}
                  className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-zinc-300 hover:text-emerald-500 transition-colors touch-none"
                  title="拖动卡片"
                >
                  <GripVertical size={18} />
                </div>
              )}
              <input
                className={cn(inputClasses, "text-[15px] py-1.5 font-black w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm")}
                style={{ color: 'var(--user-gun-color, currentColor)' }}
                defaultValue={group.name}
                onBlur={e => { if(e.target.value !== group.name) onUpdateGroup(group.id, 'name', e.target.value) }}
                placeholder="枪械名称..."
              />
              <button
                type="button"
                onClick={() => onDeleteGroup(group.id)}
                className={cn("shrink-0 p-2 transition duration-200 active:scale-90 outline-none", radiusClass, getButtonClassName(buttonStyle === 'outline' ? 'soft' : buttonStyle, 'danger'))}
                title="删除枪系"
              >
                <Trash2 size={16} strokeWidth={2.5}/>
              </button>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                 <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">归属:</span>
                 <select
                    className={cn(inputClasses, "py-0.5 bg-white border border-zinc-200 text-[11px] w-auto shadow-sm cursor-pointer")}
                    defaultValue={group.category}
                    onBlur={e => { if(e.target.value !== group.category) onUpdateGroup(group.id, 'category', e.target.value) }}
                  >
                    <option value="ar">突击步枪 (AR)</option>
                    <option value="br">战斗步枪 (BR)</option>
                    <option value="smg">冲锋枪 (SMG)</option>
                    <option value="lmg">轻机枪 (LMG)</option>
                    <option value="dmr">精准射手步枪 (DMR)</option>
                    <option value="sr">狙击步枪 (SR)</option>
                    <option value="pistol">手枪 (Pistol)</option>
                 </select>
              </div>
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={handlePinClick}
                  className={cn(
                    "p-1 transition-colors outline-none",
                    radiusClass,
                    group.pinned
                      ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                      : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                  )}
                  title={group.pinned ? "取消置顶" : "置顶卡片"}
                >
                  <Pin size={14} className={cn(group.pinned && "fill-yellow-500")} />
                </button>
                {pinMessage && (
                  <div className={cn(
                    "absolute -top-7 -right-3 z-50 px-1.5 py-0.5 rounded shadow-sm text-[11px] font-black text-white italic transform -rotate-12 whitespace-nowrap pointer-events-none animate-fade-in",
                    pinMessage.type === 'pin' ? "bg-emerald-500" : "bg-zinc-400"
                  )}>
                    {pinMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 
              className="text-lg font-black tracking-tight flex items-center gap-2"
              style={{ color: 'var(--user-gun-color, currentColor)' }}
            >
              <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: 'var(--user-gun-color, currentColor)' }} />
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={handlePinClick}
                  className={cn(
                    "p-1 transition-colors outline-none",
                    radiusClass,
                    group.pinned
                      ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                      : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                  )}
                  title={group.pinned ? "取消置顶" : "置顶卡片"}
                >
                  <Pin size={14} className={cn(group.pinned && "fill-yellow-500")} />
                </button>
                {pinMessage && (
                  <div className={cn(
                    "absolute -top-7 -right-3 z-50 px-1.5 py-0.5 rounded shadow-sm text-[11px] font-black text-white italic transform -rotate-12 whitespace-nowrap pointer-events-none animate-fade-in",
                    pinMessage.type === 'pin' ? "bg-emerald-500" : "bg-zinc-400"
                  )}>
                    {pinMessage.text}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/60">
                 {group.category.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 relative z-10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedVariants.map(v => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ minHeight: `${cardMinHeight}px` }}>
              {displayedVariants.map((v) => (
                <SortableVariant
                  key={v.id}
                  variant={v}
                  isEditing={isEditing}
                  onUpdateVariant={(vid, field, val) => onUpdateVariant(group.id, vid, field, val)}
                  onDeleteVariant={(vid) => onDeleteVariant(group.id, vid)}
                  copiedId={copiedId}
                  handleCopy={handleCopy}
                  controlRadius={controlRadius}
                  buttonStyle={buttonStyle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className={cn("flex items-center justify-center gap-3 mt-1 py-1 h-6", totalPages <= 1 && "invisible")}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[12px] font-bold text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            上一页
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors", page === i ? "bg-zinc-800" : "bg-zinc-200")} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-[12px] font-bold text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            下一页
          </button>
        </div>

        {isEditing && group.variants.length < 15 && (
          <button
            onClick={() => onAddVariant(group.id)}
            className="mt-1 w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 border-dashed border-emerald-500/30 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/80 hover:border-emerald-500/60 transition duration-200 active:scale-95 font-bold text-[13px] outline-none focus:ring-4 focus:ring-emerald-500/10"
          >
            <Plus size={14} strokeWidth={2.5}/>
            追加配置 ({group.variants.length}/15)
          </button>
        )}
      </div>
    </div>
  );
}
