'use client';

import { useState, useTransition } from 'react';
import { GROUP_MATCHES, GROUPS, ALL_TEAMS, BRACKET_ROUNDS } from '@/lib/worldcup-data';

interface MatchResultRow {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
}

interface BracketResultRow {
  round: string;
  slot: number;
  team: string;
}

interface Props {
  matchResults: MatchResultRow[];
  bracketResults: BracketResultRow[];
  entryFee: number;
  playerCount: number;
}

type Tab = 'results' | 'bracket' | 'pool';

// ── per-match edit state ─────────────────────────────────────────────────────

type MatchEditState = {
  homeGoals: string;
  awayGoals: string;
  status: string;
  saving: boolean;
  saved: boolean;
  error: string;
};

function initMatchStates(results: MatchResultRow[]): Record<string, MatchEditState> {
  const map: Record<string, MatchEditState> = {};
  const byId: Record<string, MatchResultRow> = {};
  for (const r of results) byId[r.matchId] = r;
  for (const m of GROUP_MATCHES) {
    const r = byId[m.matchId];
    map[m.matchId] = {
      homeGoals: r?.homeGoals != null ? String(r.homeGoals) : '',
      awayGoals: r?.awayGoals != null ? String(r.awayGoals) : '',
      status: r?.status ?? 'scheduled',
      saving: false,
      saved: false,
      error: '',
    };
  }
  return map;
}

// ── per-bracket-slot edit state ──────────────────────────────────────────────

type SlotEditState = { team: string; saving: boolean; saved: boolean; error: string };

function initBracketStates(results: BracketResultRow[]): Record<string, SlotEditState> {
  const map: Record<string, SlotEditState> = {};
  const byKey: Record<string, string> = {};
  for (const r of results) byKey[`${r.round}:${r.slot}`] = r.team;
  for (const round of BRACKET_ROUNDS) {
    for (let slot = 0; slot < round.slots; slot++) {
      map[`${round.id}:${slot}`] = {
        team: byKey[`${round.id}:${slot}`] ?? '',
        saving: false,
        saved: false,
        error: '',
      };
    }
  }
  return map;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  finished: 'Finished',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-gray-100 text-gray-500',
  live: 'bg-green-100 text-green-700',
  finished: 'bg-blue-50 text-blue-600',
};

// ── main component ────────────────────────────────────────────────────────────

export default function AdminPanel({ matchResults, bracketResults, entryFee, playerCount }: Props) {
  const [tab, setTab] = useState<Tab>('results');
  const [matchStates, setMatchStates] = useState<Record<string, MatchEditState>>(() =>
    initMatchStates(matchResults),
  );
  const [bracketStates, setBracketStates] = useState<Record<string, SlotEditState>>(() =>
    initBracketStates(bracketResults),
  );
  const [feeInput, setFeeInput] = useState(String(entryFee));
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [seeding, startSeeding] = useTransition();

  // ── seed ──────────────────────────────────────────────────────────────────

  async function handleSeed() {
    startSeeding(async () => {
      await fetch('/api/admin/seed', { method: 'POST' });
      window.location.reload();
    });
  }

  // ── match save ────────────────────────────────────────────────────────────

  function setMatchField(matchId: string, patch: Partial<MatchEditState>) {
    setMatchStates((prev) => ({ ...prev, [matchId]: { ...prev[matchId], ...patch } }));
  }

  async function saveMatch(matchId: string) {
    const s = matchStates[matchId];
    const homeGoals = s.homeGoals.trim() === '' ? null : Number(s.homeGoals);
    const awayGoals = s.awayGoals.trim() === '' ? null : Number(s.awayGoals);

    if (
      (homeGoals !== null && (isNaN(homeGoals) || homeGoals < 0 || !Number.isInteger(homeGoals))) ||
      (awayGoals !== null && (isNaN(awayGoals) || awayGoals < 0 || !Number.isInteger(awayGoals)))
    ) {
      setMatchField(matchId, { error: 'Goals must be whole numbers ≥ 0' });
      return;
    }

    setMatchField(matchId, { saving: true, error: '', saved: false });
    const res = await fetch('/api/admin/match-results', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeGoals, awayGoals, status: s.status }),
    });
    if (res.ok) {
      setMatchField(matchId, { saving: false, saved: true });
      setTimeout(() => setMatchField(matchId, { saved: false }), 2000);
    } else {
      const j = await res.json().catch(() => ({}));
      setMatchField(matchId, { saving: false, error: j.error ?? 'Save failed' });
    }
  }

  // ── bracket save ──────────────────────────────────────────────────────────

  function setSlotField(key: string, patch: Partial<SlotEditState>) {
    setBracketStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function saveBracketSlot(round: string, slot: number) {
    const key = `${round}:${slot}`;
    const s = bracketStates[key];
    if (!s.team) {
      setSlotField(key, { error: 'Select a team' });
      return;
    }
    setSlotField(key, { saving: true, error: '', saved: false });
    const res = await fetch('/api/admin/bracket-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round, slot, team: s.team }),
    });
    if (res.ok) {
      setSlotField(key, { saving: false, saved: true });
      setTimeout(() => setSlotField(key, { saved: false }), 2000);
    } else {
      const j = await res.json().catch(() => ({}));
      setSlotField(key, { saving: false, error: j.error ?? 'Save failed' });
    }
  }

  // ── pool config save ──────────────────────────────────────────────────────

  async function saveFee() {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0) {
      setFeeError('Enter a valid amount ≥ 0');
      return;
    }
    setFeeSaving(true);
    setFeeError('');
    setFeeSaved(false);
    const res = await fetch('/api/admin/pool-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryFeePerPlayer: fee }),
    });
    if (res.ok) {
      setFeeSaving(false);
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 2000);
    } else {
      const j = await res.json().catch(() => ({}));
      setFeeSaving(false);
      setFeeError(j.error ?? 'Save failed');
    }
  }

  const totalPool = (parseFloat(feeInput) || 0) * playerCount;

  // ── render ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: 'results', label: 'Match Results' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'pool', label: 'Pool Config' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-end gap-3">
        <div>
          <p className="eyebrow mb-1.5">Admin Panel</p>
          <h1 className="text-3xl font-black text-gray-900">Tournament Management</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
              tab === t.id
                ? 'text-wc-blue-500'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 inset-x-0 h-[2px] bg-wc-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Match Results ── */}
      {tab === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Enter scores for completed group stage matches. Status auto-sets to <strong>Finished</strong> when both scores are saved.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              {seeding ? 'Seeding…' : 'Seed 72 matches'}
            </button>
          </div>

          {GROUPS.map((group) => {
            const groupMatches = GROUP_MATCHES.filter((m) => m.group === group.id);
            const finishedCount = groupMatches.filter(
              (m) => matchStates[m.matchId]?.status === 'finished',
            ).length;

            return (
              <GroupSection
                key={group.id}
                group={group}
                matches={groupMatches}
                matchStates={matchStates}
                finishedCount={finishedCount}
                onFieldChange={setMatchField}
                onSave={saveMatch}
              />
            );
          })}
        </div>
      )}

      {/* ── Tab: Bracket ── */}
      {tab === 'bracket' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Record which teams advance through each knockout round.
          </p>
          {BRACKET_ROUNDS.map((round) => (
            <div key={round.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-900">{round.name}</h2>
                <span className="text-xs text-gray-400 font-semibold">{round.slots} slots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: round.slots }, (_, slot) => {
                  const key = `${round.id}:${slot}`;
                  const s = bracketStates[key];
                  if (!s) return null;
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono w-6 text-right flex-shrink-0">
                        {slot + 1}
                      </span>
                      <select
                        value={s.team}
                        onChange={(e) => setSlotField(key, { team: e.target.value, saved: false, error: '' })}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-wc-blue-300 bg-white"
                      >
                        <option value="">— select team —</option>
                        {ALL_TEAMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveBracketSlot(round.id, slot)}
                        disabled={s.saving}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          s.saved
                            ? 'bg-wc-green-100 text-wc-green-700'
                            : 'btn-primary'
                        }`}
                      >
                        {s.saving ? '…' : s.saved ? '✓' : 'Save'}
                      </button>
                      {s.error && <span className="text-xs text-red-500">{s.error}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Pool Config ── */}
      {tab === 'pool' && (
        <div className="card max-w-sm space-y-5">
          <div>
            <h2 className="font-black text-gray-900 mb-1">Entry Fee</h2>
            <p className="text-sm text-gray-500">Set the buy-in per player. Set to 0 for a free pool.</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Entry fee per player ($)
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-gray-400 font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={feeInput}
                  onChange={(e) => { setFeeInput(e.target.value); setFeeSaved(false); }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300"
                />
              </div>
            </label>

            {parseFloat(feeInput) > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{playerCount} players × ${parseFloat(feeInput) || 0}</span>
                  <span className="font-black text-gray-900">${totalPool.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1st place (75%)</span>
                  <span className="font-bold text-wc-gold-600">${Math.floor(totalPool * 0.75).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2nd place (25%)</span>
                  <span className="font-bold text-gray-600">${Math.floor(totalPool * 0.25).toLocaleString()}</span>
                </div>
              </div>
            )}

            {feeError && <p className="text-xs text-red-500">{feeError}</p>}

            <button
              onClick={saveFee}
              disabled={feeSaving}
              className={`w-full py-2 text-sm font-semibold rounded-xl transition-colors ${
                feeSaved
                  ? 'bg-wc-green-100 text-wc-green-700'
                  : 'btn-primary'
              }`}
            >
              {feeSaving ? 'Saving…' : feeSaved ? '✓ Saved' : 'Save entry fee'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GroupSection sub-component ────────────────────────────────────────────────

function GroupSection({
  group,
  matches,
  matchStates,
  finishedCount,
  onFieldChange,
  onSave,
}: {
  group: { id: string; name: string; teams: string[] };
  matches: typeof GROUP_MATCHES;
  matchStates: Record<string, MatchEditState>;
  finishedCount: number;
  onFieldChange: (matchId: string, patch: Partial<MatchEditState>) => void;
  onSave: (matchId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-black text-gray-900">{group.name}</span>
          <span className="text-xs text-gray-400">{group.teams.join(' · ')}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400 font-semibold tabular-nums">
            {finishedCount}/{matches.length} done
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {matches.map((match) => {
            const s = matchStates[match.matchId];
            if (!s) return null;
            return (
              <MatchRow
                key={match.matchId}
                match={match}
                state={s}
                onChange={(patch) => onFieldChange(match.matchId, patch)}
                onSave={() => onSave(match.matchId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MatchRow sub-component ────────────────────────────────────────────────────

type GroupMatchType = typeof GROUP_MATCHES[number];

function MatchRow({
  match,
  state,
  onChange,
  onSave,
}: {
  match: GroupMatchType;
  state: MatchEditState;
  onChange: (patch: Partial<MatchEditState>) => void;
  onSave: () => void;
}) {
  function handleStatusToggle() {
    const next =
      state.status === 'scheduled' ? 'live'
      : state.status === 'live' ? 'finished'
      : 'scheduled';
    onChange({ status: next, saved: false });
  }

  return (
    <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-mono">#{match.matchNumber}</span>
          <span className="text-xs text-gray-400">{match.date}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-semibold text-sm text-gray-900 truncate">{match.home}</span>
          <span className="text-gray-400 text-xs font-semibold flex-shrink-0">vs</span>
          <span className="font-semibold text-sm text-gray-900 truncate">{match.away}</span>
        </div>
      </div>

      {/* Score inputs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          min="0"
          placeholder="—"
          value={state.homeGoals}
          onChange={(e) => onChange({ homeGoals: e.target.value, saved: false })}
          className="w-12 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-wc-blue-300"
        />
        <span className="text-gray-400 text-xs font-semibold">–</span>
        <input
          type="number"
          min="0"
          placeholder="—"
          value={state.awayGoals}
          onChange={(e) => onChange({ awayGoals: e.target.value, saved: false })}
          className="w-12 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-wc-blue-300"
        />
      </div>

      {/* Status toggle */}
      <button
        onClick={handleStatusToggle}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors flex-shrink-0 ${STATUS_COLORS[state.status]}`}
      >
        {STATUS_LABELS[state.status]}
      </button>

      {/* Save + feedback */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onSave}
          disabled={state.saving}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            state.saved
              ? 'bg-wc-green-100 text-wc-green-700'
              : 'btn-primary'
          }`}
        >
          {state.saving ? '…' : state.saved ? '✓ Saved' : 'Save'}
        </button>
        {state.error && <span className="text-xs text-red-500">{state.error}</span>}
      </div>
    </div>
  );
}
