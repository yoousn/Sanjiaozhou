import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GunCard } from './GunCard';

type SortableGunCardProps = React.ComponentProps<typeof GunCard> & {
  idx: number;
  activeTab: string;
};

export const SortableGunCard = React.memo(function SortableGunCard({ group, idx, isEditing, activeTab, ...props }: SortableGunCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
    position: 'relative' as const,
  };

  if (!isEditing) {
    return (
      <div
        className="self-start animate-fade-in w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl"
        style={{ animationDelay: `${idx * 0.04}s` }}
      >
        <GunCard group={group} isEditing={false} {...props} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="self-start w-full shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <GunCard
        group={group}
        isEditing={true}
        cardDragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
});
