'use client';

// Read-only bracket viewer for the Brackets tab: shows the full matchup at
// every slot (both teams, not just the pick), highlights the player's
// selection, colours it against actual results, and overlays live match data,
// match odds, and pool-wide pick distribution where available.

import { getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import type { MatchData } from '@/app/api/scores/route';
import type { MatchOdds } from '@/app/api/odds/route';
import type { SlotDistribution } from '@/app/api/brackets/route';

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
const ROUND_LABELS: Record<string, string> = {
  R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinals', SF: 'Semifinals', Final: 'Final',
};
const SLOTS_PER_ROUND: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

const SHORT: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia', 'United States': 'USA', "Cote d'Ivoire": 'Ivory Coast',
  'Saudi Arabia': 'S. Arabia', 'South Africa': 'S. Africa', 'South Korea': 'S. Korea',
  'New Zealand': 'N. Zealand',
};
function short(name: string): string {
  return SHORT[name] ?? name;
}

interface Props {
  picks: Record<string, string>;              // raw picks keyed "R32-0"
  r32Teams: Record<number, [string, string]>; // actual R32 matchups
  results: Record<string, string>;            // "round-slot" → actual winner
  eliminated?: string[];                      // teams knocked out — dead picks
  liveByKey?: Record<string, MatchData>;      // actual knockout match keyed "round-slot"
  oddsByKey?: Record<string, MatchOdds>;      // odds keyed "round-slot"
  distribution?: Record<string, SlotDistribution>;
}

// Matchup at each slot built straight from the player's raw picks: R32 from the
// real seeding, every later round from the two teams they advanced.
function buildMatchups(
  picks: Record<string, string>,
  r32Teams: Record<number, [string, string]>,
): Record<string, [string | null, string | null]> {
  const m: Record<string, [string | null, string | null]> = {};
  for (let slot = 0; slot < 16; slot++) {
    m[`R32-${slot}`] = r32Teams[slot] ?? [null, null];
  }
  for (let ri = 1; ri < ROUND_ORDER.length; ri++) {
    const round = ROUND_ORDER[ri];
    const prev = ROUND_ORDER[ri - 1];
    for (let slot = 0; slot < SLOTS_PER_ROUND[round]; slot++) {
      m[`${round}-${slot}`] = [
        picks[`${prev}-${slot * 2}`] ?? null,
        picks[`${prev}-${slot * 2 + 1}`] ?? null,
      ];
    }
  }
  return m;
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function TeamRow({
  team, picked, winner, dead, scoreText, winProb, distCount, distTotal, isFinal,
}: {
  team: string | null;
  picked: boolean;
  winner: boolean;
  dead: boolean;
  scoreText: string | null;
  winProb: number | null;
  distCount: number | null;
  distTotal: number;
  isFinal: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-gray-300 text-[11px]">
        <span className="w-4 h-3 rounded-sm bg-gray-100 inline-block" />
        TBD
      </div>
    );
  }
  const meta = getTeamMeta(team);
  // A team is "dead" if it has been knocked out — either it lost this slot or it
  // was eliminated earlier (a pick that can no longer come good).
  const eliminated = dead && !winner;
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${
        picked ? 'bg-wc-blue-50' : ''
      } ${winner ? 'text-wc-green-700' : eliminated ? 'text-gray-400' : 'text-gray-800'}`}
    >
      <img src={getFlagUrl(meta.flag)} alt={team} className="w-4 h-3 object-cover rounded-sm flex-shrink-0 self-start mt-0.5" />
      <div className="min-w-0 flex-1">
        <span className={`block text-[11px] truncate ${picked ? 'font-bold' : 'font-medium'} ${eliminated ? 'line-through' : ''}`}>
          {isFinal && picked && '👑 '}{short(team)}
          {picked && <span className="text-[10px] text-wc-blue-500 font-bold ml-1">●</span>}
          {winner && <span className="text-[10px] text-wc-green-600 ml-1">✓</span>}
        </span>
        {/* Pool pick share, shown under every option. */}
        {distCount !== null && (
          <span className="block text-[9px] text-gray-400 leading-tight" title={`${distCount}/${distTotal} entries`}>
            {pct(distCount, distTotal)}% of pool
          </span>
        )}
      </div>
      <span className="ml-auto flex items-center gap-1.5 flex-shrink-0 self-start mt-0.5">
        {scoreText !== null && <span className="text-[11px] font-bold tabular-nums text-gray-700">{scoreText}</span>}
        {winProb !== null && <span className="text-[10px] text-wc-blue-400 tabular-nums w-7 text-right" title="Win odds">{Math.round(winProb * 100)}%</span>}
      </span>
    </div>
  );
}

export default function BracketBoard({
  picks, r32Teams, results, eliminated = [], liveByKey = {}, oddsByKey = {}, distribution = {},
}: Props) {
  const matchups = buildMatchups(picks, r32Teams);
  const elimSet = new Set(eliminated);

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <div className="flex gap-2.5 min-w-[900px]">
        {ROUND_ORDER.map((round) => (
          <div key={round} className="flex-1 flex flex-col min-w-[150px]">
            <p className="text-[11px] font-bold text-wc-blue-500 mb-2 text-center uppercase tracking-wide">
              {ROUND_LABELS[round]}
            </p>
            <div className="flex-1 flex flex-col justify-around gap-1.5">
              {Array.from({ length: SLOTS_PER_ROUND[round] }, (_, slot) => {
                const key = `${round}-${slot}`;
                const [a, b] = matchups[key] ?? [null, null];
                const picked = picks[key] ?? null;
                const winner = results[key] ?? null;
                const decided = !!winner;
                const isFinal = round === 'Final';

                // Live data / odds apply only when the real fixture features the
                // same two teams the player advanced into this slot.
                const live = liveByKey[key];
                const odds = oddsByKey[key];
                const realMatch =
                  live && a && b &&
                  ((live.home === a && live.away === b) || (live.home === b && live.away === a));

                const scoreFor = (team: string | null): string | null => {
                  if (!realMatch || !team || live!.homeScore === null || live!.awayScore === null) return null;
                  if (live!.status === 'scheduled') return null;
                  const isHome = live!.home === team;
                  return String(isHome ? live!.homeScore : live!.awayScore);
                };
                // Knockout games can't draw — split the draw probability evenly
                // so the two teams' win odds sum to 100%.
                const probFor = (team: string | null): number | null => {
                  if (!realMatch || !odds || !team) return null;
                  const base = live!.home === team ? odds.home : odds.away;
                  return base + odds.draw / 2;
                };

                const dist = distribution[key];
                // Dead = knocked out: lost this slot, or eliminated earlier.
                const deadFor = (t: string | null): boolean =>
                  !!t && t !== winner && (decided || elimSet.has(t));
                const liveBadge =
                  realMatch && live!.status === 'live'
                    ? live!.clock || 'LIVE'
                    : realMatch && live!.status === 'finished'
                    ? 'FT'
                    : null;

                return (
                  <div
                    key={slot}
                    className={`rounded-lg border overflow-hidden ${
                      decided ? 'border-wc-green-200' : isFinal ? 'border-wc-gold-300' : 'border-gray-200'
                    } bg-white`}
                  >
                    <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] text-gray-400 font-semibold">{ROUND_LABELS[round] === 'Final' ? 'Champion' : `#${slot + 1}`}</span>
                      {liveBadge && (
                        <span className={`text-[10px] font-bold ${live!.status === 'live' ? 'text-wc-red-500' : 'text-gray-400'}`}>
                          {liveBadge}
                        </span>
                      )}
                    </div>
                    {isFinal && dist && dist.total > 0 ? (
                      // Champion is a free pick, so list EVERY team the pool
                      // picked to win it all, ranked by share.
                      Object.entries(dist.teams)
                        .sort((x, y) => y[1] - x[1])
                        .map(([team, count]) => (
                          <TeamRow
                            key={team}
                            team={team}
                            picked={picked === team}
                            winner={winner === team}
                            dead={deadFor(team)}
                            scoreText={null}
                            winProb={null}
                            distCount={count}
                            distTotal={dist.total}
                            isFinal
                          />
                        ))
                    ) : (
                      <>
                        <TeamRow
                          team={a}
                          picked={picked === a && !!a}
                          winner={winner === a && !!a}
                          dead={deadFor(a)}
                          scoreText={scoreFor(a)}
                          winProb={probFor(a)}
                          distCount={dist && a ? dist.teams[a] ?? 0 : null}
                          distTotal={dist?.total ?? 0}
                          isFinal={isFinal}
                        />
                        <TeamRow
                          team={b}
                          picked={picked === b && !!b}
                          winner={winner === b && !!b}
                          dead={deadFor(b)}
                          scoreText={scoreFor(b)}
                          winProb={probFor(b)}
                          distCount={dist && b ? dist.teams[b] ?? 0 : null}
                          distTotal={dist?.total ?? 0}
                          isFinal={isFinal}
                        />
                        {/* An off-matchup pick — e.g. a champion who isn't one of
                            their finalists, or a pick whose team lost upstream —
                            is still shown so it's never silently hidden. */}
                        {picked && picked !== a && picked !== b && (
                          <div className="border-t border-dashed border-gray-200">
                            <TeamRow
                              team={picked}
                              picked
                              winner={winner === picked}
                              dead={deadFor(picked)}
                              scoreText={null}
                              winProb={null}
                              distCount={dist ? dist.teams[picked] ?? 0 : null}
                              distTotal={dist?.total ?? 0}
                              isFinal={isFinal}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] text-gray-400 font-semibold">
        <span className="inline-flex items-center gap-1"><span className="text-wc-blue-500">●</span> Their pick</span>
        <span className="inline-flex items-center gap-1"><span className="text-wc-green-600">✓</span> Advanced</span>
        <span className="inline-flex items-center gap-1"><span className="text-wc-blue-400">00%</span> Win odds</span>
        <span className="inline-flex items-center gap-1"><span className="text-gray-400">00%</span> Pool pick %</span>
      </div>
    </div>
  );
}
