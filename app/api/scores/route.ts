import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { prisma } from '@/lib/prisma';

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

export interface MatchData {
  matchId: string;
  group: string;
  matchNumber: number;
  date: string;          // YYYY-MM-DD
  kickoffIso: string | null; // full UTC ISO from ESPN, e.g. "2026-06-11T19:00:00Z"
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  clock: string;
  venue: string;
  city: string;
}

// ── Caches ────────────────────────────────────────────────────────────────────
let liveCache: { data: unknown; at: number } | null = null;
let scheduleCache: { map: Map<string, string>; at: number } | null = null;

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface ESPNComp {
  competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
  status: { type: { state: string }; displayClock: string };
}
interface ESPNEvent {
  date: string;
  competitions: ESPNComp[];
}

// Fetch live/finished data for today
async function fetchESPNLive(): Promise<
  Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string; kickoffIso: string }>
> {
  const map = new Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string; kickoffIso: string }>();
  try {
    const res = await fetch(ESPN_BASE, { headers: ESPN_HEADERS, next: { revalidate: 30 } });
    if (!res.ok) return map;
    const data = await res.json();
    for (const event of (data?.events ?? []) as ESPNEvent[]) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors.find((c) => c.homeAway === 'home');
      const away = comp.competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;
      const state = comp.status?.type?.state;
      if (state !== 'in' && state !== 'post') continue;
      const key = normalize(home.team.displayName) + ':' + normalize(away.team.displayName);
      map.set(key, {
        homeScore: parseInt(home.score || '0'),
        awayScore: parseInt(away.score || '0'),
        status: state === 'in' ? 'live' : 'finished',
        clock: comp.status?.displayClock || '',
        kickoffIso: event.date,
      });
    }
  } catch { /* ESPN unavailable */ }
  return map;
}

// Fetch all kickoff times for the tournament (cached 1 hour)
async function fetchESPNSchedule(): Promise<Map<string, string>> {
  const now = Date.now();
  if (scheduleCache && now - scheduleCache.at < 3_600_000) return scheduleCache.map;

  const map = new Map<string, string>();
  try {
    const res = await fetch(
      `${ESPN_BASE}?dates=20260611-20260719`,
      { headers: ESPN_HEADERS, next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      scheduleCache = { map, at: now };
      return map;
    }
    const data = await res.json();
    for (const event of (data?.events ?? []) as ESPNEvent[]) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors.find((c) => c.homeAway === 'home');
      const away = comp.competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;
      const key = normalize(home.team.displayName) + ':' + normalize(away.team.displayName);
      map.set(key, event.date);
    }
  } catch { /* ignore */ }

  scheduleCache = { map, at: now };
  return map;
}

export async function GET() {
  const now = Date.now();
  const todayISO = new Date().toISOString().slice(0, 10);

  const hasCachedLive =
    liveCache &&
    Array.isArray((liveCache.data as { matches?: MatchData[] })?.matches) &&
    (liveCache.data as { matches: MatchData[] }).matches.some((m) => m.status === 'live');
  const ttl = hasCachedLive ? 30_000 : 60_000;

  if (liveCache && now - liveCache.at < ttl) {
    return NextResponse.json(liveCache.data);
  }

  const [dbResults, espnLiveMap, espnScheduleMap] = await Promise.all([
    prisma.matchResult.findMany(),
    fetchESPNLive(),
    fetchESPNSchedule(),
  ]);

  const dbMap = new Map(dbResults.map((r) => [r.matchId, r]));

  const matches: MatchData[] = GROUP_MATCHES.map((m) => {
    const scheduleKey = normalize(m.home) + ':' + normalize(m.away);
    const kickoffIso = espnScheduleMap.get(scheduleKey) ?? null;

    // ESPN live/finished (today only)
    if (m.date === todayISO) {
      const espn = espnLiveMap.get(scheduleKey);
      if (espn) {
        return {
          matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
          date: m.date, kickoffIso: espn.kickoffIso,
          home: m.home, away: m.away,
          homeScore: espn.homeScore, awayScore: espn.awayScore,
          status: espn.status, clock: espn.clock,
          venue: m.venue, city: m.city,
        };
      }
    }

    // Admin DB result
    const db = dbMap.get(m.matchId);
    if (db && db.status !== 'scheduled') {
      return {
        matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
        date: m.date, kickoffIso,
        home: m.home, away: m.away,
        homeScore: db.homeGoals ?? null, awayScore: db.awayGoals ?? null,
        status: db.status as 'scheduled' | 'live' | 'finished',
        clock: '', venue: m.venue, city: m.city,
      };
    }

    // Scheduled
    return {
      matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
      date: m.date, kickoffIso,
      home: m.home, away: m.away,
      homeScore: null, awayScore: null,
      status: 'scheduled', clock: '', venue: m.venue, city: m.city,
    };
  });

  const responseData = { matches, serverDate: todayISO, fetchedAt: new Date().toISOString() };
  liveCache = { data: responseData, at: now };
  return NextResponse.json(responseData);
}
