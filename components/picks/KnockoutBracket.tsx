'use client';

import { BRACKET_SLOTS, TEAM_FLAGS, getParentSlot } from '@/lib/worldcup-data';

interface KnockoutBracketProps {
  picks: { [key: string]: string }; // key = "round-slot"
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  allTeams: string[];
  r32Teams?: Record<number, [string, string]>; // slot → [team1, team2] from group picks
}

// Rounds in left-to-right progression order for left half
const LEFT_ROUNDS = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
const RIGHT_ROUNDS = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;

// Slot ranges per round per half
const LEFT_HALF: Record<string, number[]> = {
  R32: [0, 1, 2, 3, 4, 5, 6, 7],
  R16: [0, 1, 2, 3],
  QF: [0, 1],
  SF: [0],
  Final: [0],
};
const RIGHT_HALF: Record<string, number[]> = {
  R32: [8, 9, 10, 11, 12, 13, 14, 15],
  R16: [4, 5, 6, 7],
  QF: [2, 3],
  SF: [1],
  Final: [0],
};

// Get label for a slot
function getSlotLabel(round: string, slot: number): string {
  const found = BRACKET_SLOTS.find((s) => s.round === round && s.slot === slot);
  return found?.label ?? `${round} #${slot}`;
}

interface MatchSlotProps {
  round: string;
  slot: number;
  picks: { [key: string]: string };
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  allTeams: string[];
  r32Teams?: Record<number, [string, string]>;
  showConnectorRight?: boolean;
  showConnectorLeft?: boolean;
}

function MatchSlot({
  round,
  slot,
  picks,
  onChange,
  locked,
  allTeams,
  r32Teams,
  showConnectorRight,
  showConnectorLeft,
}: MatchSlotProps) {
  const key = `${round}-${slot}`;
  const selected = picks[key] ?? null;
  const label = getSlotLabel(round, slot);

  const flag = selected ? (TEAM_FLAGS[selected] ?? '🏳') : null;
  const knownTeams = round === 'R32' && r32Teams ? r32Teams[slot] : null;

  function handleSelect(team: string) {
    if (locked) return;
    onChange(round, slot, team);
  }

  return (
    <div className="relative flex items-center">
      {showConnectorLeft && (
        <div className="absolute -left-4 top-1/2 w-4 h-px bg-wc-green-600" />
      )}

      <div
        className={`rounded-lg border text-xs w-full transition-colors ${
          selected
            ? 'border-wc-gold-600 bg-wc-green-800'
            : 'border-wc-green-700 bg-wc-green-900/80'
        }`}
      >
        {/* Slot label (e.g. "1A vs 2B") */}
        <div className="px-2 py-1 text-wc-green-500 border-b border-wc-green-700/50 truncate leading-tight">
          {label}
        </div>

        {/* Team buttons (R32 with known group qualifiers) or dropdown */}
        {locked ? (
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            {flag && <span>{flag}</span>}
            <span className={selected ? 'text-wc-gold-300 font-semibold' : 'text-wc-green-500'}>
              {selected ?? 'Locked'}
            </span>
          </div>
        ) : knownTeams ? (
          <div className="flex gap-1 px-1.5 py-1.5">
            {knownTeams.map((team) => {
              const isSelected = selected === team;
              return (
                <button
                  key={team}
                  onClick={() => handleSelect(team)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded text-[11px] font-semibold transition-colors truncate ${
                    isSelected
                      ? 'bg-yellow-500 text-black'
                      : 'bg-green-800 hover:bg-green-700 text-white'
                  }`}
                >
                  <span>{TEAM_FLAGS[team] ?? '🏳'}</span>
                  <span className="truncate">{team.length > 8 ? team.slice(0, 8) + '…' : team}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-2 py-1">
            <select
              value={selected ?? ''}
              onChange={(e) => handleSelect(e.target.value)}
              className={`w-full bg-transparent text-xs focus:outline-none cursor-pointer ${
                selected ? 'text-wc-gold-300 font-semibold' : 'text-wc-green-400'
              }`}
            >
              <option value="" className="bg-wc-green-900 text-wc-green-300">
                Pick team...
              </option>
              {allTeams.map((team) => (
                <option key={team} value={team} className="bg-wc-green-900 text-white">
                  {TEAM_FLAGS[team] ?? ''} {team}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showConnectorRight && (
        <div className="absolute -right-4 top-1/2 w-4 h-px bg-wc-green-600" />
      )}
    </div>
  );
}

interface HalfBracketProps {
  side: 'left' | 'right';
  picks: { [key: string]: string };
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  allTeams: string[];
  r32Teams?: Record<number, [string, string]>;
}

function HalfBracket({ side, picks, onChange, locked, allTeams, r32Teams }: HalfBracketProps) {
  const halfMap = side === 'left' ? LEFT_HALF : RIGHT_HALF;
  const rounds = side === 'left'
    ? (['R32', 'R16', 'QF', 'SF'] as const)
    : (['SF', 'QF', 'R16', 'R32'] as const);

  return (
    <div className="flex gap-2 items-stretch min-w-0">
      {rounds.map((round) => {
        const slots = halfMap[round] ?? [];
        const isR32 = round === 'R32';
        const matchCount = slots.length;

        return (
          <div
            key={round}
            className="flex flex-col justify-around gap-1"
            style={{ minWidth: isR32 ? '130px' : '120px' }}
          >
            <div className="text-center text-wc-green-500 text-xs font-medium pb-1 border-b border-wc-green-800">
              {round === 'R32' ? 'R32' : round === 'R16' ? 'R16' : round === 'QF' ? 'QF' : 'SF'}
            </div>
            <div
              className="flex flex-col justify-around flex-1 gap-1"
              style={{ minHeight: `${matchCount * 60}px` }}
            >
              {slots.map((slot) => (
                <MatchSlot
                  key={`${round}-${slot}`}
                  round={round}
                  slot={slot}
                  picks={picks}
                  onChange={onChange}
                  locked={locked}
                  allTeams={allTeams}
                  r32Teams={r32Teams}
                  showConnectorRight={side === 'left' && round !== 'SF'}
                  showConnectorLeft={side === 'right' && round !== 'SF'}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function KnockoutBracket({ picks, onChange, locked, allTeams, r32Teams }: KnockoutBracketProps) {
  const finalist1 = picks['SF-0'] ?? null;
  const finalist2 = picks['SF-1'] ?? null;
  const champion = picks['Final-0'] ?? null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] px-2 pb-4">
        {/* Round headers */}
        <div className="flex gap-2 mb-2 justify-center">
          <div className="flex gap-2">
            {(['R32', 'R16', 'QF', 'SF'] as const).map((r) => (
              <div key={r} style={{ minWidth: r === 'R32' ? '130px' : '120px' }} />
            ))}
          </div>
          <div style={{ minWidth: '180px' }} />
          <div className="flex gap-2">
            {(['SF', 'QF', 'R16', 'R32'] as const).map((r) => (
              <div key={r} style={{ minWidth: r === 'R32' ? '130px' : '120px' }} />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 justify-center">
          {/* Left half */}
          <HalfBracket
            side="left"
            picks={picks}
            onChange={onChange}
            locked={locked}
            allTeams={allTeams}
            r32Teams={r32Teams}
          />

          {/* Center: Final */}
          <div className="flex flex-col items-center justify-center self-stretch" style={{ minWidth: '180px' }}>
            <div className="text-center mb-2">
              <div className="text-wc-gold-400 font-bold text-sm">FINAL</div>
            </div>

            {/* Left finalist */}
            <div
              className={`w-full rounded-lg border px-3 py-2 text-sm mb-1 transition-colors ${
                finalist1
                  ? 'border-wc-gold-600 bg-wc-green-800'
                  : 'border-wc-green-700 bg-wc-green-900/80'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {finalist1 && <span>{TEAM_FLAGS[finalist1] ?? '🏳'}</span>}
                <span className={finalist1 ? 'text-wc-gold-300 font-semibold' : 'text-wc-green-500 text-xs'}>
                  {finalist1 ?? 'SF1 winner'}
                </span>
              </div>
            </div>

            <div className="text-wc-green-600 text-xs text-center my-1">vs</div>

            {/* Right finalist */}
            <div
              className={`w-full rounded-lg border px-3 py-2 text-sm mb-3 transition-colors ${
                finalist2
                  ? 'border-wc-gold-600 bg-wc-green-800'
                  : 'border-wc-green-700 bg-wc-green-900/80'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {finalist2 && <span>{TEAM_FLAGS[finalist2] ?? '🏳'}</span>}
                <span className={finalist2 ? 'text-wc-gold-300 font-semibold' : 'text-wc-green-500 text-xs'}>
                  {finalist2 ?? 'SF2 winner'}
                </span>
              </div>
            </div>

            {/* Champion pick */}
            <div className="w-full">
              <div className="text-center text-wc-gold-400 text-xs font-bold mb-1.5">
                CHAMPION
              </div>
              {locked ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-center ${
                    champion
                      ? 'border-wc-gold-500 bg-wc-gold-900/30'
                      : 'border-wc-green-700 bg-wc-green-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {champion ? (
                      <>
                        <span className="text-lg">{TEAM_FLAGS[champion] ?? '🏳'}</span>
                        <span className="text-wc-gold-300 font-bold text-sm">{champion}</span>
                      </>
                    ) : (
                      <span className="text-wc-green-500 text-xs">Locked</span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-lg border transition-colors ${
                    champion
                      ? 'border-wc-gold-500 bg-wc-gold-900/30'
                      : 'border-wc-green-700 bg-wc-green-900'
                  }`}
                >
                  {champion && (
                    <div className="flex items-center justify-center gap-1.5 px-3 pt-2">
                      <span className="text-lg">{TEAM_FLAGS[champion] ?? '🏳'}</span>
                      <span className="text-wc-gold-300 font-bold text-sm">{champion}</span>
                    </div>
                  )}
                  <select
                    value={champion ?? ''}
                    onChange={(e) => onChange('Final', 0, e.target.value)}
                    className={`w-full bg-transparent text-xs px-3 py-2 focus:outline-none cursor-pointer ${
                      champion ? 'text-wc-gold-400' : 'text-wc-green-400'
                    }`}
                  >
                    <option value="" className="bg-wc-green-900 text-wc-green-300">
                      Pick champion...
                    </option>
                    {allTeams.map((team) => (
                      <option key={team} value={team} className="bg-wc-green-900 text-white">
                        {TEAM_FLAGS[team] ?? ''} {team}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right half */}
          <HalfBracket
            side="right"
            picks={picks}
            onChange={onChange}
            locked={locked}
            allTeams={allTeams}
            r32Teams={r32Teams}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-wc-green-500">
          <span>R32 = Round of 32 (+2 pts)</span>
          <span>R16 = Round of 16 (+3 pts)</span>
          <span>QF = Quarter-Finals (+5 pts)</span>
          <span>SF = Semi-Finals (+8 pts)</span>
          <span>Final winner (+13 pts)</span>
          <span className="text-wc-gold-500 font-bold">Champion pick (+20 pts)</span>
        </div>
      </div>
    </div>
  );
}
