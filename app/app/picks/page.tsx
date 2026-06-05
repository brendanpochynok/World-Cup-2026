'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GroupOverview from '@/components/picks/GroupOverview';
import GroupDetailModal from '@/components/picks/GroupDetailModal';
import KnockoutBracket from '@/components/picks/KnockoutBracket';
import { GROUPS, GROUP_MATCHES, ALL_TEAMS, computeGroupStandings, getGroupMatches, getTeamMeta } from '@/lib/worldcup-data';
import type { MatchOdds } from '@/app/api/odds/route';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function PicksPage() {
  const [matchPicks, setMatchPicks] = useState<Record<string, string>>({});
  const [bracketPicks, setBracketPicks] = useState<Record<string, string>>({});
  const [oddsMap, setOddsMap] = useState<Record<string, MatchOdds>>({});
  const [kickoffTimes, setKickoffTimes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const bracketTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPicks = useCallback(async () => {
    try {
      const [groupRes, bracketRes, oddsRes] = await Promise.all([
        fetch('/api/picks/groups'),
        fetch('/api/picks/bracket'),
        fetch('/api/odds'),
      ]);
      const groupData = await groupRes.json();
      if (groupData.picks) setMatchPicks(groupData.picks);

      const bracketData = await bracketRes.json();
      if (bracketData.picks) {
        const map: Record<string, string> = {};
        for (const p of bracketData.picks as { round: string; slot: number; team: string }[]) {
          map[`${p.round}-${p.slot}`] = p.team;
        }
        setBracketPicks(map);
      }

      const oddsData = await oddsRes.json().catch(() => ({}));
      if (oddsData.odds) setOddsMap(oddsData.odds);
      if (oddsData.kickoffTimes) setKickoffTimes(oddsData.kickoffTimes);
    } catch (err) {
      console.error('Error loading picks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPicks();
    return () => {
      bracketTimers.current.forEach((t) => clearTimeout(t));
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, [fetchPicks]);

  function showSaved() {
    setSaveStatus('saved');
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
  }
  function showError() {
    setSaveStatus('error');
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
  }

  async function handleMatchPickChange(matchId: string, pick: string) {
    setMatchPicks((prev) => ({ ...prev, [matchId]: pick }));
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/picks/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, pick }),
      });
      res.ok ? showSaved() : showError();
    } catch {
      showError();
    }
  }

  async function handleClearAll() {
    setSaveStatus('saving');
    setMatchPicks({});
    setBracketPicks({});
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/picks/groups', { method: 'DELETE' }),
        fetch('/api/picks/bracket', { method: 'DELETE' }),
      ]);
      r1.ok && r2.ok ? showSaved() : showError();
    } catch {
      showError();
    }
  }

  async function handleAutoPick() {
    setSaveStatus('saving');
    const newPicks: Record<string, string> = {};

    for (let i = 0; i < GROUP_MATCHES.length; i++) {
      const match = GROUP_MATCHES[i];
      if (matchPicks[match.matchId]) continue;

      const odds = oddsMap[match.matchId];
      let pick: string;

      if (odds) {
        if (odds.home >= odds.draw && odds.home >= odds.away) pick = 'home';
        else if (odds.away >= odds.draw) pick = 'away';
        else pick = 'draw';
      } else {
        const homeRank = getTeamMeta(match.home).fifaRank;
        const awayRank = getTeamMeta(match.away).fifaRank;
        pick = homeRank <= awayRank ? 'home' : 'away';
      }
      newPicks[match.matchId] = pick;
    }

    if (Object.keys(newPicks).length === 0) { setSaveStatus('idle'); return; }

    setMatchPicks((prev) => ({ ...prev, ...newPicks }));
    try {
      const responses = await Promise.all(
        Object.entries(newPicks).map(([matchId, pick]) =>
          fetch('/api/picks/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, pick }),
          })
        )
      );
      responses.every((r) => r.ok) ? showSaved() : showError();
    } catch {
      showError();
    }
  }

  function handleBracketChange(round: string, slot: number, team: string) {
    const key = `${round}-${slot}`;
    setBracketPicks((prev) => ({ ...prev, [key]: team }));
    const timerKey = `bracket-${key}`;
    const existing = bracketTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);
    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/picks/bracket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round, slot, team }),
        });
        res.ok ? showSaved() : showError();
      } catch { showError(); }
      bracketTimers.current.delete(timerKey);
    }, 400);
    bracketTimers.current.set(timerKey, t);
  }

  const advancementScores = useMemo((): Record<string, number> => {
    const scores: Record<string, number> = {};
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const g = GROUPS[gi];
      const matches = getGroupMatches(g.id);
      for (let ti = 0; ti < g.teams.length; ti++) {
        const team = g.teams[ti];
        let expected = 0;
        let hasOdds = false;
        for (let mi = 0; mi < matches.length; mi++) {
          const m = matches[mi];
          if (m.home !== team && m.away !== team) continue;
          const odds = oddsMap[m.matchId];
          if (!odds) continue;
          hasOdds = true;
          expected += m.home === team
            ? 3 * odds.home + odds.draw
            : 3 * odds.away + odds.draw;
        }
        if (hasOdds) scores[team] = expected;
      }
    }
    return scores;
  }, [oddsMap]);

  const r32Teams = useMemo((): Record<number, [string, string]> => {
    const standings: Record<string, string[]> = {};
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const g = GROUPS[gi];
      const matches = getGroupMatches(g.id);
      const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;
      if (pickedCount === matches.length) {
        const rows = computeGroupStandings(g.id, matchPicks, advancementScores);
        standings[g.id] = rows.map((r) => r.team);
      }
    }

    const result: Record<number, [string, string]> = {};

    function team(groupId: string, pos: number): string | null {
      return standings[groupId] ? standings[groupId][pos] ?? null : null;
    }

    const leftPairs: [string, number, string, number][] = [
      ['A', 0, 'B', 1], ['C', 0, 'D', 1], ['E', 0, 'F', 1],
      ['G', 0, 'H', 1], ['I', 0, 'J', 1], ['K', 0, 'L', 1],
    ];
    for (let i = 0; i < leftPairs.length; i++) {
      const [g1, p1, g2, p2] = leftPairs[i];
      const t1 = team(g1, p1); const t2 = team(g2, p2);
      if (t1 && t2) result[i] = [t1, t2];
    }

    const rightPairs: [string, number, string, number][] = [
      ['A', 1, 'B', 0], ['C', 1, 'D', 0], ['E', 1, 'F', 0],
      ['G', 1, 'H', 0], ['I', 1, 'J', 0], ['K', 1, 'L', 0],
    ];
    for (let i = 0; i < rightPairs.length; i++) {
      const [g1, p1, g2, p2] = rightPairs[i];
      const t1 = team(g1, p1); const t2 = team(g2, p2);
      if (t1 && t2) result[8 + i] = [t1, t2];
    }

    const allGroupsDone = GROUPS.every((g) => standings[g.id]);
    if (allGroupsDone) {
      const thirds: { team: string; pts: number }[] = [];
      for (let gi = 0; gi < GROUPS.length; gi++) {
        const rows = computeGroupStandings(GROUPS[gi].id, matchPicks, advancementScores);
        if (rows[2]) thirds.push({ team: rows[2].team, pts: rows[2].pts });
      }
      thirds.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const sa = advancementScores[a.team];
        const sb = advancementScores[b.team];
        if (sa !== undefined && sb !== undefined && sa !== sb) return sb - sa;
        return getTeamMeta(a.team).fifaRank - getTeamMeta(b.team).fifaRank;
      });
      if (thirds[0] && thirds[1]) result[6]  = [thirds[0].team, thirds[1].team];
      if (thirds[2] && thirds[3]) result[7]  = [thirds[2].team, thirds[3].team];
      if (thirds[4] && thirds[5]) result[14] = [thirds[4].team, thirds[5].team];
      if (thirds[6] && thirds[7]) result[15] = [thirds[6].team, thirds[7].team];
    }

    return result;
  }, [matchPicks, advancementScores]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <svg className="w-8 h-8 text-wc-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-gray-500 text-sm font-medium">Loading your picks…</span>
      </div>
    );
  }

  const totalMatches = GROUP_MATCHES.length;
  const pickedMatches = Object.keys(matchPicks).length;
  const bracketSlots = Object.keys(bracketPicks).length;

  return (
    <div className="space-y-8 pb-12">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">FIFA World Cup 2026™</p>
          <h1 className="text-3xl font-black text-gray-900">My Picks</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            <span className="text-gray-900 font-semibold">{pickedMatches}</span>
            <span className="text-gray-400">/{totalMatches}</span>
            {' '}group matches
            <span className="text-gray-300 mx-2">·</span>
            <span className="text-gray-900 font-semibold">{bracketSlots}</span> bracket slots
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-wc-green-600 font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-wc-red-500 font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Save failed
            </span>
          )}

          <button
            onClick={handleAutoPick}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto-pick
          </button>

          <button
            onClick={handleClearAll}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-wc-red-500 hover:text-wc-red-600 text-xs font-bold transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear all
          </button>
        </div>
      </div>

      {/* ─── Group Stage ─── */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-black text-gray-900">Group Stage</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Click any group to pick match results · Top 2 + 8 best 3rd-place advance
          </p>
        </div>

        <GroupOverview
          groups={GROUPS}
          matchPicks={matchPicks}
          onSelectGroup={setSelectedGroup}
        />

        {selectedGroup && (
          <GroupDetailModal
            group={GROUPS.find((g) => g.id === selectedGroup)!}
            matchPicks={matchPicks}
            onPickChange={handleMatchPickChange}
            onClose={() => setSelectedGroup(null)}
            oddsMap={oddsMap}
            kickoffTimes={kickoffTimes}
            advancementScores={advancementScores}
          />
        )}
      </section>

      {/* ─── Knockout Bracket ─── */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-black text-gray-900">Knockout Bracket</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Pick winners each round · R32=2 · R16=3 · QF=5 · SF=8 · Final=13 · Champion=20 pts
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
          <KnockoutBracket
            picks={bracketPicks}
            onChange={handleBracketChange}
            locked={false}
            allTeams={ALL_TEAMS}
            r32Teams={r32Teams}
          />
        </div>
      </section>
    </div>
  );
}
