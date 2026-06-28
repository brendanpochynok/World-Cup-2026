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
  stageLabel?: string; // set for knockout games (e.g. "Round of 32") instead of group/match
}

// ── Caches ────────────────────────────────────────────────────────────────────
let liveCache: { data: unknown; at: number } | null = null;

// Past this point after kickoff a group game is over even if ESPN hasn't
// flipped its state or has dropped the game from the scoreboard (90' +
// halftime + generous stoppage). Group games have no extra time.
const ASSUME_FINISHED_MS = 150 * 60_000;

// ── ESPN (today's live/finished scores) ───────────────────────────────────────
interface ESPNComp {
  competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
  status: { type: { state: string; completed?: boolean; description?: string }; displayClock: string };
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
      // ESPN occasionally lingers on state 'in' at the whistle; trust the
      // explicit completed flag too
      const done = state === 'post' || comp.status?.type?.completed === true;
      const key = normalizeTeam(home.team.displayName) + ':' + normalizeTeam(away.team.displayName);
      map.set(key, {
        homeScore: parseInt(home.score || '0'),
        awayScore: parseInt(away.score || '0'),
        status: done ? 'finished' : 'live',
        clock: comp.status?.displayClock || '',
      });
    }
  } catch { /* ESPN unavailable */ }
  return map;
}

// Raw ESPN events with full status, for the debug endpoint
async function fetchESPNRaw(): Promise<unknown[]> {
  try {
    const res = await fetch(ESPN_BASE, { headers: ESPN_HEADERS, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data?.events ?? []) as ESPNEvent[]).map((e) => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors.find((c) => c.homeAway === 'home');
      const away = comp?.competitors.find((c) => c.homeAway === 'away');
      return {
        home: home?.team.displayName, away: away?.team.displayName,
        homeScore: home?.score, awayScore: away?.score,
        state: comp?.status?.type?.state,
        completed: comp?.status?.type?.completed,
        description: comp?.status?.type?.description,
        displayClock: comp?.status?.displayClock,
      };
    });
  } catch {
    return [];
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const now = Date.now();
  const todayISO = new Date().toISOString().slice(0, 10);

  // ?debug=1 → raw ESPN events + parsed keys vs our expected keys, no cache
  if (new URL(request.url).searchParams.get('debug')) {
    const [espnMap, rawEvents] = await Promise.all([fetchESPNLive(), fetchESPNRaw()]);
    return NextResponse.json({
      rawEvents,
      espnKeys: Array.from(espnMap.entries()).map(([k, v]) => ({ key: k, ...v })),
      ourKeys: GROUP_MATCHES.map((m) => ({
        matchId: m.matchId,
        keys: teamKeys(m.home).flatMap((hk) => teamKeys(m.away).map((ak) => hk + ':' + ak)),
      })),
    });
  }

  const cached = liveCache?.data as { matches?: MatchData[]; knockout?: MatchData[] } | undefined;
  const hasCachedLive =
    !!cached &&
    [...(cached.matches ?? []), ...(cached.knockout ?? [])].some((m) => m.status === 'live');
  const ttl = hasCachedLive ? 30_000 : 60_000;

  if (liveCache && now - liveCache.at < ttl) {
    return NextResponse.json(liveCache.data);
  }

  const [dbResults, espnLiveMap, koFixtures, bracketResults] = await Promise.all([
    prisma.matchResult.findMany(),
    fetchESPNLive(),
    prisma.knockoutMatch.findMany({ where: { home: { not: null }, away: { not: null } } }),
    prisma.bracketResult.findMany(),
  ]);

  const dbMap = new Map(dbResults.map((r) => [r.matchId, r]));
  const bracketResultMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

  // Finished results observed from ESPN that the DB doesn't yet record — we
  // persist these so the game stays "finished" once ESPN drops it from the
  // scoreboard, without waiting on the 10-minute sync cron.
  const toPersist: { matchId: string; homeGoals: number; awayGoals: number; result: string }[] = [];

  const matches: MatchData[] = GROUP_MATCHES.map((m) => {
    const kickoffIso = m.kickoffIso;
    const pastFullTime = now >= new Date(kickoffIso).getTime() + ASSUME_FINISHED_MS;

    // ESPN live/finished. No date gate: ESPN's scoreboard only lists games
    // it currently reports, group-stage pairings are unique, and gating on
    // a UTC "today" drops evening games in the Americas whose kickoff falls
    // on the next UTC day (e.g. an 8pm MDT match is 02:00Z tomorrow).
    const espn = findESPN(espnLiveMap, m.home, m.away);
    if (espn) {
      // A game ESPN still calls "live" well past full time is over —
      // trust the clock so it doesn't hang on live forever.
      const status = espn.status === 'finished' || pastFullTime ? 'finished' : 'live';
      const db = dbMap.get(m.matchId);
      if (status === 'finished' && db?.status !== 'finished') {
        toPersist.push({
          matchId: m.matchId,
          homeGoals: espn.homeScore,
          awayGoals: espn.awayScore,
          result: espn.homeScore > espn.awayScore ? 'home' : espn.awayScore > espn.homeScore ? 'away' : 'draw',
        });
      }
      return {
        matchId: m.matchId, group: m.group, matchNumber: m.matchNumber,
        date: m.date, kickoffIso,
        home: m.home, away: m.away,
        homeScore: espn.homeScore, awayScore: espn.awayScore,
        status, clock: status === 'finished' ? '' : espn.clock,
        venue: m.venue, city: m.city,
      };
    }

    // Admin / synced DB result
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

  // Persist newly-finished games (drives scoring + survives ESPN dropping them)
  if (toPersist.length > 0) {
    await Promise.all(
      toPersist.map((r) =>
        prisma.matchResult.upsert({
          where: { matchId: r.matchId },
          update: { homeGoals: r.homeGoals, awayGoals: r.awayGoals, result: r.result, status: 'finished' },
          create: { matchId: r.matchId, homeGoals: r.homeGoals, awayGoals: r.awayGoals, result: r.result, status: 'finished' },
        }).catch(() => null),
      ),
    );
  }

  // Knockout fixtures (admin-set) with live ESPN scores. A finished game with
  // a clear winner is auto-recorded as a BracketResult so picks score and turn
  // green; draws (penalty shootouts) are left for manual admin entry.
  const ROUND_NAMES: Record<string, string> = {
    R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-Final', SF: 'Semi-Final', Final: 'Final',
  };
  const koResultsToPersist: { round: string; slot: number; team: string }[] = [];
  const knockout: MatchData[] = koFixtures.map((k) => {
    const kickoffIso = k.kickoff ? k.kickoff.toISOString() : null;
    const espn = findESPN(espnLiveMap, k.home!, k.away!);
    const pastFT = kickoffIso ? now >= new Date(kickoffIso).getTime() + ASSUME_FINISHED_MS : false;
    const status: 'scheduled' | 'live' | 'finished' =
      espn ? (espn.status === 'finished' || pastFT ? 'finished' : 'live') : 'scheduled';

    if (status === 'finished' && espn && espn.homeScore !== espn.awayScore) {
      const winner = espn.homeScore > espn.awayScore ? k.home! : k.away!;
      if (bracketResultMap.get(`${k.round}-${k.slot}`) !== winner) {
        koResultsToPersist.push({ round: k.round, slot: k.slot, team: winner });
      }
    }

    return {
      matchId: `${k.round}-${k.slot}`,
      group: k.round, matchNumber: k.slot + 1,
      date: kickoffIso ? kickoffIso.slice(0, 10) : '',
      kickoffIso,
      home: k.home!, away: k.away!,
      homeScore: espn ? espn.homeScore : null,
      awayScore: espn ? espn.awayScore : null,
      status, clock: espn && status === 'live' ? espn.clock : '',
      venue: '', city: '',
      stageLabel: ROUND_NAMES[k.round] ?? k.round,
    };
  });

  if (koResultsToPersist.length > 0) {
    await Promise.all(
      koResultsToPersist.map((r) =>
        prisma.bracketResult.upsert({
          where: { round_slot: { round: r.round, slot: r.slot } },
          update: { team: r.team },
          create: r,
        }).catch(() => null),
      ),
    );
  }

  const responseData = { matches, knockout, serverDate: todayISO, fetchedAt: new Date().toISOString() };
  liveCache = { data: responseData, at: now };
  return NextResponse.json(responseData);
}
