'use client';

import { BRACKET_SLOTS, SCORING, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';

interface KnockoutBracketProps {
  picks: Record<string, string>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;                  // global lock (kept for compatibility)
  lockedSlots?: Set<string>;        // per-slot lock keys ("R32-0") whose game started
  r32Labels?: Record<number, string>; // R32 slot → label (kickoff time) replacing the seed label
  results?: Record<string, string>;   // round-slot → actual winner, for green/red colouring
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

function computeEffectivePicks(
  rawPicks: Record<string, string>,
  r32Teams: Record<number, [string, string]>
): Record<string, string> {
  const eff: Record<string, string> = {};
  for (let slot = 0; slot < 16; slot++) {
    const key = `R32-${slot}`;
    const teams = r32Teams[slot];
    if (!rawPicks[key]) continue;
    if (!teams) {
      eff[key] = rawPicks[key];
    } else if (rawPicks[key] === teams[0] || rawPicks[key] === teams[1]) {
      eff[key] = rawPicks[key];
    }
  }
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

function TeamButton({ team, isSelected, onClick, disabled }: {
  team: string; isSelected: boolean; onClick: () => void; disabled: boolean;
}) {
  const meta = getTeamMeta(team);
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded transition-colors ${
        isSelected
          ? 'bg-wc-blue-500 text-white'
          : disabled
          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
      }`}
    >
      <img src={getFlagUrl(meta.flag)} alt={team} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
      <span className="text-[11px] font-semibold w-full text-center leading-tight truncate px-0.5">
        {shortBracketName(team)}
      </span>
      <span className={`text-[11px] leading-tight ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
        #{meta.fifaRank}
      </span>
    </button>
  );
}

interface MatchSlotProps {
  round: string; slot: number;
  effectivePicks: Record<string, string>;
  slotTeams: Record<string, [string, string]>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  r32Labels: Record<number, string>;
  results: Record<string, string>;
}

function MatchSlot({ round, slot, effectivePicks, slotTeams, onChange, locked, r32Labels, results }: MatchSlotProps) {
  const key = `${round}-${slot}`;
  const selected = effectivePicks[key] ?? null;
  const label = (round === 'R32' && r32Labels[slot]) ? r32Labels[slot] : getSlotLabel(round, slot);
  const teams = slotTeams[key] ?? null;
  const selectedMeta = selected ? getTeamMeta(selected) : null;
  const winner = results[key] ?? null;
  const correct = winner && selected ? selected === winner : null; // true/false/null

  return (
    <div className={`rounded-lg border text-xs w-full transition-colors ${
      correct === true ? 'border-wc-green-300 bg-wc-green-500/5'
      : correct === false ? 'border-red-200 bg-red-50'
      : selected ? 'border-wc-blue-300 bg-white' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="px-1.5 py-0.5 text-gray-400 border-b border-gray-200 truncate text-[11px] leading-tight bg-gray-50 rounded-t-lg">
        {label}
      </div>
      {locked ? (
        <div className="px-2 py-1.5 flex items-center gap-1.5">
          {selectedMeta && (
            <img src={getFlagUrl(selectedMeta.flag)} alt={selected!} className="w-4 h-3 object-cover rounded-sm" />
          )}
          <span className={`text-[11px] font-semibold ${
            correct === true ? 'text-wc-green-700' : correct === false ? 'text-wc-red-600' : selected ? 'text-wc-blue-600' : 'text-gray-400'
          }`}>
            {selected ? shortBracketName(selected) : 'Locked'}
          </span>
          {correct === true && <span className="text-[11px] text-wc-green-600 ml-auto">✓</span>}
          {correct === false && <span className="text-[11px] text-wc-red-500 ml-auto">✕</span>}
        </div>
      ) : teams ? (
        <div className="flex gap-1 p-1">
          {teams.map((team) => (
            <TeamButton key={team} team={team} isSelected={selected === team}
              onClick={() => onChange(round, slot, team)} disabled={false} />
          ))}
        </div>
      ) : selected ? (
        <div className="px-2 py-1.5 flex items-center gap-1.5">
          {selectedMeta && (
            <img src={getFlagUrl(selectedMeta.flag)} alt={selected} className="w-4 h-3 object-cover rounded-sm" />
          )}
          <div>
            <div className="text-wc-blue-600 font-semibold text-[11px]">{shortBracketName(selected)}</div>
            {selectedMeta && <div className="text-gray-400 text-[11px]">#{selectedMeta.fifaRank}</div>}
          </div>
        </div>
      ) : (
        <div className="px-2 py-2.5 text-center text-gray-300 text-[11px]">Awaiting…</div>
      )}
    </div>
  );
}

const LEFT_HALF: Record<string, number[]> = { R32: [0,1,2,3,4,5,6,7], R16: [0,1,2,3], QF: [0,1], SF: [0] };
const RIGHT_HALF: Record<string, number[]> = { R32: [8,9,10,11,12,13,14,15], R16: [4,5,6,7], QF: [2,3], SF: [1] };

function HalfBracket({ side, effectivePicks, slotTeams, onChange, locked, lockedSlots, r32Labels, results }: {
  side: 'left' | 'right';
  effectivePicks: Record<string, string>;
  slotTeams: Record<string, [string, string]>;
  onChange: (round: string, slot: number, team: string) => void;
  locked: boolean;
  lockedSlots: Set<string>;
  r32Labels: Record<number, string>;
  results: Record<string, string>;
}) {
  const halfMap = side === 'left' ? LEFT_HALF : RIGHT_HALF;
  const rounds = side === 'left'
    ? (['R32', 'R16', 'QF', 'SF'] as const)
    : (['SF', 'QF', 'R16', 'R32'] as const);

  return (
    <div className="flex gap-2 items-stretch min-w-0">
      {rounds.map((round) => {
        const slots = halfMap[round] ?? [];
        const isR32 = round === 'R32';
        return (
          <div key={round} className="flex flex-col justify-around gap-1" style={{ minWidth: isR32 ? '118px' : '108px' }}>
            <div className="text-center text-wc-blue-500 text-[11px] font-bold pb-1 border-b border-gray-200">
              {round}
            </div>
            <div className="flex flex-col justify-around flex-1 gap-1.5" style={{ minHeight: `${slots.length * 72}px` }}>
              {slots.map((slot) => (
                <MatchSlot key={`${round}-${slot}`} round={round} slot={slot}
                  effectivePicks={effectivePicks} slotTeams={slotTeams} r32Labels={r32Labels} results={results}
                  onChange={onChange} locked={locked || lockedSlots.has(`${round}-${slot}`)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function KnockoutBracket({ picks, onChange, locked, lockedSlots = new Set(), r32Labels = {}, results = {}, allTeams, r32Teams = {} }: KnockoutBracketProps) {
  const effectivePicks = computeEffectivePicks(picks, r32Teams);
  const slotTeams = computeSlotTeams(effectivePicks, r32Teams);
  const championLocked = locked || lockedSlots.has('Final-0');

  const finalist1 = effectivePicks['SF-0'] ?? null;
  const finalist2 = effectivePicks['SF-1'] ?? null;
  const champion  = effectivePicks['Final-0'] ?? null;
  const finalTeams = slotTeams['Final-0'] ?? null;

  const f1Meta    = finalist1 ? getTeamMeta(finalist1) : null;
  const f2Meta    = finalist2 ? getTeamMeta(finalist2) : null;
  const champMeta = champion  ? getTeamMeta(champion)  : null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1160px] px-2 pb-4">
        <div className="flex items-start gap-2 justify-center">

          <HalfBracket side="left" effectivePicks={effectivePicks} slotTeams={slotTeams} onChange={onChange} locked={locked} lockedSlots={lockedSlots} r32Labels={r32Labels} results={results} />

          {/* Center: Final */}
          <div className="flex flex-col items-center justify-center self-stretch" style={{ minWidth: '158px' }}>
            <div className="text-wc-gold-500 font-bold text-sm text-center mb-3 tracking-widest uppercase">
              Final
            </div>

            {/* Finalist 1 */}
            <div className={`w-full rounded-lg border px-3 py-2 mb-1 transition-colors ${
              finalist1 ? 'border-wc-gold-300 bg-wc-gold-400/5' : 'border-gray-200 bg-gray-50'
            }`}>
              {f1Meta ? (
                <div className="flex items-center gap-2">
                  <img src={getFlagUrl(f1Meta.flag)} alt={finalist1!} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-gray-900 font-semibold text-xs truncate">{shortBracketName(finalist1!)}</div>
                    <div className="text-gray-400 text-[11px]">#{f1Meta.fifaRank}</div>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 text-xs">SF1 winner</span>
              )}
            </div>

            <div className="text-gray-400 text-xs text-center my-1">vs</div>

            {/* Finalist 2 */}
            <div className={`w-full rounded-lg border px-3 py-2 mb-3 transition-colors ${
              finalist2 ? 'border-wc-gold-300 bg-wc-gold-400/5' : 'border-gray-200 bg-gray-50'
            }`}>
              {f2Meta ? (
                <div className="flex items-center gap-2">
                  <img src={getFlagUrl(f2Meta.flag)} alt={finalist2!} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-gray-900 font-semibold text-xs truncate">{shortBracketName(finalist2!)}</div>
                    <div className="text-gray-400 text-[11px]">#{f2Meta.fifaRank}</div>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 text-xs">SF2 winner</span>
              )}
            </div>

            {/* Champion pick */}
            <div className="w-full">
              <div className="text-wc-gold-500 text-xs font-bold text-center mb-1.5">Champion</div>
              {championLocked ? (
                <div className={`rounded-lg border px-3 py-2 text-center ${
                  champion ? 'border-wc-gold-300 bg-wc-gold-400/5' : 'border-gray-200 bg-gray-50'
                }`}>
                  {champMeta ? (
                    <div className="flex items-center justify-center gap-2">
                      <img src={getFlagUrl(champMeta.flag)} alt={champion!} className="w-6 h-4 object-cover rounded-sm" />
                      <div className="text-left">
                        <div className="text-wc-gold-500 font-bold text-xs">{shortBracketName(champion!)}</div>
                        <div className="text-gray-400 text-[11px]">#{champMeta.fifaRank}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Locked</span>
                  )}
                </div>
              ) : finalTeams ? (
                <div className={`rounded-lg border transition-colors ${
                  champion ? 'border-wc-gold-300 bg-wc-gold-400/5' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex gap-1 p-1">
                    {finalTeams.map((team) => (
                      <TeamButton key={team} team={team} isSelected={champion === team}
                        onClick={() => onChange('Final', 0, team)} disabled={false} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`rounded-lg border transition-colors ${
                  champion ? 'border-wc-gold-300 bg-wc-gold-400/5' : 'border-gray-200 bg-gray-50'
                }`}>
                  {champMeta && (
                    <div className="flex items-center gap-2 px-3 pt-2">
                      <img src={getFlagUrl(champMeta.flag)} alt={champion!} className="w-5 h-3.5 object-cover rounded-sm" />
                      <div>
                        <div className="text-wc-gold-500 font-bold text-xs">{shortBracketName(champion!)}</div>
                        <div className="text-gray-400 text-[11px]">#{champMeta.fifaRank}</div>
                      </div>
                    </div>
                  )}
                  <select
                    value={champion ?? ''}
                    onChange={(e) => onChange('Final', 0, e.target.value)}
                    className={`w-full bg-transparent text-xs px-3 py-2 focus:outline-none cursor-pointer ${
                      champion ? 'text-wc-gold-500' : 'text-gray-400'
                    }`}
                  >
                    <option value="">Pick champion…</option>
                    {allTeams.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <HalfBracket side="right" effectivePicks={effectivePicks} slotTeams={slotTeams} onChange={onChange} locked={locked} lockedSlots={lockedSlots} r32Labels={r32Labels} results={results} />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-gray-400">
          <span>R32 +{SCORING.r32} pt{SCORING.r32 !== 1 ? 's' : ''}</span>
          <span>R16 +{SCORING.r16} pts</span>
          <span>QF +{SCORING.qf} pts</span>
          <span>SF +{SCORING.sf} pts</span>
          <span className="text-wc-gold-500 font-semibold">Final +{SCORING.final} pts</span>
        </div>
      </div>
    </div>
  );
}
