'use client';

import { Group, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import { GroupPicks } from './GroupCard';

interface GroupOverviewProps {
  groups: Group[];
  allPicks: Record<string, GroupPicks | null>;
  onSelectGroup: (groupId: string) => void;
}

function shortenName(name: string): string {
  const overrides: Record<string, string> = {
    'Bosnia and Herzegovina': 'Bosnia',
    'United States': 'USA',
    "Cote d'Ivoire": 'Ivory Coast',
    'Saudi Arabia': 'S. Arabia',
    'South Africa': 'S. Africa',
    'South Korea': 'S. Korea',
    'New Zealand': 'N. Zealand',
    'DR Congo': 'DR Congo',
  };
  if (overrides[name]) return overrides[name];
  if (name.length <= 12) return name;
  return name.slice(0, 11) + '…';
}

interface GroupMiniCardProps {
  group: Group;
  picks: GroupPicks | null;
  onClick: () => void;
}

function GroupMiniCard({ group, picks, onClick }: GroupMiniCardProps) {
  const hasPicks = !!picks;

  // Build ordered team list
  const teamOrder: string[] = hasPicks
    ? [picks.rank1, picks.rank2, picks.rank3, picks.rank4]
    : group.teams;

  return (
    <div
      onClick={onClick}
      className="bg-green-950 border border-green-800 rounded-xl p-3 cursor-pointer hover:border-yellow-500 transition-colors group select-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${group.name} — click to ${hasPicks ? 'edit' : 'make'} picks`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-yellow-400 font-bold text-xs tracking-widest uppercase">
          {group.name}
        </span>
        <div className="flex items-center gap-1">
          {hasPicks && (
            <span className="text-green-400 text-xs font-bold">&#10003;</span>
          )}
          <span className="text-green-500 group-hover:text-yellow-400 transition-colors text-xs">
            {hasPicks ? '&#9998;' : ''}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 inline"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              {hasPicks ? (
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-green-800 mb-2" />

      {/* Team rows */}
      <div className="space-y-1">
        {teamOrder.map((team, index) => {
          const meta = getTeamMeta(team);
          const isQualified = hasPicks && index < 2;

          return (
            <div key={team} className="flex items-center gap-1.5 min-w-0">
              {/* Rank number or placeholder */}
              {hasPicks ? (
                <span className="w-3.5 text-xs text-green-500 font-mono flex-shrink-0 text-right">
                  {index + 1}
                </span>
              ) : (
                <span className="w-3.5 flex-shrink-0" />
              )}

              {/* Q badge */}
              {isQualified ? (
                <span className="text-[9px] font-bold bg-green-700 text-green-200 px-1 py-0 rounded leading-4 flex-shrink-0">
                  Q
                </span>
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}

              {/* Flag */}
              <img
                src={getFlagUrl(meta.flag)}
                alt={team}
                className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                loading="lazy"
              />

              {/* Name */}
              <span className="text-xs text-white truncate flex-1 min-w-0">
                {shortenName(team)}
              </span>

              {/* FIFA rank */}
              <span className="text-[10px] text-green-600 flex-shrink-0 font-mono">
                #{meta.fifaRank}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-2.5 pt-2 border-t border-green-800/60">
        <span
          className={`text-xs font-semibold w-full text-center block ${
            hasPicks
              ? 'text-green-400 group-hover:text-yellow-400'
              : 'text-yellow-500 group-hover:text-yellow-300'
          } transition-colors`}
        >
          {hasPicks ? 'Edit picks' : 'Pick this group →'}
        </span>
      </div>
    </div>
  );
}

export default function GroupOverview({ groups, allPicks, onSelectGroup }: GroupOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {groups.map((group) => (
        <GroupMiniCard
          key={group.id}
          group={group}
          picks={allPicks[group.id] ?? null}
          onClick={() => onSelectGroup(group.id)}
        />
      ))}
    </div>
  );
}
