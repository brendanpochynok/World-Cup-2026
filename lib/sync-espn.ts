import { prisma } from './prisma';
import { GROUP_MATCHES } from './worldcup-data';
import { normalizeTeam, teamKeys } from './espn-teams';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const TOURNAMENT_START = '2026-06-11';

// Pre-built lookups covering team-name aliases and flipped home/away
// listings (group-stage pairings are unique, so no key collides)
const matchByKey = new Map<string, string>();
const matchByFlippedKey = new Map<string, string>();
for (const m of GROUP_MATCHES) {
  for (const hk of teamKeys(m.home)) {
    for (const ak of teamKeys(m.away)) {
      matchByKey.set(hk + ':' + ak, m.matchId);
      matchByFlippedKey.set(ak + ':' + hk, m.matchId);
    }
  }
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchFinishedForDate(
  dateStr: string,
): Promise<Array<{ homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }>> {
  try {
    const res = await fetch(`${ESPN_BASE}?dates=${dateStr}`, {
      headers: ESPN_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: Array<{ homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }> = [];
    for (const event of (data?.events ?? []) as Array<{
      competitions: Array<{
        competitors: Array<{ homeAway: string; team: { displayName: string }; score: string }>;
        status: { type: { state: string } };
      }>;
    }>) {
      const comp = event.competitions?.[0];
      if (!comp || comp.status?.type?.state !== 'post') continue;
      const home = comp.competitors.find((c) => c.homeAway === 'home');
      const away = comp.competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;
      results.push({
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore: parseInt(home.score || '0'),
        awayScore: parseInt(away.score || '0'),
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function syncESPNResults(): Promise<{ synced: number; unmatched: string[] }> {
  const today = new Date();
  const dates: string[] = [];
  const cursor = new Date(TOURNAMENT_START);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    dates.push(toDateStr(new Date(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }

  let synced = 0;
  const unmatched: string[] = [];

  for (const dateStr of dates) {
    const finished = await fetchFinishedForDate(dateStr);
    for (const r of finished) {
      const key = normalizeTeam(r.homeTeam) + ':' + normalizeTeam(r.awayTeam);
      let matchId = matchByKey.get(key);
      let homeScore = r.homeScore;
      let awayScore = r.awayScore;
      if (!matchId) {
        // ESPN listed the fixture with home/away flipped — swap scores back
        matchId = matchByFlippedKey.get(key);
        if (matchId) {
          homeScore = r.awayScore;
          awayScore = r.homeScore;
        }
      }
      if (!matchId) {
        unmatched.push(`${r.homeTeam} vs ${r.awayTeam}`);
        continue;
      }
      const result =
        homeScore > awayScore ? 'home'
        : awayScore > homeScore ? 'away'
        : 'draw';
      await prisma.matchResult.upsert({
        where: { matchId },
        update: { homeGoals: homeScore, awayGoals: awayScore, result, status: 'finished' },
        create: { matchId, homeGoals: homeScore, awayGoals: awayScore, result, status: 'finished' },
      });
      synced++;
    }
  }

  return { synced, unmatched };
}
