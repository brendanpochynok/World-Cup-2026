import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { prisma } from '@/lib/prisma';

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

export interface MatchData {
  matchId: string;
  group: string;
  matchNumber: number;
  date: string;       // YYYY-MM-DD
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  clock: string;
  venue: string;
  city: string;
}

let cache: { data: unknown; at: number } | null = null;

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface ESPNComp {
  competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
  status: { type: { state: string }; displayClock: string };
}

async function fetchESPNLive(): Promise<
  Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string }>
> {
  const map = new Map<string, { homeScore: number; awayScore: number; status: 'live' | 'finished'; clock: string }>();
  try {
    const res = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      next: { revalidate: 30 },
    });
    if (!res.ok) return map;
    const data = await res.json();
    const events: Array<{ competitions: ESPNComp[] }> = data?.events || [];
    for (const event of events) {
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
      });
    }
  } catch {
    // ESPN unavailable — return empty map
  }
  return map;
}

export async function GET() {
  const now = Date.now();
  const todayISO = new Date().toISOString().slice(0, 10);

  // Check if any game is live — use short cache if so
  const hasCachedLive =
    cache &&
    typeof cache.data === 'object' &&
    cache.data !== null &&
    Array.isArray((cache.data as { matches?: MatchData[] }).matches) &&
    (cache.data as { matches: MatchData[] }).matches.some((m) => m.status === 'live');
  const ttl = hasCachedLive ? 30_000 : 60_000;

  if (cache && now - cache.at < ttl) {
    return NextResponse.json(cache.data);
  }

  const [dbResults, espnMap] = await Promise.all([
    prisma.matchResult.findMany(),
    fetchESPNLive(),
  ]);

  const dbMap = new Map(dbResults.map((r) => [r.matchId, r]));

  const matches: MatchData[] = GROUP_MATCHES.map((m) => {
    // Try ESPN (live/finished today)
    if (m.date === todayISO) {
      const key = normalize(m.home) + ':' + normalize(m.away);
      const espn = espnMap.get(key);
      if (espn) {
        return {
          matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
          date: m.date, home: m.home, away: m.away,
          homeScore: espn.homeScore, awayScore: espn.awayScore,
          status: espn.status, clock: espn.clock,
          venue: m.venue, city: m.city,
        };
      }
    }

    // Try DB (admin-entered results)
    const db = dbMap.get(m.matchId);
    if (db && db.status !== 'scheduled') {
      return {
        matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
        date: m.date, home: m.home, away: m.away,
        homeScore: db.homeGoals ?? null, awayScore: db.awayGoals ?? null,
        status: db.status as 'scheduled' | 'live' | 'finished',
        clock: '', venue: m.venue, city: m.city,
      };
    }

    // Scheduled
    return {
      matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
      date: m.date, home: m.home, away: m.away,
      homeScore: null, awayScore: null,
      status: 'scheduled', clock: '', venue: m.venue, city: m.city,
    };
  });

  const responseData = { matches, serverDate: todayISO, fetchedAt: new Date().toISOString() };
  cache = { data: responseData, at: now };
  return NextResponse.json(responseData);
}
