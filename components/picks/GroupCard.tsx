'use client';

import { useState, useEffect } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Group, TEAM_FLAGS } from '@/lib/worldcup-data';

export interface GroupPicks {
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
}

interface GroupCardProps {
  group: Group;
  picks: GroupPicks | null;
  onChange: (picks: GroupPicks) => void;
  locked: boolean;
}

interface SortableTeamRowProps {
  id: string;
  rank: number;
  team: string;
  locked: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SortableTeamRow({
  id,
  rank,
  team,
  locked,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableTeamRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isQualified = rank <= 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
        isDragging ? 'bg-gray-100 shadow-md' : 'hover:bg-gray-50'
      }`}
    >
      {!locked && (
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
      )}

      <span className="w-5 text-xs text-gray-400 font-mono text-center select-none">
        {rank}
      </span>

      {isQualified ? (
        <span className="text-xs font-bold bg-wc-blue-500/10 text-wc-blue-600 px-1.5 py-0.5 rounded select-none">
          Q
        </span>
      ) : (
        <span className="w-7 select-none" />
      )}

      <span className="flex-1 flex items-center gap-1.5 min-w-0">
        <span className="text-base leading-none select-none">
          {TEAM_FLAGS[team] ?? '🏳'}
        </span>
        <span className="text-sm text-gray-900 truncate">{team}</span>
      </span>

      {!locked && (
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-5 h-4 flex items-center justify-center text-gray-300 hover:text-wc-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs leading-none"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="w-5 h-4 flex items-center justify-center text-gray-300 hover:text-wc-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs leading-none"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}

export default function GroupCard({ group, picks, onChange, locked }: GroupCardProps) {
  const defaultOrder = group.teams;

  const [order, setOrder] = useState<string[]>(() => {
    if (picks) {
      return [picks.rank1, picks.rank2, picks.rank3, picks.rank4];
    }
    return [...defaultOrder];
  });

  useEffect(() => {
    if (picks) {
      setOrder([picks.rank1, picks.rank2, picks.rank3, picks.rank4]);
    }
  }, [picks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function notifyChange(newOrder: string[]) {
    onChange({
      rank1: newOrder[0],
      rank2: newOrder[1],
      rank3: newOrder[2],
      rank4: newOrder[3],
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      const newOrder = arrayMove(order, oldIndex, newIndex);
      setOrder(newOrder);
      notifyChange(newOrder);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
    notifyChange(newOrder);
  }

  function moveDown(index: number) {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
    notifyChange(newOrder);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <h3 className="text-gray-700 font-bold text-sm tracking-wide">
          {group.name}
        </h3>
      </div>
      <div className="p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {order.map((team, index) => (
              <SortableTeamRow
                key={team}
                id={team}
                rank={index + 1}
                team={team}
                locked={locked}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
                isFirst={index === 0}
                isLast={index === order.length - 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
