'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GroupPicks } from '@/components/picks/GroupCard';
import GroupOverview from '@/components/picks/GroupOverview';
import GroupDetailModal from '@/components/picks/GroupDetailModal';
import KnockoutBracket from '@/components/picks/KnockoutBracket';
import { GROUPS, ALL_TEAMS } from '@/lib/worldcup-data';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface GroupPicksMap {
  [group: string]: GroupPicks;
}

interface BracketPicksMap {
  [key: string]: string; // "round-slot" -> team
}

export default function PicksPage() {
  const [groupPicks, setGroupPicks] = useState<GroupPicksMap>({});
  const [bracketPicks, setBracketPicks] = useState<BracketPicksMap>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Debounce timers per group / bracket key
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----------------------------------------------------------------
  // Initial data fetch
  // ----------------------------------------------------------------
  const fetchPicks = useCallback(async () => {
    try {
      const [groupRes, bracketRes] = await Promise.all([
        fetch('/api/picks/groups'),
        fetch('/api/picks/bracket'),
      ]);

      const groupData = await groupRes.json();
      if (groupData.picks) {
        setGroupPicks(groupData.picks as GroupPicksMap);
      }

      const bracketData = await bracketRes.json();
      if (bracketData.picks) {
        const map: BracketPicksMap = {};
        for (const p of bracketData.picks as { round: string; slot: number; team: string }[]) {
          map[`${p.round}-${p.slot}`] = p.team;
        }
        setBracketPicks(map);
      }
    } catch (err) {
      console.error('Error loading picks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPicks();
    return () => {
      // Cleanup debounce timers on unmount
      saveTimers.current.forEach((t) => clearTimeout(t));
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, [fetchPicks]);

  // ----------------------------------------------------------------
  // Toast helper
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // Group pick save (debounced 400ms)
  // ----------------------------------------------------------------
  function handleGroupChange(groupId: string, picks: GroupPicks) {
    setGroupPicks((prev) => ({ ...prev, [groupId]: picks }));

    const timerKey = `group-${groupId}`;
    const existing = saveTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);

    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/picks/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group: groupId, ...picks }),
        });
        if (res.ok) {
          showSaved();
        } else {
          showError();
        }
      } catch {
        showError();
      }
      saveTimers.current.delete(timerKey);
    }, 400);

    saveTimers.current.set(timerKey, t);
  }

  // ----------------------------------------------------------------
  // Group pick save from modal (immediate save)
  // ----------------------------------------------------------------
  async function handleGroupSave(groupId: string, picks: GroupPicks) {
    setGroupPicks((prev) => ({ ...prev, [groupId]: picks }));
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/picks/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: groupId, ...picks }),
      });
      if (res.ok) {
        showSaved();
      } else {
        showError();
      }
    } catch {
      showError();
    }
  }

  // ----------------------------------------------------------------
  // Bracket pick save (debounced 400ms per slot)
  // ----------------------------------------------------------------
  function handleBracketChange(round: string, slot: number, team: string) {
    const key = `${round}-${slot}`;
    setBracketPicks((prev) => ({ ...prev, [key]: team }));

    const timerKey = `bracket-${key}`;
    const existing = saveTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);

    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/picks/bracket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round, slot, team }),
        });
        if (res.ok) {
          showSaved();
        } else {
          showError();
        }
      } catch {
        showError();
      }
      saveTimers.current.delete(timerKey);
    }, 400);

    saveTimers.current.set(timerKey, t);
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-wc-green-300 text-lg animate-pulse">Loading picks...</div>
      </div>
    );
  }

  const groupsCompleted = GROUPS.filter((g) => !!groupPicks[g.id]).length;
  const bracketSlots = Object.keys(bracketPicks).length;

  return (
    <div className="space-y-8 pb-12">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My Picks</h1>
          <p className="text-wc-green-400 text-sm mt-1">
            {groupsCompleted}/12 groups ranked &middot; {bracketSlots} bracket slots filled
          </p>
        </div>

        {/* Save status toast */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-wc-green-300 animate-pulse">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-400 font-medium">Saved ✓</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-400 font-medium">Save failed</span>
          )}
        </div>
      </div>

      {/* ================================================================
          SECTION 1 — GROUP STAGE
          ================================================================ */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-wc-gold-400">Group Stage</h2>
          <p className="text-wc-green-400 text-sm mt-1">
            Click a group to rank teams 1st–4th. Top 2 qualify (green Q badge).
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-wc-green-500">
            <span>1st correct: <span className="text-wc-gold-400 font-semibold">+4 pts</span></span>
            <span>2nd correct: <span className="text-wc-gold-400 font-semibold">+3 pts</span></span>
            <span>3rd correct: <span className="text-wc-gold-400 font-semibold">+2 pts</span></span>
            <span>4th correct: <span className="text-wc-gold-400 font-semibold">+1 pt</span></span>
          </div>
        </div>

        <GroupOverview
          groups={GROUPS}
          allPicks={groupPicks}
          onSelectGroup={setSelectedGroup}
        />

        {selectedGroup && (
          <GroupDetailModal
            group={GROUPS.find((g) => g.id === selectedGroup)!}
            picks={groupPicks[selectedGroup] ?? null}
            onSave={(picks) => handleGroupSave(selectedGroup, picks)}
            onClose={() => setSelectedGroup(null)}
          />
        )}
      </section>

      {/* ================================================================
          SECTION 2 — KNOCKOUT BRACKET
          ================================================================ */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-wc-gold-400">Knockout Bracket</h2>
          <p className="text-wc-green-400 text-sm mt-1">
            Pick the winner of each round. Select the champion at the center.
          </p>
        </div>

        <div className="bg-wc-green-900/50 border border-wc-green-700 rounded-xl p-4">
          <KnockoutBracket
            picks={bracketPicks}
            onChange={handleBracketChange}
            locked={false}
            allTeams={ALL_TEAMS}
          />
        </div>
      </section>
    </div>
  );
}
