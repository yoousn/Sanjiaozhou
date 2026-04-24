import React, { useState } from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { cn, inputClasses } from '../utils';
import { GunGroup, GunVariant } from '../types';
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
  handleCopy: (code: string, id: string) => void
}> = ({
  variant,
  isEditing,
  onUpdateVariant,
  onDeleteVariant,
  copiedId,
  handleCopy
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
  cardDragHandleProps
}: {
  group: GunGroup,
  isEditing: boolean,
  onUpdateGroup: (groupId: string, field: keyof GunGroup, value: string) => void,
  onDeleteGroup: (groupId: string) => void,
  onUpdateVariant: (groupId: string, variantId: string, field: keyof GunVariant, val: string | boolean) => void,
  onDeleteVariant: (groupId: string, variantId: string) => void,
  onAddVariant: (groupId: string) => void,
  onReorderVariants?: (groupId: string, activeId: string, overId: string) => void,
  cardDragHandleProps?: any
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const pageSize = 3;
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

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => { setCopiedId(null); }, 2000);
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
        "group/card relative flex flex-col p-4 md:p-5 rounded-2xl transition duration-200 h-full",
        "bg-white border hover:-translate-y-0.5",
        isEditing
          ? "border-emerald-500/40 ring-4 ring-emerald-500/10 shadow-[0_8px_30px_rgb(16,185,129,0.06)] bg-white/80"
          : "border-zinc-200/80"
      )}
    >
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/50" />

      <div className="mb-3 pb-3 border-b border-zinc-100 relative z-10">
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
                className={cn(inputClasses, "text-[15px] py-1.5 font-black text-zinc-900 w-full bg-white border border-zinc-200 shadow-sm")}
                defaultValue={group.name}
                onBlur={e => { if(e.target.value !== group.name) onUpdateGroup(group.id, 'name', e.target.value) }}
                placeholder="枪械名称..."
              />
              <button
                type="button"
                onClick={() => onDeleteGroup(group.id)}
                className="shrink-0 p-2 bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 active:scale-90 outline-none"
                title="删除枪系"
              >
                <Trash2 size={16} strokeWidth={2.5}/>
              </button>
            </div>
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
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-4 bg-zinc-900 rounded-full" />
              {group.name}
            </h3>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/60">
               {group.category.toUpperCase()}
            </span>
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
            <div className="flex flex-col gap-2 h-[330px] overflow-y-auto pr-1">
              {displayedVariants.map((v) => (
                <SortableVariant
                  key={v.id}
                  variant={v}
                  isEditing={isEditing}
                  onUpdateVariant={(vid, field, val) => onUpdateVariant(group.id, vid, field, val)}
                  onDeleteVariant={(vid) => onDeleteVariant(group.id, vid)}
                  copiedId={copiedId}
                  handleCopy={handleCopy}
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
