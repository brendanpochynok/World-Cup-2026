'use client';

import { getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import type { ThirdPlaceEntry } from '@/lib/worldcup-data';

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
  return map[name] ?? (name.length > 16 ? name.slice(0, 15) + '…' : name);
}

// Cross-group ranking of third-place teams. Top 8 of 12 advance (2026 format).
export default function ThirdPlaceRanking({ thirds }: { thirds: ThirdPlaceEntry[] }) {
  if (thirds.length === 0) return null;
  const provisional = thirds.length < 12;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">Best 3rd-place teams</span>
        <span className="text-[11px] text-gray-400 font-semibold">
          Top 8 advance{provisional ? ` · ${thirds.length}/12 groups set` : ''}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {thirds.map((t) => {
          const meta = getTeamMeta(t.team);
          return (
            <div
              key={t.team}
              className={`flex items-center gap-2.5 px-4 py-2 ${t.qualifies ? 'bg-wc-green-500/8' : ''}`}
            >
              <span className={`text-xs font-bold w-4 text-center tabular-nums ${t.qualifies ? 'text-wc-green-600' : 'text-gray-300'}`}>
                {t.rank}
              </span>
              <img src={getFlagUrl(meta.flag)} alt={t.team} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0 border border-gray-200/60" />
              <span className={`flex-1 text-xs font-medium truncate ${t.qualifies ? 'text-wc-green-700' : 'text-gray-500'}`}>
                {shortenName(t.team)}
                <span className="text-gray-400 font-normal ml-1.5">Grp {t.groupId}</span>
              </span>
              <div className="flex items-center gap-3 text-[11px] tabular-nums flex-shrink-0">
                <span className="text-gray-400 w-10 text-right">GD {t.gd > 0 ? `+${t.gd}` : t.gd}</span>
                <span className={`font-bold w-8 text-right ${t.qualifies ? 'text-wc-green-600' : 'text-gray-500'}`}>{t.pts} pt</span>
              </div>
            </div>
          );
        })}
      </div>
      {!provisional && (
        <div className="bg-gray-50 px-4 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
          <span className="text-wc-green-500">■</span> qualifies · ranked by points, goal difference, goals scored
        </div>
      )}
    </div>
  );
}
