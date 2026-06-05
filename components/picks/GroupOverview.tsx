'use client';

import { Group, GroupMatch, getGroupMatches, getTeamMeta, getFlagUrl, computeGroupStandings, groupHasTie } from '@/lib/worldcup-data';

interface GroupOverviewProps {
  groups: Group[];
  matchPicks: Record<string, string>;
  tiebreakerPicks?: Record<string, string[]>;
  onSelectGroup: (groupId: string) => void;
}

function shortenName(name: string): string {
  const map: Record<string, string> = {
    'Bosnia and Herzegovina': 'Bosnia',
    'United States': 'USA',
    "Cote d'Ivoire": 'Ivory Coast',
    'Saudi Arabia': 'S. Arabia',
    'South Africa': 'S. Africa',
    'South Korea': 'S. Korea',
    'New Zealand': 'N. Zealand',
  };
  return map[name] ?? (name.length > 11 ? name.slice(0, 10) + '…' : name);
}

interface Standing {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  pts: number;
}

function computeStandings(
  teams: string[],
  matches: GroupMatch[],
  picks: Record<string, string>
): Standing[] {
  const table: Record<string, Standing> = {};
  for (const t of teams) table[t] = { team: t, p: 0, w: 0, d: 0, l: 0, pts: 0 };
  for (const m of matches) {
    const pick = picks[m.matchId];
    if (!pick) continue;
    table[m.home].p++;
    table[m.away].p++;
    if (pick === 'home') {
      table[m.home].w++; table[m.home].pts += 3; table[m.away].l++;
    } else if (pick === 'away') {
      table[m.away].w++; table[m.away].pts += 3; table[m.home].l++;
    } else {
      table[m.home].d++; table[m.home].pts++;
      table[m.away].d++; table[m.away].pts++;
    }
  }
  return teams
    .map((t) => table[t])
    .sort((a, b) => b.pts - a.pts || b.w - a.w || a.team.localeCompare(b.team));
}

interface GroupMiniCardProps {
  group: Group;
  matchPicks: Record<string, string>;
  tiebreakerOrder?: string[];
  onClick: () => void;
}

function GroupMiniCard({ group, matchPicks, tiebreakerOrder, onClick }: GroupMiniCardProps) {
  const matches = getGroupMatches(group.id);
  const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;
  const total = matches.length;
  const complete = pickedCount === total;
  const started = pickedCount > 0;

  const needsTiebreaker = complete && groupHasTie(computeGroupStandings(group.id, matchPicks)) && !tiebreakerOrder;

  const standings = started ? computeStandings(group.teams, matches, matchPicks) : null;

  return (
    <div
      onClick={onClick}
      className="bg-green-950 border border-green-800 rounded-xl p-3 cursor-pointer hover:border-yellow-500 transition-colors group select-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`${group.name} — click to pick matches`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-yellow-400 font-bold text-xs tracking-widest uppercase">
          {group.name}
        </span>
        {needsTiebreaker ? (
          <span className="text-amber-400 text-xs font-bold">⚠ Tie</span>
        ) : complete ? (
          <span className="text-green-400 text-xs font-bold">&#10003;</span>
        ) : started ? (
          <span className="text-yellow-500 text-[10px] font-semibold">{pickedCount}/{total}</span>
        ) : null}
      </div>

      <div className="border-t border-green-800 mb-2" />

      {started && standings ? (
        /* Standings table with W/D/L + FIFA rank */
        <div>
          {/* Column headers */}
          <div className="grid text-[9px] text-green-600 mb-1 px-0.5" style={{ gridTemplateColumns: '12px 1fr 16px 16px 16px 20px' }}>
            <span></span>
            <span>Team</span>
            <span className="text-center">W</span>
            <span className="text-center">D</span>
            <span className="text-center">L</span>
            <span className="text-right font-bold">Pts</span>
          </div>
          <div className="space-y-0.5">
            {standings.map((row, i) => {
              const meta = getTeamMeta(row.team);
              const autoAdvance = i < 2;
              const mayAdvance = i === 2 && row.pts > 0;
              return (
                <div
                  key={row.team}
                  className={`grid items-center gap-0 rounded px-0.5 py-0.5 ${
                    autoAdvance ? 'bg-yellow-500/8' : mayAdvance ? 'bg-blue-500/5' : ''
                  }`}
                  style={{ gridTemplateColumns: '12px 1fr 16px 16px 16px 20px' }}
                >
                  {/* Pos */}
                  <span className={`text-[10px] font-bold ${autoAdvance ? 'text-yellow-400' : mayAdvance ? 'text-blue-400' : 'text-green-600'}`}>
                    {i + 1}
                  </span>
                  {/* Flag + name + rank */}
                  <div className="flex items-center gap-1 min-w-0">
                    <img src={getFlagUrl(meta.flag)} alt={row.team} className="w-4 h-3 object-cover rounded-sm flex-shrink-0" loading="lazy" />
                    <div className="min-w-0">
                      <span className={`text-[10px] truncate block leading-tight ${autoAdvance ? 'text-white font-medium' : mayAdvance ? 'text-blue-200' : 'text-green-400'}`}>
                        {shortenName(row.team)}
                      </span>
                      <span className="text-[8px] text-green-600 leading-none">#{meta.fifaRank}</span>
                    </div>
                  </div>
                  {/* W */}
                  <span className="text-[10px] text-center text-green-300">{row.w}</span>
                  {/* D */}
                  <span className="text-[10px] text-center text-green-400">{row.d}</span>
                  {/* L */}
                  <span className="text-[10px] text-center text-green-500">{row.l}</span>
                  {/* Pts */}
                  <span className={`text-[11px] text-right font-bold ${autoAdvance ? 'text-yellow-400' : mayAdvance ? 'text-blue-400' : 'text-green-600'}`}>
                    {row.pts}
                  </span>
                </div>
              );
            })}
          </div>
          {complete && (
            <div className="mt-1.5 text-[9px] text-green-600 leading-tight">
              <span className="text-yellow-500">■</span> auto-advance · <span className="text-blue-400">■</span> may qualify (best 3rd)
            </div>
          )}
        </div>
      ) : (
        /* Plain team list — no picks yet */
        <div className="space-y-1">
          {group.teams.map((team) => {
            const meta = getTeamMeta(team);
            return (
              <div key={team} className="flex items-center gap-1.5 min-w-0">
                <img src={getFlagUrl(meta.flag)} alt={team} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" loading="lazy" />
                <span className="text-xs text-white truncate flex-1 min-w-0">{shortenName(team)}</span>
                <span className="text-[10px] text-green-600 flex-shrink-0 font-mono">#{meta.fifaRank}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar / CTA */}
      <div className="mt-2.5 pt-2 border-t border-green-800/60">
        {started ? (
          <div className="space-y-1">
            <div className="w-full bg-green-900 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${complete ? 'bg-green-400' : 'bg-yellow-500'}`}
                style={{ width: `${(pickedCount / total) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-semibold block text-center ${complete ? 'text-green-400' : 'text-yellow-500'} group-hover:text-yellow-300 transition-colors`}>
              {complete ? 'All picked — edit' : `${pickedCount}/${total} picked`}
            </span>
          </div>
        ) : (
          <span className="text-xs font-semibold w-full text-center block text-yellow-500 group-hover:text-yellow-300 transition-colors">
            Pick matches →
          </span>
        )}
      </div>
    </div>
  );
}

export default function GroupOverview({ groups, matchPicks, tiebreakerPicks = {}, onSelectGroup }: GroupOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {groups.map((group) => (
        <GroupMiniCard
          key={group.id}
          group={group}
          matchPicks={matchPicks}
          tiebreakerOrder={tiebreakerPicks[group.id]}
          onClick={() => onSelectGroup(group.id)}
        />
      ))}
    </div>
  );
}
