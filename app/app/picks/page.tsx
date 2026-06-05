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
  const [tiebreakerPicks, setTiebreakerPicks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const bracketTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved picks on mount
  const fetchPicks = useCallback(async () => {
    try {
      const [groupRes, bracketRes, oddsRes, tbRes] = await Promise.all([
        fetch('/api/picks/groups'),
        fetch('/api/picks/bracket'),
        fetch('/api/odds'),
        fetch('/api/picks/tiebreakers'),
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

      const tbData = await tbRes.json().catch(() => ({}));
      if (tbData.picks) setTiebreakerPicks(tbData.picks);
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

  // Save a single match pick immediately on click
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

  // Clear all picks
  async function handleClearAll() {
    setSaveStatus('saving');
    setMatchPicks({});
    setBracketPicks({});
    setTiebreakerPicks({});
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/picks/groups', { method: 'DELETE' }),
        fetch('/api/picks/bracket', { method: 'DELETE' }),
        fetch('/api/picks/tiebreakers', { method: 'DELETE' }),
      ]);
      r1.ok && r2.ok && r3.ok ? showSaved() : showError();
    } catch {
      showError();
    }
  }

  async function handleTiebreakerChange(groupId: string, teamOrder: string[]) {
    setTiebreakerPicks((prev) => ({ ...prev, [groupId]: teamOrder }));
    try {
      await fetch('/api/picks/tiebreakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, teamOrder }),
      });
    } catch {
      // non-critical — state is already updated
    }
  }

  // Auto-pick favourites: pick the highest-probability outcome for each unpicked match
  async function handleAutoPick() {
    setSaveStatus('saving');
    const newPicks: Record<string, string> = {};

    for (let i = 0; i < GROUP_MATCHES.length; i++) {
      const match = GROUP_MATCHES[i];
      if (matchPicks[match.matchId]) continue; // already picked

      const odds = oddsMap[match.matchId];
      let pick: string;

      if (odds) {
        if (odds.home >= odds.draw && odds.home >= odds.away) pick = 'home';
        else if (odds.away >= odds.draw) pick = 'away';
        else pick = 'draw';
      } else {
        // Fall back to FIFA ranking (lower number = stronger team)
        const homeRank = getTeamMeta(match.home).fifaRank;
        const awayRank = getTeamMeta(match.away).fifaRank;
        pick = homeRank <= awayRank ? 'home' : 'away';
      }
      newPicks[match.matchId] = pick;
    }

    if (Object.keys(newPicks).length === 0) {
      setSaveStatus('idle');
      return;
    }

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

  // Bracket picks debounced 400ms
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

  // Derive R32 matchups from completed group picks.
  // Only populates a slot when both contributing groups are fully picked.
  const r32Teams = useMemo((): Record<number, [string, string]> => {
    // Compute standings for every group. Track which groups are complete.
    const standings: Record<string, string[]> = {};
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const g = GROUPS[gi];
      const matches = getGroupMatches(g.id);
      const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;
      if (pickedCount === matches.length) {
        const rows = computeGroupStandings(g.id, matchPicks, tiebreakerPicks[g.id]);
        standings[g.id] = rows.map((r) => r.team);
      }
    }

    const result: Record<number, [string, string]> = {};

    // Helper: place team from standings — position 0=1st, 1=2nd, 2=3rd
    function team(groupId: string, pos: number): string | null {
      return standings[groupId] ? standings[groupId][pos] ?? null : null;
    }

    // Slots 0-5: left half fixed matchups
    const leftPairs: [string, number, string, number][] = [
      ['A', 0, 'B', 1], // slot 0: 1A vs 2B
      ['C', 0, 'D', 1], // slot 1: 1C vs 2D
      ['E', 0, 'F', 1], // slot 2: 1E vs 2F
      ['G', 0, 'H', 1], // slot 3: 1G vs 2H
      ['I', 0, 'J', 1], // slot 4: 1I vs 2J
      ['K', 0, 'L', 1], // slot 5: 1K vs 2L
    ];
    for (let i = 0; i < leftPairs.length; i++) {
      const [g1, p1, g2, p2] = leftPairs[i];
      const t1 = team(g1, p1);
      const t2 = team(g2, p2);
      if (t1 && t2) result[i] = [t1, t2];
    }

    // Slots 8-13: right half fixed matchups
    const rightPairs: [string, number, string, number][] = [
      ['A', 1, 'B', 0], // slot 8:  2A vs 1B
      ['C', 1, 'D', 0], // slot 9:  2C vs 1D
      ['E', 1, 'F', 0], // slot 10: 2E vs 1F
      ['G', 1, 'H', 0], // slot 11: 2G vs 1H
      ['I', 1, 'J', 0], // slot 12: 2I vs 1J
      ['K', 1, 'L', 0], // slot 13: 2K vs 1L
    ];
    for (let i = 0; i < rightPairs.length; i++) {
      const [g1, p1, g2, p2] = rightPairs[i];
      const t1 = team(g1, p1);
      const t2 = team(g2, p2);
      if (t1 && t2) result[8 + i] = [t1, t2];
    }

    // Slots 6, 7, 14, 15: best 3rd-place teams (need all 12 groups complete)
    const allGroupsDone = GROUPS.every((g) => standings[g.id]);
    if (allGroupsDone) {
      const thirds: { team: string; pts: number }[] = [];
      for (let gi = 0; gi < GROUPS.length; gi++) {
        const g = GROUPS[gi];
        const rows = computeGroupStandings(g.id, matchPicks);
        if (rows[2]) {
          thirds.push({ team: rows[2].team, pts: rows[2].pts });
        }
      }
      thirds.sort((a, b) => b.pts - a.pts);
      // Assign pairs: slots 6&7 = best 3rd #1 vs #2, slots 14&15 = #3 vs #4
      if (thirds[0] && thirds[1]) result[6] = [thirds[0].team, thirds[1].team];
      if (thirds[2] && thirds[3]) result[7] = [thirds[2].team, thirds[3].team];
      if (thirds[4] && thirds[5]) result[14] = [thirds[4].team, thirds[5].team];
      if (thirds[6] && thirds[7]) result[15] = [thirds[6].team, thirds[7].team];
    }

    return result;
  }, [matchPicks, tiebreakerPicks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-300 text-lg animate-pulse">Loading picks...</div>
      </div>
    );
  }

  const totalMatches = GROUP_MATCHES.length;
  const pickedMatches = Object.keys(matchPicks).length;
  const bracketSlots = Object.keys(bracketPicks).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My Picks</h1>
          <p className="text-green-400 text-sm mt-1">
            {pickedMatches}/{totalMatches} group matches · {bracketSlots} bracket slots
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {saveStatus === 'saving' && <span className="text-green-300 animate-pulse">Saving...</span>}
          {saveStatus === 'saved'  && <span className="text-green-400 font-medium">Saved ✓</span>}
          {saveStatus === 'error'  && <span className="text-red-400 font-medium">Save failed</span>}
          <button
            onClick={handleAutoPick}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            Auto-pick favourites
          </button>
          <button
            onClick={handleClearAll}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 disabled:opacity-50 text-red-300 hover:text-white text-xs font-semibold transition-colors border border-red-800"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Group Stage */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-yellow-400">Group Stage</h2>
          <p className="text-green-400 text-sm mt-1">
            Click a group to pick each match. Top 2 + 8 best 3rd-place teams advance to Round of 32.
          </p>
          <div className="mt-2 text-xs text-green-500">
            Correct: <span className="text-yellow-400 font-semibold">+1 pt</span>
            <span className="mx-1.5">·</span>
            Wrong: <span className="text-red-400 font-semibold">-1 pt</span>
          </div>
        </div>

        <GroupOverview
          groups={GROUPS}
          matchPicks={matchPicks}
          tiebreakerPicks={tiebreakerPicks}
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
            tiebreakerOrder={tiebreakerPicks[selectedGroup]}
            onTiebreakerChange={(order) => handleTiebreakerChange(selectedGroup, order)}
          />
        )}
      </section>

      {/* Knockout Bracket */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-yellow-400">Knockout Bracket</h2>
          <p className="text-green-400 text-sm mt-1">
            Pick the winner of each round. R32=2pts · R16=3pts · QF=5pts · SF=8pts · Final=13pts · Champion=20pts
          </p>
        </div>
        <div className="bg-green-900/50 border border-green-700 rounded-xl p-4">
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
