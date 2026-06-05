'use client';

import { BRACKET_SLOTS, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';

interface KnockoutBracketProps {
  picks: Record<string, string>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  allTeams: string[];
  r32Teams?: Record<number, [string, string]>;
}

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
type BracketRound = (typeof ROUND_ORDER)[number];

const SLOTS_PER_ROUND: Record<BracketRound, number> = {
  R32: 16, R16: 8, QF: 4, SF: 2, Final: 1,
};

const SHORT_NAMES: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia',
  'United States': 'USA',
  "Cote d'Ivoire": 'Ivory Cst',
  'Saudi Arabia': 'S. Arabia',
  'South Africa': 'S. Africa',
  'South Korea': 'S. Korea',
  'New Zealand': 'N. Zealand',
};

function shortBracketName(name: string): string {
  if (SHORT_NAMES[name]) return SHORT_NAMES[name];
  if (name.length <= 9) return name;
  return name.slice(0, 8) + '…';
}

function getSlotLabel(round: string, slot: number): string {
  const found = BRACKET_SLOTS.find((s) => s.round === round && s.slot === slot);
  return found?.label ?? `${round} #${slot}`;
}

/**
 * Compute "effective picks": a pick is only valid if the team is one of the
 * two feeders for that slot. Stale picks from changed upstream choices are
 * silently excluded so they don't propagate forward.
 */
function computeEffectivePicks(
  rawPicks: Record<string, string>,
  r32Teams: Record<number, [string, string]>
): Record<string, string> {
  const eff: Record<string, string> = {};

  // R32: valid if team is in r32Teams[slot]
  for (let slot = 0; slot < 16; slot++) {
    const key = `R32-${slot}`;
    const teams = r32Teams[slot];
    if (!rawPicks[key]) continue;
    if (!teams) {
      eff[key] = rawPicks[key]; // no group data yet — keep manual pick
    } else if (rawPicks[key] === teams[0] || rawPicks[key] === teams[1]) {
      eff[key] = rawPicks[key];
    }
  }

  // R16 → Final: valid if team matches one of the two upstream effective picks
  for (let ri = 1; ri < ROUND_ORDER.length; ri++) {
    const round = ROUND_ORDER[ri];
    const prevRound = ROUND_ORDER[ri - 1];
    const numSlots = SLOTS_PER_ROUND[round];
    for (let slot = 0; slot < numSlots; slot++) {
      const key = `${round}-${slot}`;
      const t1 = eff[`${prevRound}-${slot * 2}`] ?? null;
      const t2 = eff[`${prevRound}-${slot * 2 + 1}`] ?? null;
      if (rawPicks[key] && (rawPicks[key] === t1 || rawPicks[key] === t2)) {
        eff[key] = rawPicks[key];
      }
    }
  }

  return eff;
}

/**
 * For each slot, the two teams available to click:
 * - R32: from r32Teams (group qualifiers)
 * - R16+: from the two upstream effective picks
 */
function computeSlotTeams(
  effectivePicks: Record<string, string>,
  r32Teams: Record<number, [string, string]>
): Record<string, [string, string]> {
  const slotTeams: Record<string, [string, string]> = {};

  for (let slot = 0; slot < 16; slot++) {
    if (r32Teams[slot]) slotTeams[`R32-${slot}`] = r32Teams[slot];
  }

  for (let ri = 1; ri < ROUND_ORDER.length; ri++) {
    const round = ROUND_ORDER[ri];
    const prevRound = ROUND_ORDER[ri - 1];
    const numSlots = SLOTS_PER_ROUND[round];
    for (let slot = 0; slot < numSlots; slot++) {
      const t1 = effectivePicks[`${prevRound}-${slot * 2}`] ?? null;
      const t2 = effectivePicks[`${prevRound}-${slot * 2 + 1}`] ?? null;
      if (t1 && t2) slotTeams[`${round}-${slot}`] = [t1, t2];
    }
  }

  return slotTeams;
}

// ─── Team button ──────────────────────────────────────────────────────────────

function TeamButton({
  team, isSelected, onClick, disabled,
}: {
  team: string; isSelected: boolean; onClick: () => void; disabled: boolean;
}) {
  const meta = getTeamMeta(team);
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded transition-colors ${
        isSelected
          ? 'bg-yellow-500 text-black'
          : disabled
          ? 'bg-green-900/40 text-green-600 cursor-not-allowed'
          : 'bg-green-800 hover:bg-green-700 text-white cursor-pointer'
      }`}
    >
      <img
        src={getFlagUrl(meta.flag)}
        alt={team}
        className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
      />
      <span className="text-[10px] font-semibold w-full text-center leading-tight truncate px-0.5">
        {shortBracketName(team)}
      </span>
      <span className={`text-[9px] leading-tight ${isSelected ? 'text-black/60' : 'text-green-400'}`}>
        #{meta.fifaRank}
      </span>
    </button>
  );
}

// ─── Match slot ───────────────────────────────────────────────────────────────

interface MatchSlotProps {
  round: string;
  slot: number;
  effectivePicks: Record<string, string>;
  slotTeams: Record<string, [string, string]>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
}

function MatchSlot({ round, slot, effectivePicks, slotTeams, onChange, locked }: MatchSlotProps) {
  const key = `${round}-${slot}`;
  const selected = effectivePicks[key] ?? null;
  const label = getSlotLabel(round, slot);
  const teams = slotTeams[key] ?? null;
  const selectedMeta = selected ? getTeamMeta(selected) : null;

  return (
    <div className={`rounded-lg border text-xs w-full transition-colors ${
      selected ? 'border-yellow-600/70 bg-green-800/60' : 'border-green-700 bg-green-900/70'
    }`}>
      <div className="px-1.5 py-0.5 text-green-600 border-b border-green-700/40 truncate text-[9px] leading-tight">
        {label}
      </div>

      {locked ? (
        <div className="px-2 py-1.5 flex items-center gap-1.5">
          {selectedMeta && (
            <img src={getFlagUrl(selectedMeta.flag)} alt={selected!} className="w-4 h-3 object-cover rounded-sm" />
          )}
          <span className={`text-[10px] ${selected ? 'text-yellow-300 font-semibold' : 'text-green-600'}`}>
            {selected ? shortBracketName(selected) : 'Locked'}
          </span>
        </div>
      ) : teams ? (
        <div className="flex gap-1 p-1">
          {teams.map((team) => (
            <TeamButton
              key={team}
              team={team}
              isSelected={selected === team}
              onClick={() => onChange(round, slot, team)}
              disabled={false}
            />
          ))}
        </div>
      ) : selected ? (
        // Has a pick but feeders aren't both resolved yet
        <div className="px-2 py-1.5 flex items-center gap-1.5">
          {selectedMeta && (
            <img src={getFlagUrl(selectedMeta.flag)} alt={selected} className="w-4 h-3 object-cover rounded-sm" />
          )}
          <div>
            <div className="text-yellow-300 font-semibold text-[10px]">{shortBracketName(selected)}</div>
            {selectedMeta && <div className="text-green-500 text-[9px]">#{selectedMeta.fifaRank}</div>}
          </div>
        </div>
      ) : (
        <div className="px-2 py-2.5 text-center text-green-700 text-[10px]">
          Awaiting…
        </div>
      )}
    </div>
  );
}

// ─── Half bracket ─────────────────────────────────────────────────────────────

const LEFT_HALF: Record<string, number[]> = {
  R32: [0, 1, 2, 3, 4, 5, 6, 7],
  R16: [0, 1, 2, 3],
  QF: [0, 1],
  SF: [0],
};
const RIGHT_HALF: Record<string, number[]> = {
  R32: [8, 9, 10, 11, 12, 13, 14, 15],
  R16: [4, 5, 6, 7],
  QF: [2, 3],
  SF: [1],
};

interface HalfBracketProps {
  side: 'left' | 'right';
  effectivePicks: Record<string, string>;
  slotTeams: Record<string, [string, string]>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
}

function HalfBracket({ side, effectivePicks, slotTeams, onChange, locked }: HalfBracketProps) {
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
            style={{ minWidth: isR32 ? '118px' : '108px' }}
          >
            <div className="text-center text-green-500 text-[11px] font-semibold pb-1 border-b border-green-800">
              {round}
            </div>
            <div
              className="flex flex-col justify-around flex-1 gap-1.5"
              style={{ minHeight: `${matchCount * 72}px` }}
            >
              {slots.map((slot) => (
                <MatchSlot
                  key={`${round}-${slot}`}
                  round={round}
                  slot={slot}
                  effectivePicks={effectivePicks}
                  slotTeams={slotTeams}
                  onChange={onChange}
                  locked={locked}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function KnockoutBracket({
  picks, onChange, locked, allTeams, r32Teams = {},
}: KnockoutBracketProps) {
  const effectivePicks = computeEffectivePicks(picks, r32Teams);
  const slotTeams = computeSlotTeams(effectivePicks, r32Teams);

  const finalist1 = effectivePicks['SF-0'] ?? null;
  const finalist2 = effectivePicks['SF-1'] ?? null;
  const champion = effectivePicks['Final-0'] ?? null;
  const finalTeams = slotTeams['Final-0'] ?? null;

  const f1Meta = finalist1 ? getTeamMeta(finalist1) : null;
  const f2Meta = finalist2 ? getTeamMeta(finalist2) : null;
  const champMeta = champion ? getTeamMeta(champion) : null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px] px-2 pb-4">
        <div className="flex items-start gap-2 justify-center">

          {/* Left half */}
          <HalfBracket
            side="left"
            effectivePicks={effectivePicks}
            slotTeams={slotTeams}
            onChange={onChange}
            locked={locked}
          />

          {/* ── Center: Final ── */}
          <div
            className="flex flex-col items-center justify-center self-stretch"
            style={{ minWidth: '158px' }}
          >
            <div className="text-yellow-400 font-bold text-sm text-center mb-3 tracking-wide">
              FINAL
            </div>

            {/* Finalist 1 (left SF winner) */}
            <div className={`w-full rounded-lg border px-3 py-2 mb-1 transition-colors ${
              finalist1 ? 'border-yellow-600 bg-green-800' : 'border-green-700 bg-green-900/80'
            }`}>
              {f1Meta ? (
                <div className="flex items-center gap-2">
                  <img src={getFlagUrl(f1Meta.flag)} alt={finalist1!} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-yellow-300 font-semibold text-xs truncate">{shortBracketName(finalist1!)}</div>
                    <div className="text-green-400 text-[10px]">#{f1Meta.fifaRank}</div>
                  </div>
                </div>
              ) : (
                <span className="text-green-500 text-xs">SF1 winner</span>
              )}
            </div>

            <div className="text-green-600 text-xs text-center my-1">vs</div>

            {/* Finalist 2 (right SF winner) */}
            <div className={`w-full rounded-lg border px-3 py-2 mb-3 transition-colors ${
              finalist2 ? 'border-yellow-600 bg-green-800' : 'border-green-700 bg-green-900/80'
            }`}>
              {f2Meta ? (
                <div className="flex items-center gap-2">
                  <img src={getFlagUrl(f2Meta.flag)} alt={finalist2!} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-yellow-300 font-semibold text-xs truncate">{shortBracketName(finalist2!)}</div>
                    <div className="text-green-400 text-[10px]">#{f2Meta.fifaRank}</div>
                  </div>
                </div>
              ) : (
                <span className="text-green-500 text-xs">SF2 winner</span>
              )}
            </div>

            {/* Champion pick */}
            <div className="w-full">
              <div className="text-yellow-400 text-xs font-bold text-center mb-1.5">CHAMPION</div>
              {locked ? (
                <div className={`rounded-lg border px-3 py-2 text-center ${
                  champion ? 'border-yellow-500 bg-yellow-900/30' : 'border-green-700 bg-green-900'
                }`}>
                  {champMeta ? (
                    <div className="flex items-center justify-center gap-2">
                      <img src={getFlagUrl(champMeta.flag)} alt={champion!} className="w-6 h-4 object-cover rounded-sm" />
                      <div className="text-left">
                        <div className="text-yellow-300 font-bold text-xs">{shortBracketName(champion!)}</div>
                        <div className="text-green-400 text-[10px]">#{champMeta.fifaRank}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-green-500 text-xs">Locked</span>
                  )}
                </div>
              ) : finalTeams ? (
                <div className={`rounded-lg border transition-colors ${
                  champion ? 'border-yellow-500 bg-yellow-900/20' : 'border-green-700 bg-green-900'
                }`}>
                  <div className="flex gap-1 p-1">
                    {finalTeams.map((team) => (
                      <TeamButton
                        key={team}
                        team={team}
                        isSelected={champion === team}
                        onClick={() => onChange('Final', 0, team)}
                        disabled={false}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Finalists not yet determined — dropdown fallback
                <div className={`rounded-lg border transition-colors ${
                  champion ? 'border-yellow-500 bg-yellow-900/30' : 'border-green-700 bg-green-900'
                }`}>
                  {champMeta && (
                    <div className="flex items-center gap-2 px-3 pt-2">
                      <img src={getFlagUrl(champMeta.flag)} alt={champion!} className="w-5 h-3.5 object-cover rounded-sm" />
                      <div>
                        <div className="text-yellow-300 font-bold text-xs">{shortBracketName(champion!)}</div>
                        <div className="text-green-400 text-[10px]">#{champMeta.fifaRank}</div>
                      </div>
                    </div>
                  )}
                  <select
                    value={champion ?? ''}
                    onChange={(e) => onChange('Final', 0, e.target.value)}
                    className={`w-full bg-transparent text-xs px-3 py-2 focus:outline-none cursor-pointer ${
                      champion ? 'text-yellow-400' : 'text-green-400'
                    }`}
                  >
                    <option value="" className="bg-green-900 text-green-300">Pick champion…</option>
                    {allTeams.map((team) => (
                      <option key={team} value={team} className="bg-green-900 text-white">{team}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right half */}
          <HalfBracket
            side="right"
            effectivePicks={effectivePicks}
            slotTeams={slotTeams}
            onChange={onChange}
            locked={locked}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-green-500">
          <span>R32 (+2 pts)</span>
          <span>R16 (+3 pts)</span>
          <span>QF (+5 pts)</span>
          <span>SF (+8 pts)</span>
          <span>Final winner (+13 pts)</span>
          <span className="text-yellow-500 font-bold">Champion pick (+20 pts)</span>
        </div>
      </div>
    </div>
  );
}
