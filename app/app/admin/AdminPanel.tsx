'use client';

import { useState, useTransition } from 'react';
import { GROUP_MATCHES, GROUPS, ALL_TEAMS, BRACKET_ROUNDS } from '@/lib/worldcup-data';
import { calculatePayouts } from '@/lib/payouts';
import TrophyIcon from '@/components/TrophyIcon';
import BracketView from '@/components/BracketView';
import KnockoutBracket from '@/components/picks/KnockoutBracket';

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

interface TrophyRow {
  id: number;
  poolName: string;
  year: number;
  position: number;
  trophyImage: string | null;
  awardedAt: string;
  user: { username: string; displayName: string | null };
}

interface PlayerRow {
  username: string;
  displayName: string | null;
  lastSeenAt: string | null;
}

interface KnockoutFixtureRow {
  round: string;
  slot: number;
  home: string | null;
  away: string | null;
  kickoff: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

interface Props {
  matchResults: MatchResultRow[];
  bracketResults: BracketResultRow[];
  knockoutMatches: KnockoutFixtureRow[];
  entryFee: number;
  playerCount: number;
  users: { username: string; displayName: string | null; entriesCount: number; bracketUnlocked: boolean; bracketInvalid: boolean }[];
  players: PlayerRow[];
}

type Tab = 'results' | 'bracket' | 'knockout' | 'brackets' | 'pool' | 'trophies' | 'activity';

// R32 slot labels mirror the bracket order so the admin knows which matchup
// each row feeds.
const R32_SLOT_LABELS = [
  '1I vs 3rd', '1E vs 3rd', '2A vs 2B', '1F vs 2C', '2E vs 2I', '1C vs 2F', '1A vs 3rd', '1L vs 3rd',
  '2K vs 2L', '1H vs 2J', '1G vs 3rd', '1D vs 3rd', '1J vs 2H', '2D vs 2G', '1K vs 3rd', '1B vs 3rd',
];

// R32 fixtures provided by the admin, in bracket order (slot 0–15). Kickoffs are
// local datetime-input values (admin's timezone). The live first game gets a
// past placeholder so it locks; adjust any of these in the rows before saving.
const SUGGESTED_R32: { home: string; away: string; kickoff: string }[] = [
  // Left half (slots 0–7), top to bottom per the official bracket
  { home: 'Germany', away: 'Paraguay', kickoff: '2026-06-29T14:30' },
  { home: 'France', away: 'Sweden', kickoff: '2026-06-30T15:00' },
  { home: 'South Africa', away: 'Canada', kickoff: '2026-06-28T10:00' },
  { home: 'Netherlands', away: 'Morocco', kickoff: '2026-06-29T19:00' },
  { home: 'Portugal', away: 'Croatia', kickoff: '2026-07-02T17:00' },
  { home: 'Spain', away: 'Austria', kickoff: '2026-07-02T13:00' },
  { home: 'United States', away: 'Bosnia and Herzegovina', kickoff: '2026-07-01T18:00' },
  { home: 'Belgium', away: 'Senegal', kickoff: '2026-07-01T14:00' },
  // Right half (slots 8–15), top to bottom
  { home: 'Brazil', away: 'Japan', kickoff: '2026-06-29T11:00' },
  { home: "Cote d'Ivoire", away: 'Norway', kickoff: '2026-06-30T11:00' },
  { home: 'Mexico', away: 'Ecuador', kickoff: '2026-06-30T19:00' },
  { home: 'England', away: 'DR Congo', kickoff: '2026-07-01T10:00' },
  { home: 'Argentina', away: 'Cabo Verde', kickoff: '2026-07-03T16:00' },
  { home: 'Australia', away: 'Egypt', kickoff: '2026-07-03T12:00' },
  { home: 'Switzerland', away: 'Algeria', kickoff: '2026-07-02T21:00' },
  { home: 'Colombia', away: 'Ghana', kickoff: '2026-07-03T19:30' },
];

// "2026-06-29T18:00:00.000Z" → "2026-06-29T12:00" for a datetime-local input
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

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

export default function AdminPanel({ matchResults, bracketResults, knockoutMatches, entryFee, playerCount, users, players }: Props) {
  const [tab, setTab] = useState<Tab>('results');

  // ── knockout R32 fixtures state ───────────────────────────────────────────
  type KoRow = { home: string; away: string; kickoff: string; homeScore: string; awayScore: string };
  const [koRows, setKoRows] = useState<Record<number, KoRow>>(() => {
    const init: Record<number, KoRow> = {};
    for (let slot = 0; slot < 16; slot++) {
      const m = knockoutMatches.find((k) => k.round === 'R32' && k.slot === slot);
      init[slot] = {
        home: m?.home ?? '', away: m?.away ?? '', kickoff: isoToLocalInput(m?.kickoff ?? null),
        homeScore: m?.homeScore != null ? String(m.homeScore) : '',
        awayScore: m?.awayScore != null ? String(m.awayScore) : '',
      };
    }
    return init;
  });
  const [koSaving, setKoSaving] = useState<number | null>(null);
  const [koMsg, setKoMsg] = useState<{ slot: number; ok: boolean } | null>(null);
  const [savingAll, setSavingAll] = useState<{ done: number; total: number } | null>(null);

  // ── bulk "give everyone a pick" ──
  const [bulkSlot, setBulkSlot] = useState(0);
  const [bulkTeam, setBulkTeam] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function applyBulkPick() {
    if (!bulkTeam) { setBulkMsg({ ok: false, text: 'Pick a team first.' }); return; }
    if (!confirm(`Set every player's pick for R32 slot ${bulkSlot + 1} to ${bulkTeam}? This overwrites their current pick for that game.`)) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const res = await fetch('/api/admin/bracket-pick-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: 'R32', slot: bulkSlot, team: bulkTeam }),
      });
      const j = await res.json().catch(() => ({}));
      setBulkMsg(res.ok
        ? { ok: true, text: `Applied ${bulkTeam} to ${j.count ?? 'all'} player entries.` }
        : { ok: false, text: j.error ?? 'Failed' });
    } catch {
      setBulkMsg({ ok: false, text: 'Failed' });
    } finally {
      setBulkBusy(false);
    }
  }

  function setKoField(slot: number, patch: Partial<KoRow>) {
    setKoRows((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
  }

  function koBody(slot: number) {
    const row = koRows[slot];
    const hs = row.homeScore.trim() === '' ? null : parseInt(row.homeScore, 10);
    const as = row.awayScore.trim() === '' ? null : parseInt(row.awayScore, 10);
    return {
      round: 'R32', slot,
      home: row.home || null,
      away: row.away || null,
      kickoff: row.kickoff ? new Date(row.kickoff).toISOString() : null,
      homeScore: hs != null && !isNaN(hs) ? hs : null,
      awayScore: as != null && !isNaN(as) ? as : null,
    };
  }

  function loadSuggestedR32() {
    const init: Record<number, KoRow> = {};
    SUGGESTED_R32.forEach((f, slot) => { init[slot] = { ...f, homeScore: '', awayScore: '' }; });
    setKoRows(init);
    setKoMsg(null);
  }

  async function saveAllKo() {
    const rows = Array.from({ length: 16 }, (_, slot) => ({ slot, ...koRows[slot] }))
      .filter((r) => r.home && r.away);
    setSavingAll({ done: 0, total: rows.length });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await fetch('/api/admin/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(koBody(r.slot)),
      }).catch(() => null);
      setSavingAll({ done: i + 1, total: rows.length });
    }
    setTimeout(() => setSavingAll(null), 1500);
  }

  async function saveKo(slot: number) {
    setKoSaving(slot);
    setKoMsg(null);
    try {
      const res = await fetch('/api/admin/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(koBody(slot)),
      });
      setKoMsg({ slot, ok: res.ok });
    } catch {
      setKoMsg({ slot, ok: false });
    } finally {
      setKoSaving(null);
    }
  }

  // ── view-everyone's-brackets state ────────────────────────────────────────
  const [viewUser, setViewUser] = useState('');
  const [viewEntry, setViewEntry] = useState(1);
  const [viewPicks, setViewPicks] = useState<{ round: string; slot: number; team: string }[] | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Per-user bracket unlock (exempts a player from the midnight deadline)
  const [unlockMap, setUnlockMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(users.map((u) => [u.username, u.bracketUnlocked]))
  );
  const [unlockBusy, setUnlockBusy] = useState(false);

  // Per-user "bracket invalid" flag — shows a badge by their name on standings
  const [invalidMap, setInvalidMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(users.map((u) => [u.username, u.bracketInvalid])),
  );
  const [invalidBusy, setInvalidBusy] = useState(false);

  async function toggleInvalid(username: string) {
    const next = !invalidMap[username];
    setInvalidBusy(true);
    try {
      const res = await fetch('/api/admin/bracket-invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, invalid: next }),
      });
      if (res.ok) setInvalidMap((m) => ({ ...m, [username]: next }));
    } catch { /* ignore */ } finally {
      setInvalidBusy(false);
    }
  }

  async function toggleUnlock(username: string) {
    const next = !unlockMap[username];
    setUnlockBusy(true);
    try {
      const res = await fetch('/api/admin/unlock-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, unlocked: next }),
      });
      if (res.ok) setUnlockMap((m) => ({ ...m, [username]: next }));
    } catch { /* ignore */ } finally {
      setUnlockBusy(false);
    }
  }

  async function loadPlayerBracket(username: string, entry: number) {
    if (!username) { setViewPicks(null); return; }
    setViewLoading(true);
    setOverrideMode(false);
    try {
      const res = await fetch(`/api/admin/player-bracket?username=${encodeURIComponent(username)}&entry=${entry}`);
      const j = await res.json().catch(() => ({}));
      setViewPicks(Array.isArray(j.picks) ? j.picks : []);
    } catch {
      setViewPicks([]);
    } finally {
      setViewLoading(false);
    }
  }

  // ── admin bracket override (manually fix an invalid bracket) ───────────────
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideBusy, setOverrideBusy] = useState(false);

  // Actual R32 matchups, so the override editor shows real opponents.
  const adminR32 = (() => {
    const out: Record<number, [string, string]> = {};
    for (const k of knockoutMatches) {
      if (k.round === 'R32' && k.home && k.away) out[k.slot] = [k.home, k.away];
    }
    return out;
  })();

  const viewPicksMap: Record<string, string> = Object.fromEntries(
    (viewPicks ?? []).map((p) => [`${p.round}-${p.slot}`, p.team]),
  );

  async function handleOverridePick(round: string, slot: number, team: string) {
    if (!viewUser) return;
    // Optimistic local update so the editor stays responsive.
    setViewPicks((prev) => {
      const next = (prev ?? []).filter((p) => !(p.round === round && p.slot === slot));
      next.push({ round, slot, team });
      return next;
    });
    setOverrideBusy(true);
    try {
      await fetch('/api/admin/player-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: viewUser, entry: viewEntry, round, slot, team }),
      });
    } catch { /* ignore */ } finally {
      setOverrideBusy(false);
    }
  }

  async function clearPlayerBracket() {
    if (!viewUser) return;
    if (!confirm(`Clear ${viewUser}'s entire bracket (entry ${viewEntry})? They can refill it once unlocked.`)) return;
    setOverrideBusy(true);
    try {
      const res = await fetch(
        `/api/admin/player-bracket?username=${encodeURIComponent(viewUser)}&entry=${viewEntry}`,
        { method: 'DELETE' },
      );
      if (res.ok) setViewPicks([]);
    } catch { /* ignore */ } finally {
      setOverrideBusy(false);
    }
  }

  // ── password reset state ──────────────────────────────────────────────────
  const [resetUser, setResetUser] = useState('');
  const [resetPw, setResetPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function resetPassword() {
    if (!resetUser || resetPw.length < 6) {
      setResetMsg({ ok: false, text: 'Pick a player and a password of at least 6 characters.' });
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUser, newPassword: resetPw }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetMsg({ ok: true, text: `Password updated for ${resetUser}. Send it to them and have them change it in Profile.` });
        setResetPw('');
      } else {
        setResetMsg({ ok: false, text: j.error ?? 'Failed to reset password' });
      }
    } catch {
      setResetMsg({ ok: false, text: 'Failed to reset password' });
    } finally {
      setResetting(false);
    }
  }

  // ── trophies state ────────────────────────────────────────────────────────
  const [trophies, setTrophies] = useState<TrophyRow[]>([]);
  const [trophiesLoaded, setTrophiesLoaded] = useState(false);
  const [trophyUsername, setTrophyUsername] = useState('');
  const [trophyPool, setTrophyPool] = useState('');
  const [trophyYear, setTrophyYear] = useState(String(new Date().getFullYear()));
  const [trophyPosition, setTrophyPosition] = useState('1');
  const [trophyImage, setTrophyImage] = useState('');
  const [trophySaving, setTrophySaving] = useState(false);
  const [trophyMsg, setTrophyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadTrophies() {
    const res = await fetch('/api/admin/trophies');
    if (res.ok) {
      const j = await res.json();
      setTrophies(j.wins.map((w: TrophyRow) => ({ ...w, awardedAt: w.awardedAt })));
      setTrophiesLoaded(true);
    }
  }

  async function handleTrophyTab() {
    setTab('trophies');
    if (!trophiesLoaded) await loadTrophies();
  }

  async function awardTrophy() {
    if (!trophyUsername || !trophyPool || !trophyYear) {
      setTrophyMsg({ ok: false, text: 'Username, pool name and year are required.' });
      return;
    }
    setTrophySaving(true);
    setTrophyMsg(null);
    const res = await fetch('/api/admin/trophies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: trophyUsername,
        poolName: trophyPool,
        year: Number(trophyYear),
        position: Number(trophyPosition) || 1,
        trophyImage: trophyImage || null,
      }),
    });
    if (res.ok) {
      setTrophyMsg({ ok: true, text: 'Trophy awarded.' });
      setTrophyUsername('');
      setTrophyPool('');
      setTrophyImage('');
      setTrophyPosition('1');
      await loadTrophies();
    } else {
      const j = await res.json().catch(() => ({}));
      setTrophyMsg({ ok: false, text: j.error ?? 'Award failed.' });
    }
    setTrophySaving(false);
  }

  async function deleteTrophy(id: number) {
    if (!confirm('Delete this trophy?')) return;
    const res = await fetch('/api/admin/trophies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setTrophies((prev) => prev.filter((t) => t.id !== id));
  }
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; unmatched: string[] } | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillResult, setAutoFillResult] = useState<{ filled: number; message?: string } | null>(null);

  // ── seed ──────────────────────────────────────────────────────────────────

  async function handleSeed() {
    startSeeding(async () => {
      await fetch('/api/admin/seed', { method: 'POST' });
      window.location.reload();
    });
  }

  // ── Auto-fill missing picks ───────────────────────────────────────────────

  async function handleAutoFill() {
    setAutoFilling(true);
    setAutoFillResult(null);
    try {
      const res = await fetch('/api/admin/auto-picks', { method: 'POST' });
      const j = await res.json();
      setAutoFillResult({ filled: j.filled ?? 0, message: j.message });
    } finally {
      setAutoFilling(false);
    }
  }

  // ── ESPN sync ─────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync-results', { method: 'POST' });
      const j = await res.json();
      setSyncResult({ synced: j.synced ?? 0, unmatched: j.unmatched ?? [] });
      if ((j.synced ?? 0) > 0) window.location.reload();
    } finally {
      setSyncing(false);
    }
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
  const [prize1st, prize2nd] = calculatePayouts(totalPool);

  // ── render ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; onClick?: () => void; badge?: number }[] = [
    { id: 'results', label: 'Match Results' },
    { id: 'knockout', label: 'R32 Setup' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'brackets', label: 'View Brackets' },
    { id: 'pool', label: 'Pool Config' },
    { id: 'trophies', label: 'Trophies', onClick: handleTrophyTab },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-end gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tournament Management</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={t.onClick ?? (() => setTab(t.id))}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
              tab === t.id
                ? 'text-wc-blue-500'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {t.badge}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 inset-x-0 h-[2px] bg-wc-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Match Results ── */}
      {tab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-gray-500 flex-1">
              Use <strong>Sync from ESPN</strong> to auto-fill finished results. Manual entry below as a fallback.
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-primary text-xs whitespace-nowrap flex items-center gap-1.5"
              >
                {syncing ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Syncing…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync from ESPN
                  </>
                )}
              </button>
              <button
                onClick={handleAutoFill}
                disabled={autoFilling}
                className="btn-secondary text-xs whitespace-nowrap flex items-center gap-1.5"
                title="Auto-pick the FIFA-ranked favourite for any player who missed a locked match"
              >
                {autoFilling ? 'Filling…' : 'Auto-fill missing picks'}
              </button>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                {seeding ? 'Seeding…' : 'Seed 72 matches'}
              </button>
            </div>
          </div>

          {syncResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              syncResult.synced > 0 ? 'bg-wc-green-50 border border-wc-green-200 text-wc-green-700'
              : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}>
              {syncResult.synced > 0
                ? `✓ Synced ${syncResult.synced} finished match${syncResult.synced !== 1 ? 'es' : ''} from ESPN.`
                : 'No new finished matches found on ESPN.'}
              {syncResult.unmatched.length > 0 && (
                <span className="block text-xs text-gray-400 mt-1">
                  Could not match: {syncResult.unmatched.join(', ')}
                </span>
              )}
            </div>
          )}

          {autoFillResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              autoFillResult.filled > 0
                ? 'bg-wc-blue-50 border border-wc-blue-200 text-wc-blue-700'
                : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}>
              {autoFillResult.message
                ? autoFillResult.message
                : autoFillResult.filled > 0
                  ? `✓ Auto-filled ${autoFillResult.filled} missing pick${autoFillResult.filled !== 1 ? 's' : ''} with the FIFA-ranked favourite.`
                  : 'No missing picks — all players have picked every locked match.'}
            </div>
          )}

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

      {/* ── Tab: R32 Setup ── */}
      {tab === 'knockout' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Round of 32 fixtures</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Set the two teams and kickoff for each R32 matchup. Enter a final score to mark a game finished —
              that shows the result on the scores page and records the winner (use this if a game finished before
              ESPN was tracked). Leave scores blank for unplayed games.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadSuggestedR32} className="btn-secondary text-xs px-3 py-1.5">
              Load these 16 R32 games
            </button>
            <button
              onClick={saveAllKo}
              disabled={!!savingAll}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              {savingAll ? `Saving ${savingAll.done}/${savingAll.total}…` : 'Save all'}
            </button>
            {savingAll && savingAll.done === savingAll.total && (
              <span className="text-xs text-wc-green-600 font-semibold">All saved ✓</span>
            )}
            <span className="text-[11px] text-gray-400">
              Loads your matchups + times (review, then Save all). The live first game is set to lock.
            </span>
          </div>
          <div className="card p-0 overflow-hidden divide-y divide-gray-100">
            {Array.from({ length: 16 }, (_, slot) => {
              const row = koRows[slot];
              const saved = koMsg?.slot === slot;
              return (
                <div key={slot} className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-28 flex-shrink-0">
                    R32 · {R32_SLOT_LABELS[slot]}
                  </span>
                  <select
                    value={row.home}
                    onChange={(e) => setKoField(slot, { home: e.target.value })}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300"
                  >
                    <option value="">Home…</option>
                    {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-300 text-xs hidden lg:inline">vs</span>
                  <select
                    value={row.away}
                    onChange={(e) => setKoField(slot, { away: e.target.value })}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300"
                  >
                    <option value="">Away…</option>
                    {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="datetime-local"
                    value={row.kickoff}
                    onChange={(e) => setKoField(slot, { kickoff: e.target.value })}
                    className="text-sm px-2 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-wc-blue-300"
                  />
                  <div className="flex items-center gap-1" title="Final score (leave blank if not played)">
                    <input
                      type="number" min={0} inputMode="numeric"
                      value={row.homeScore}
                      onChange={(e) => setKoField(slot, { homeScore: e.target.value })}
                      placeholder="–"
                      className="w-12 text-sm text-center px-1 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-wc-blue-300"
                    />
                    <span className="text-gray-300 text-xs">-</span>
                    <input
                      type="number" min={0} inputMode="numeric"
                      value={row.awayScore}
                      onChange={(e) => setKoField(slot, { awayScore: e.target.value })}
                      placeholder="–"
                      className="w-12 text-sm text-center px-1 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-wc-blue-300"
                    />
                  </div>
                  <button
                    onClick={() => saveKo(slot)}
                    disabled={koSaving === slot}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 whitespace-nowrap"
                  >
                    {koSaving === slot ? 'Saving…' : saved && koMsg?.ok ? 'Saved ✓' : 'Save'}
                  </button>
                  {saved && !koMsg?.ok && <span className="text-xs text-wc-red-500 font-semibold">Failed</span>}
                </div>
              );
            })}
          </div>

          {/* Give every player the same pick for one game (e.g. a stranded matchup) */}
          <div className="card space-y-3">
            <div>
              <h2 className="font-bold text-gray-900">Give all players a pick</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Force one R32 game&rsquo;s pick for everyone — use this for a game whose pick got stranded.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={bulkSlot}
                onChange={(e) => { setBulkSlot(Number(e.target.value)); setBulkTeam(''); setBulkMsg(null); }}
                className="flex-1 text-sm px-2 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300"
              >
                {Array.from({ length: 16 }, (_, slot) => {
                  const r = koRows[slot];
                  const lbl = r.home && r.away ? `${r.home} vs ${r.away}` : `(empty)`;
                  return <option key={slot} value={slot}>R32 {slot + 1}: {lbl}</option>;
                })}
              </select>
              <select
                value={bulkTeam}
                onChange={(e) => { setBulkTeam(e.target.value); setBulkMsg(null); }}
                className="flex-1 text-sm px-2 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300"
              >
                <option value="">Team to give everyone…</option>
                {[koRows[bulkSlot]?.home, koRows[bulkSlot]?.away].filter(Boolean).map((t) => (
                  <option key={t} value={t!}>{t}</option>
                ))}
              </select>
              <button
                onClick={applyBulkPick}
                disabled={bulkBusy || !bulkTeam}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-40 whitespace-nowrap"
              >
                {bulkBusy ? 'Applying…' : 'Apply to all'}
              </button>
            </div>
            {bulkMsg && (
              <p className={`text-xs font-semibold ${bulkMsg.ok ? 'text-wc-green-600' : 'text-wc-red-500'}`}>
                {bulkMsg.text}
              </p>
            )}
          </div>
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
                <h2 className="font-bold text-gray-900">{round.name}</h2>
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

      {/* ── Tab: Trophies ── */}
      {tab === 'trophies' && (
        <div className="space-y-6">
          {/* Award form */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Award a Trophy</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-500">Username</span>
                <select
                  value={trophyUsername}
                  onChange={(e) => setTrophyUsername(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300 bg-white"
                >
                  <option value="">— select user —</option>
                  {users.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.username}{u.displayName ? ` (${u.displayName})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-gray-500">Pool name</span>
                <input
                  type="text"
                  placeholder="e.g. Masters 2026 Golf Pool"
                  value={trophyPool}
                  onChange={(e) => setTrophyPool(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-gray-500">Year</span>
                <input
                  type="number"
                  value={trophyYear}
                  onChange={(e) => setTrophyYear(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-gray-500">Position</span>
                <select
                  value={trophyPosition}
                  onChange={(e) => setTrophyPosition(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300 bg-white"
                >
                  <option value="1">1st place</option>
                  <option value="2">2nd place</option>
                  <option value="3">3rd place</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">Trophy image path</span>
                <input
                  type="text"
                  placeholder="/images/world-cup-trophy.png"
                  value={trophyImage}
                  onChange={(e) => setTrophyImage(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-300 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">Leave blank to use default trophy icon.</p>
              </label>
            </div>

            {trophyMsg && (
              <p className={`text-sm font-semibold ${trophyMsg.ok ? 'text-wc-green-600' : 'text-red-500'}`}>
                {trophyMsg.text}
              </p>
            )}

            <button
              onClick={awardTrophy}
              disabled={trophySaving}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {trophySaving ? 'Awarding…' : 'Award Trophy'}
            </button>
          </div>

          {/* Existing trophies */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">Existing Trophies</h2>
            {trophies.length === 0 ? (
              <p className="text-sm text-gray-400">No trophies awarded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {trophies.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    {t.trophyImage ? (
                      <img src={t.trophyImage} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                    ) : (
                      <TrophyIcon className="w-8 h-8 text-wc-gold-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">
                        {t.user.displayName ?? t.user.username}
                        <span className="text-gray-400 font-normal ml-1">@{t.user.username}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {t.poolName} · {t.year} · {t.position === 1 ? '1st' : t.position === 2 ? '2nd' : '3rd'} place
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTrophy(t.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: View Brackets ── */}
      {tab === 'brackets' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Review player brackets</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pick a player to see their knockout bracket and check it&rsquo;s filled in correctly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={viewUser}
              onChange={(e) => {
                const name = e.target.value;
                setViewUser(name); setViewEntry(1);
                loadPlayerBracket(name, 1);
              }}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300"
            >
              <option value="">Select player…</option>
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.displayName ? `${u.displayName} (${u.username})` : u.username}
                </option>
              ))}
            </select>
            {viewUser && (() => {
              const u = users.find((x) => x.username === viewUser);
              if (!u || u.entriesCount <= 1) return null;
              return (
                <div className="flex gap-1">
                  {Array.from({ length: u.entriesCount }, (_, i) => i + 1).map((e) => (
                    <button
                      key={e}
                      onClick={() => { setViewEntry(e); loadPlayerBracket(viewUser, e); }}
                      className={`px-3 py-2 text-sm font-semibold rounded-lg border ${
                        viewEntry === e ? 'bg-wc-blue-500 text-white border-wc-blue-500' : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      Entry {e}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {viewUser && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-600">
                  Bracket deadline: {unlockMap[viewUser]
                    ? <span className="font-bold text-wc-green-600">unlocked for this player</span>
                    : <span className="font-bold text-gray-700">locked at the midnight deadline</span>}
                </span>
                <button
                  onClick={() => toggleUnlock(viewUser)}
                  disabled={unlockBusy}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
                    unlockMap[viewUser]
                      ? 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      : 'border-wc-green-300 text-wc-green-700 bg-wc-green-500/10 hover:bg-wc-green-500/20'
                  }`}
                >
                  {unlockMap[viewUser] ? 'Re-lock bracket' : 'Unlock bracket'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-600">
                  Manually fix an invalid bracket, then unlock so the player can refill it.
                  {overrideBusy && <span className="ml-2 text-gray-400">saving…</span>}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOverrideMode((v) => !v)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                      overrideMode
                        ? 'border-wc-blue-500 text-white bg-wc-blue-500'
                        : 'border-wc-blue-300 text-wc-blue-600 hover:bg-wc-blue-50'
                    }`}
                  >
                    {overrideMode ? 'Done editing' : 'Override bracket'}
                  </button>
                  <button
                    onClick={clearPlayerBracket}
                    disabled={overrideBusy}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-wc-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    Clear bracket
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-600">
                  Bracket status: {invalidMap[viewUser]
                    ? <span className="font-bold text-wc-red-600">flagged invalid (shown on standings)</span>
                    : <span className="font-bold text-gray-700">OK</span>}
                </span>
                <button
                  onClick={() => toggleInvalid(viewUser)}
                  disabled={invalidBusy}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
                    invalidMap[viewUser]
                      ? 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      : 'border-red-300 text-wc-red-600 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  {invalidMap[viewUser] ? 'Clear invalid flag' : 'Mark bracket invalid'}
                </button>
              </div>
            </div>
          )}

          {viewLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          ) : viewPicks === null ? (
            <p className="text-sm text-gray-400 py-8 text-center">Choose a player above.</p>
          ) : overrideMode ? (
            <div className="card">
              <div className="text-xs text-gray-500 font-semibold mb-3">
                Editing {viewUser}&rsquo;s bracket (entry {viewEntry}) — changes save instantly. An invalid pick
                shows blank; re-pick from R32 upward to rebuild it correctly.
              </div>
              <KnockoutBracket
                picks={viewPicksMap}
                onChange={handleOverridePick}
                locked={false}
                results={Object.fromEntries(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]))}
                allTeams={ALL_TEAMS}
                r32Teams={adminR32}
              />
            </div>
          ) : viewPicks.length === 0 ? (
            <div className="card text-center py-8">
              <p className="font-semibold text-gray-900">No bracket picks yet</p>
              <p className="text-gray-400 text-xs mt-1">This player hasn&rsquo;t filled in their bracket.</p>
            </div>
          ) : (
            <div className="card">
              <div className="text-xs text-gray-400 font-semibold mb-3">
                {viewPicks.length} pick{viewPicks.length !== 1 ? 's' : ''} · R32 {viewPicks.filter((p) => p.round === 'R32').length}/16
              </div>
              <BracketView picks={viewPicks} results={bracketResults} />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Pool Config ── */}
      {tab === 'pool' && (
        <div className="space-y-6">
        <div className="card max-w-sm space-y-5">
          <div>
            <h2 className="font-bold text-gray-900 mb-1">Entry Fee</h2>
            <p className="text-sm text-gray-500">Set the buy-in per player. Set to 0 for a free pool.</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 font-semibold">
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
                  <span className="font-bold text-gray-900">${totalPool.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1st place (75%)</span>
                  <span className="font-bold text-wc-gold-600">${prize1st.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2nd place (25%)</span>
                  <span className="font-bold text-gray-600">${prize2nd.toLocaleString()}</span>
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
        </div>
      )}

      {/* ── Tab: Activity ── */}
      {tab === 'activity' && (
        <div className="space-y-4">
          {/* Reset a player's password */}
          <div className="card space-y-3">
            <div>
              <h2 className="font-bold text-gray-900">Reset a password</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Set a new password for a player who&rsquo;s locked out, then send it to them privately.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={resetUser}
                onChange={(e) => { setResetUser(e.target.value); setResetMsg(null); }}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-wc-blue-300 focus:ring-2 focus:ring-wc-blue-500/10"
              >
                <option value="">Select player…</option>
                {users.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.displayName ? `${u.displayName} (${u.username})` : u.username}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={resetPw}
                onChange={(e) => { setResetPw(e.target.value); setResetMsg(null); }}
                placeholder="New password (6+ chars)"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-wc-blue-300 focus:ring-2 focus:ring-wc-blue-500/10 placeholder:text-gray-400"
              />
              <button
                onClick={resetPassword}
                disabled={resetting || !resetUser || resetPw.length < 6}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
            {resetMsg && (
              <p className={`text-xs font-semibold ${resetMsg.ok ? 'text-wc-green-600' : 'text-wc-red-500'}`}>
                {resetMsg.text}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">
            When each player last visited the site. Accurate to ~5 minutes while they have it open.
          </p>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
            {[...players]
              .sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''))
              .map((p) => {
                const label = p.displayName ?? p.username;
                const online =
                  p.lastSeenAt != null && Date.now() - new Date(p.lastSeenAt).getTime() < 6 * 60_000;
                const exact = p.lastSeenAt
                  ? new Date(p.lastSeenAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })
                  : null;
                return (
                  <div key={p.username} className="flex items-center justify-between px-5 py-3 bg-white">
                    <div>
                      <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                        {label}
                        {online && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-wc-green-600">
                            <span className="w-1.5 h-1.5 bg-wc-green-500 rounded-full animate-pulse" />
                            online
                          </span>
                        )}
                      </div>
                      {p.displayName && <div className="text-xs text-gray-400 font-mono">{p.username}</div>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${online ? 'text-wc-green-600' : p.lastSeenAt ? 'text-gray-600' : 'text-gray-300'}`}>
                        {online ? 'Now' : relativeTime(p.lastSeenAt)}
                      </span>
                      {exact && !online && <div className="text-[11px] text-gray-400">{exact}</div>}
                    </div>
                  </div>
                );
              })}
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
          <span className="font-bold text-gray-900">{group.name}</span>
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
