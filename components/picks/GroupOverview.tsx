'use client';

import { Group, getGroupMatches, getTeamMeta, getFlagUrl, computeGroupStandings } from '@/lib/worldcup-data';

interface GroupOverviewProps {
  groups: Group[];
  matchPicks: Record<string, string>;
  // Standings source: real results merged over the user's picks. Drives the
  // table + advance coloring, while matchPicks still drives pick progress.
  standingsPicks: Record<string, string>;
  advancementScores?: Record<string, number>;
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

function GroupMiniCard({ group, matchPicks, standingsPicks, advancementScores, onClick }: {
  group: Group;
  matchPicks: Record<string, string>;
  standingsPicks: Record<string, string>;
  advancementScores?: Record<string, number>;
  onClick: () => void;
}) {
  const matches = getGroupMatches(group.id);
  const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;
  const total = matches.length;
  const complete = pickedCount === total;
  const started = pickedCount > 0;
  // Standings reflect real results + predictions, so they can show even for
  // games the user hasn't picked yet (already-finished matches).
  const standingsStarted = matches.some((m) => standingsPicks[m.matchId]);
  const standings = standingsStarted ? computeGroupStandings(group.id, standingsPicks, advancementScores) : null;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-wc-blue-400 hover:shadow-sm transition-all group select-none"
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`${group.name} — click to pick matches`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700 font-bold text-xs tracking-widest uppercase">{group.name}</span>
        {complete ? (
          <span className="text-wc-green-600 text-xs font-bold">&#10003;</span>
        ) : started ? (
          <span className="text-wc-blue-500 text-[11px] font-semibold">{pickedCount}/{total}</span>
        ) : null}
      </div>

      <div className="border-t border-gray-100 mb-2" />

      {standings ? (
        <div>
          <div className="grid text-[11px] text-gray-400 mb-1 px-0.5" style={{ gridTemplateColumns: '12px 1fr 16px 16px 16px 20px' }}>
            <span></span><span>Team</span>
            <span className="text-center">W</span><span className="text-center">D</span>
            <span className="text-center">L</span><span className="text-right font-bold">Pts</span>
          </div>
          <div className="space-y-0.5">
            {standings.map((row, i) => {
              const meta = getTeamMeta(row.team);
              const autoAdvance = i < 2;
              const mayAdvance = i === 2 && row.pts > 0;
              return (
                <div key={row.team}
                  className={`grid items-center rounded px-0.5 py-0.5 ${autoAdvance ? 'bg-wc-blue-500/5' : mayAdvance ? 'bg-gray-50' : ''}`}
                  style={{ gridTemplateColumns: '12px 1fr 16px 16px 16px 20px' }}
                >
                  <span className={`text-[11px] font-bold ${autoAdvance ? 'text-wc-blue-500' : mayAdvance ? 'text-gray-500' : 'text-gray-300'}`}>{i + 1}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <img src={getFlagUrl(meta.flag)} alt={row.team} className="w-4 h-3 object-cover rounded-sm flex-shrink-0" loading="lazy" />
                    <div className="min-w-0">
                      <span className={`text-[11px] truncate block leading-tight ${autoAdvance ? 'text-gray-900 font-medium' : mayAdvance ? 'text-gray-600' : 'text-gray-400'}`}>
                        {shortenName(row.team)}
                      </span>
                      <span className="text-[11px] text-gray-400 leading-none">#{meta.fifaRank}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-center text-gray-500">{row.w}</span>
                  <span className="text-[11px] text-center text-gray-400">{row.d}</span>
                  <span className="text-[11px] text-center text-gray-400">{row.l}</span>
                  <span className={`text-[11px] text-right font-bold ${autoAdvance ? 'text-wc-blue-500' : mayAdvance ? 'text-gray-500' : 'text-gray-300'}`}>{row.pts}</span>
                </div>
              );
            })}
          </div>
          {complete && (
            <div className="mt-1.5 text-[11px] text-gray-400 leading-tight">
              <span className="text-wc-blue-400">■</span> advance · <span className="text-gray-400">■</span> may qualify
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {group.teams.map((team) => {
            const meta = getTeamMeta(team);
            return (
              <div key={team} className="flex items-center gap-1.5 min-w-0">
                <img src={getFlagUrl(meta.flag)} alt={team} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" loading="lazy" />
                <span className="text-xs text-gray-900 truncate flex-1 min-w-0">{shortenName(team)}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0 font-mono">#{meta.fifaRank}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2.5 pt-2 border-t border-gray-100">
        {started ? (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div className={`h-1 rounded-full transition-all ${complete ? 'bg-wc-green-500' : 'bg-wc-blue-500'}`}
                style={{ width: `${(pickedCount / total) * 100}%` }} />
            </div>
            <span className={`text-xs font-semibold block text-center ${complete ? 'text-wc-green-600' : 'text-wc-blue-500'} group-hover:text-gray-900 transition-colors`}>
              {complete ? 'All picked — edit' : `${pickedCount}/${total} picked`}
            </span>
          </div>
        ) : (
          <span className="text-xs font-semibold w-full text-center block text-gray-400 group-hover:text-gray-900 transition-colors">
            Pick matches
          </span>
        )}
      </div>
    </div>
  );
}

export default function GroupOverview({ groups, matchPicks, standingsPicks, advancementScores, onSelectGroup }: GroupOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {groups.map((group) => (
        <GroupMiniCard
          key={group.id}
          group={group}
          matchPicks={matchPicks}
          standingsPicks={standingsPicks}
          advancementScores={advancementScores}
          onClick={() => onSelectGroup(group.id)}
        />
      ))}
    </div>
  );
}
