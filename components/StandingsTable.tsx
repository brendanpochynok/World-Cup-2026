'use client';

import { useState } from 'react';
import PlayerPicksModal from './PlayerPicksModal';
import { getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';

export interface StandingsRow {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  score: number;
  groupPicksCount: number;
  bracketPicksCount: number;
  championPick: string | null;
  favoriteTeam: string | null;
  isMe: boolean;
}

export default function StandingsTable({ scores }: { scores: StandingsRow[] }) {
  const [selected, setSelected] = useState<StandingsRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3.5 px-5 eyebrow text-left w-16">#</th>
              <th className="text-left py-3.5 px-4 eyebrow text-left">Player</th>
              <th className="text-right py-3.5 px-4 eyebrow">Points</th>
              <th className="text-right py-3.5 px-4 eyebrow hidden sm:table-cell">Groups</th>
              <th className="text-right py-3.5 px-5 eyebrow hidden md:table-cell">Bracket</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((u, index) => {
              const label = u.displayName ?? u.username;
              const favMeta = u.favoriteTeam ? getTeamMeta(u.favoriteTeam) : null;
              return (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    u.isMe ? 'bg-wc-blue-500/5 hover:bg-wc-blue-500/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-4 px-5">
                    <span className="font-black text-sm text-gray-400 tabular-nums">{index + 1}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={label}
                          className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          u.isMe ? 'bg-wc-blue-500/10 border border-wc-blue-200' : 'bg-gray-100 border border-gray-200'
                        }`}>
                          <span className={`text-xs font-black uppercase leading-none ${
                            u.isMe ? 'text-wc-blue-500' : 'text-gray-500'
                          }`}>
                            {label.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className={`font-bold text-sm inline-flex items-center gap-1.5 ${u.isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                          {label}
                          {favMeta && (
                            <img
                              src={getFlagUrl(favMeta.flag)}
                              alt={u.favoriteTeam!}
                              title={u.favoriteTeam!}
                              className="w-5 h-3.5 object-cover rounded-sm border border-gray-200/70 flex-shrink-0"
                            />
                          )}
                          {u.isAdmin && (
                            <svg aria-label="Admin" className="w-3.5 h-3.5 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          )}
                        </span>
                        {u.displayName && (
                          <span className="block text-[11px] text-gray-400 font-normal leading-tight">
                            @{u.username}
                          </span>
                        )}
                      </div>
                      {u.isMe && (
                        <span className="tag bg-wc-blue-500/10 text-wc-blue-600 border border-wc-blue-200">
                          you
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-black text-xl tabular-nums ${index === 0 ? 'text-wc-gold-500' : 'text-gray-900'}`}>
                      {u.score}
                    </span>
                    <span className="text-gray-400 text-xs font-normal ml-1">pts</span>
                  </td>
                  <td className="py-4 px-4 text-right text-gray-400 hidden sm:table-cell tabular-nums text-xs font-medium">
                    {u.groupPicksCount}/72
                  </td>
                  <td className="py-4 px-5 text-right text-gray-400 hidden md:table-cell tabular-nums text-xs font-medium">
                    {u.bracketPicksCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <PlayerPicksModal
          username={selected.username}
          displayName={selected.displayName}
          avatarUrl={selected.avatarUrl}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
