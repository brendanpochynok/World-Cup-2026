'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Group, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import { GroupPicks } from './GroupCard';

interface GroupDetailModalProps {
  group: Group;
  picks: GroupPicks | null;
  onSave: (picks: GroupPicks) => void;
  onClose: () => void;
}

// Shorten team names for tabs (max ~10 chars)
function shortenTab(name: string): string {
  const overrides: Record<string, string> = {
    'Bosnia and Herzegovina': 'Bosnia',
    'United States': 'USA',
    "Cote d'Ivoire": 'Côte d\'Iv.',
    'Saudi Arabia': 'S. Arabia',
    'South Africa': 'S. Africa',
    'South Korea': 'S. Korea',
    'New Zealand': 'N. Zealand',
    'DR Congo': 'DR Congo',
    'Cabo Verde': 'Cabo Verde',
  };
  if (overrides[name]) return overrides[name];
  if (name.length <= 10) return name;
  return name.slice(0, 9) + '…';
}

// ─── Sortable row inside the modal ─────────────────────────────────────────

interface SortableModalRowProps {
  id: string;
  rank: number;
  team: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SortableModalRow({
  id,
  rank,
  team,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableModalRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const meta = getTeamMeta(team);
  const isQualified = rank <= 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing select-none transition-colors ${
        isDragging
          ? 'bg-green-700 shadow-xl z-10 relative'
          : isQualified
          ? 'bg-green-900 border border-green-500/50'
          : 'bg-green-900 border border-green-800/50'
      }`}
    >
      {/* Drag handle + rank */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 touch-none"
      >
        <span className="text-green-600 text-sm font-mono leading-none">⠿</span>
        <span
          className={`w-5 text-sm font-bold text-center flex-shrink-0 ${
            isQualified ? 'text-green-400' : 'text-green-600'
          }`}
        >
          {rank}
        </span>
      </div>

      {/* Q badge */}
      {isQualified ? (
        <span className="text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded flex-shrink-0">
          Q
        </span>
      ) : (
        <span className="w-6 flex-shrink-0" />
      )}

      {/* Flag */}
      <img
        src={getFlagUrl(meta.flag)}
        alt={team}
        className="w-7 h-5 object-cover rounded-sm flex-shrink-0"
        loading="lazy"
      />

      {/* Team name + FIFA rank */}
      <span className="flex-1 min-w-0">
        <span className="text-white font-medium text-sm leading-tight block truncate">
          {team}
        </span>
        <span className="text-green-500 text-xs">#{meta.fifaRank}</span>
      </span>

      {/* Arrow buttons */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-6 h-5 flex items-center justify-center text-green-400 hover:text-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
          aria-label={`Move ${team} up`}
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="w-6 h-5 flex items-center justify-center text-green-400 hover:text-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
          aria-label={`Move ${team} down`}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ─── Team info panel ────────────────────────────────────────────────────────

interface TeamInfoPanelProps {
  teams: string[];
}

function TeamInfoPanel({ teams }: TeamInfoPanelProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTeam = teams[activeIdx];
  const meta = getTeamMeta(activeTeam);

  const positionColors: Record<string, string> = {
    FW: 'text-red-400',
    MF: 'text-yellow-400',
    DF: 'text-blue-400',
    GK: 'text-purple-400',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {teams.map((team, idx) => {
          const m = getTeamMeta(team);
          return (
            <button
              key={team}
              onClick={() => setActiveIdx(idx)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeIdx === idx
                  ? 'bg-green-700 text-white border border-green-500'
                  : 'bg-green-900 text-green-400 border border-green-800 hover:border-green-600 hover:text-white'
              }`}
            >
              <img
                src={getFlagUrl(m.flag)}
                alt={team}
                className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                loading="lazy"
              />
              <span className="truncate max-w-[80px]">{shortenTab(team)}</span>
            </button>
          );
        })}
      </div>

      {/* Active team info */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Team header */}
        <div className="flex items-center gap-3">
          <img
            src={getFlagUrl(meta.flag)}
            alt={activeTeam}
            className="w-12 h-8 object-cover rounded shadow-md flex-shrink-0"
            loading="lazy"
          />
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{activeTeam}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-green-400 text-xs font-mono">
                FIFA #{meta.fifaRank}
              </span>
              <span className="text-green-700 text-xs">·</span>
              <span className="text-yellow-400 text-xs font-mono">
                {meta.odds}
              </span>
            </div>
          </div>
        </div>

        {/* Key players */}
        {meta.players.length > 0 && (
          <div>
            <p className="text-green-500 text-xs uppercase tracking-wider font-semibold mb-2">
              Key Players
            </p>
            <div className="space-y-1.5">
              {meta.players.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold w-6 text-center flex-shrink-0 ${
                      positionColors[p.position] ?? 'text-green-400'
                    }`}
                  >
                    {p.position}
                  </span>
                  <span className="text-white text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Format note */}
        <div className="bg-green-900/60 border border-green-800 rounded-lg p-3 mt-2">
          <p className="text-green-400 text-[10px] uppercase tracking-wider font-semibold mb-1">
            Format Note
          </p>
          <p className="text-green-300 text-xs leading-relaxed">
            Top 2 from each group + 8 best 3rd-place teams advance to the Round of 32.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────

export default function GroupDetailModal({
  group,
  picks,
  onSave,
  onClose,
}: GroupDetailModalProps) {
  const [order, setOrder] = useState<string[]>(() => {
    if (picks) {
      return [picks.rank1, picks.rank2, picks.rank3, picks.rank4];
    }
    return [...group.teams];
  });

  // Sync order if picks change (e.g. from parent re-render)
  useEffect(() => {
    if (picks) {
      setOrder([picks.rank1, picks.rank2, picks.rank3, picks.rank4]);
    } else {
      setOrder([...group.teams]);
    }
  }, [picks, group]);

  // Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus trap: ref to panel
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      setOrder(arrayMove(order, oldIndex, newIndex));
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
  }

  function moveDown(index: number) {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
  }

  function handleSave() {
    onSave({
      rank1: order[0],
      rank2: order[1],
      rank3: order[2],
      rank4: order[3],
    });
    onClose();
  }

  // Active view for mobile (rankings | info)
  const [mobileView, setMobileView] = useState<'rankings' | 'info'>('rankings');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${group.name} picks`}
        tabIndex={-1}
        className="fixed inset-4 md:inset-10 lg:inset-16 bg-green-950 rounded-2xl z-50 overflow-hidden flex flex-col shadow-2xl outline-none"
        style={{
          animation: 'modalIn 0.25s ease-out',
        }}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-lg tracking-wide">
              {group.name}
            </span>
            <span className="text-green-600 text-sm hidden sm:inline">
              — Rank teams 1st to 4th
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-green-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-green-800 text-xl leading-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ---- Mobile view toggle ---- */}
        <div className="flex md:hidden border-b border-green-800 flex-shrink-0">
          <button
            onClick={() => setMobileView('rankings')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mobileView === 'rankings'
                ? 'text-yellow-400 border-b-2 border-yellow-500'
                : 'text-green-500 hover:text-green-300'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setMobileView('info')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mobileView === 'info'
                ? 'text-yellow-400 border-b-2 border-yellow-500'
                : 'text-green-500 hover:text-green-300'
            }`}
          >
            Team Info
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* ---- Left: Ranking interface ---- */}
          <div
            className={`md:flex-1 md:border-r border-green-800 flex flex-col overflow-hidden ${
              mobileView === 'info' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-green-500 text-xs mb-3">
                Drag rows or use ▲▼ to set your predicted standings.
                <span className="text-green-400 font-medium"> Top 2 qualify (Q).</span>
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                  {order.map((team, index) => (
                    <SortableModalRow
                      key={team}
                      id={team}
                      rank={index + 1}
                      team={team}
                      onMoveUp={() => moveUp(index)}
                      onMoveDown={() => moveDown(index)}
                      isFirst={index === 0}
                      isLast={index === order.length - 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Save button */}
            <div className="p-4 border-t border-green-800 flex-shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>&#10003;</span>
                Save &amp; Close
              </button>
            </div>
          </div>

          {/* ---- Right: Team info ---- */}
          <div
            className={`md:w-80 lg:w-96 overflow-hidden flex flex-col ${
              mobileView === 'rankings' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="flex-1 overflow-y-auto p-4">
              <TeamInfoPanel teams={group.teams} />
            </div>
          </div>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
