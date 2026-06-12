import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { POLYMARKET_TEAM_CODES } from '@/lib/polymarket-codes';
import { prisma } from '@/lib/prisma';
import { normalizeTeam, teamKeys } from '@/lib/espn-teams';

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

// ── ESPN (today's live/finished scores) ───────────────────────────────────────
interface ESPNComp {
  competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
  status: { type: { state: string }; displayClock: string };
}
interface ESPNEvent {
  date: string;
  competitions: ESPNComp[];
}

type ESPNScore = { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string };

// Find a match's ESPN entry, tolerating name variants and a flipped
// home/away listing (scores are swapped back when flipped)
function findESPN(map: Map<string, ESPNScore>, home: string, away: string): ESPNScore | null {
  for (const hk of teamKeys(home)) {
    for (const ak of teamKeys(away)) {
      const hit = map.get(hk + ':' + ak);
      if (hit) return hit;
      const flipped = map.get(ak + ':' + hk);
      if (flipped) {
        return { ...flipped, homeScore: flipped.awayScore, awayScore: flipped.homeScore };
      }
    }
  }
  return null;
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

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const now = Date.now();
  const todayISO = new Date().toISOString().slice(0, 10);

  // ?debug=1 → raw ESPN keys vs our expected keys, bypassing the cache
  if (new URL(request.url).searchParams.get('debug')) {
    const espnMap = await fetchESPNLive();
    return NextResponse.json({
      espnKeys: Array.from(espnMap.entries()).map(([k, v]) => ({ key: k, ...v })),
      ourKeys: GROUP_MATCHES.map((m) => ({
        matchId: m.matchId,
        keys: teamKeys(m.home).flatMap((hk) => teamKeys(m.away).map((ak) => hk + ':' + ak)),
      })),
    });
  }

  const hasCachedLive =
    liveCache &&
    Array.isArray((liveCache.data as { matches?: MatchData[] })?.matches) &&
    (liveCache.data as { matches: MatchData[] }).matches.some((m) => m.status === 'live');
  const ttl = hasCachedLive ? 30_000 : 60_000;

  if (liveCache && now - liveCache.at < ttl) {
    return NextResponse.json(liveCache.data);
  }

  const [dbResults, espnLiveMap] = await Promise.all([
    prisma.matchResult.findMany(),
    fetchESPNLive(),
  ]);

  const dbMap = new Map(dbResults.map((r) => [r.matchId, r]));

  const matches: MatchData[] = GROUP_MATCHES.map((m) => {
    const kickoffIso = m.kickoffIso;

    // ESPN live/finished. No date gate: ESPN's scoreboard only lists games
    // it currently reports, group-stage pairings are unique, and gating on
    // a UTC "today" drops evening games in the Americas whose kickoff falls
    // on the next UTC day (e.g. an 8pm MDT match is 02:00Z tomorrow).
    const espn = findESPN(espnLiveMap, m.home, m.away);
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
