import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { POLYMARKET_TEAM_CODES } from '@/lib/polymarket-codes';
import { prisma } from '@/lib/prisma';

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

const POLY_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://polymarket.com/',
};

export interface MatchData {
  matchId: string;
  group: string;
  matchNumber: number;
  date: string;              // YYYY-MM-DD
  kickoffIso: string | null; // UTC ISO from Polymarket startTime
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
let polyTimesCache: { map: Map<string, string>; at: number } | null = null;

// ── ESPN (today's live/finished scores) ───────────────────────────────────────
interface ESPNComp {
  competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
  status: { type: { state: string }; displayClock: string };
}
interface ESPNEvent {
  date: string;
  competitions: ESPNComp[];
}

function normalizeTeam(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchESPNLive(): Promise<
  Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string }>
> {
  const map = new Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string }>();
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
      const key = normalizeTeam(home.team.displayName) + ':' + normalizeTeam(away.team.displayName);
      map.set(key, {
        homeScore: parseInt(home.score || '0'),
        awayScore: parseInt(away.score || '0'),
        status: state === 'in' ? 'live' : 'finished',
        clock: comp.status?.displayClock || '',
      });
    }
  } catch { /* ESPN unavailable */ }
  return map;
}

// ── Polymarket kickoff times (one request per match, cached 4 hours) ──────────
async function fetchOnePolyTime(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}`,
      { headers: POLY_HEADERS, next: { revalidate: 14400 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const event = (data.find((e: { slug: string }) => e.slug === slug) ?? data[0]) as { startTime?: string };
    return event?.startTime ?? null;
  } catch {
    return null;
  }
}

async function fetchPolymarketTimes(): Promise<Map<string, string>> {
  const now = Date.now();
  if (polyTimesCache && now - polyTimesCache.at < 4 * 3_600_000) return polyTimesCache.map;

  const map = new Map<string, string>(); // matchId → kickoffIso

  // Build one task per match — try both slug orderings
  const tasks = GROUP_MATCHES.map((m) => async () => {
    const hCode = POLYMARKET_TEAM_CODES[m.home];
    const aCode = POLYMARKET_TEAM_CODES[m.away];
    if (!hCode || !aCode) return;

    for (const [h, a] of [[hCode, aCode], [aCode, hCode]]) {
      const slug = `fifwc-${h}-${a}-${m.date}`;
      const time = await fetchOnePolyTime(slug);
      if (time) {
        map.set(m.matchId, time);
        return;
      }
    }
  });

  // Fetch in batches of 20 to be kind to Polymarket's API
  const BATCH = 20;
  for (let i = 0; i < tasks.length; i += BATCH) {
    await Promise.all(tasks.slice(i, i + BATCH).map((fn) => fn()));
  }

  polyTimesCache = { map, at: now };
  return map;
}

// ── Main handler ──────────────────────────────────────────────────────────────
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

  const [dbResults, espnLiveMap, polyTimesMap] = await Promise.all([
    prisma.matchResult.findMany(),
    fetchESPNLive(),
    fetchPolymarketTimes(),
  ]);

  const dbMap = new Map(dbResults.map((r) => [r.matchId, r]));

  const matches: MatchData[] = GROUP_MATCHES.map((m) => {
    const kickoffIso = polyTimesMap.get(m.matchId) ?? null;
    const espnKey = normalizeTeam(m.home) + ':' + normalizeTeam(m.away);

    // ESPN live/finished (today only)
    if (m.date === todayISO) {
      const espn = espnLiveMap.get(espnKey);
      if (espn) {
        return {
          matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
          date: m.date, kickoffIso,
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
