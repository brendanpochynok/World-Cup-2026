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

  // Knockout fixtures (admin-set), keyed by UTC date + teams (±1 day) so a
  // knockout game is matched to its fixture, never to a group rematch.
  const koFixtures = await prisma.knockoutMatch.findMany({
    where: { home: { not: null }, away: { not: null }, kickoff: { not: null } },
  });
  const koByDateKey = new Map<string, { round: string; slot: number; flip: boolean }>();
  for (const k of koFixtures) {
    const base = new Date(k.kickoff!);
    for (const delta of [0, -1, 1]) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + delta);
      const ds = toDateStr(d);
      for (const hk of teamKeys(k.home!)) {
        for (const ak of teamKeys(k.away!)) {
          koByDateKey.set(`${ds}:${hk}:${ak}`, { round: k.round, slot: k.slot, flip: false });
          koByDateKey.set(`${ds}:${ak}:${hk}`, { round: k.round, slot: k.slot, flip: true });
        }
      }
    }
  }

  let synced = 0;
  const unmatched: string[] = [];

  for (const dateStr of dates) {
    const finished = await fetchFinishedForDate(dateStr);
    for (const r of finished) {
      const hk = normalizeTeam(r.homeTeam);
      const ak = normalizeTeam(r.awayTeam);

      // Knockout first (date-keyed)
      const ko = koByDateKey.get(`${dateStr}:${hk}:${ak}`);
      if (ko) {
        const hs = ko.flip ? r.awayScore : r.homeScore;
        const as = ko.flip ? r.homeScore : r.awayScore;
        await prisma.knockoutMatch.update({
          where: { round_slot: { round: ko.round, slot: ko.slot } },
          data: { homeScore: hs, awayScore: as, status: 'finished' },
        }).catch(() => null);
        if (hs !== as) {
          const fx = koFixtures.find((f) => f.round === ko.round && f.slot === ko.slot);
          const winner = hs > as ? fx?.home : fx?.away;
          if (winner) {
            await prisma.bracketResult.upsert({
              where: { round_slot: { round: ko.round, slot: ko.slot } },
              update: { team: winner },
              create: { round: ko.round, slot: ko.slot, team: winner },
            }).catch(() => null);
          }
        }
        synced++;
        continue;
      }

      // Group (team-keyed)
      const key = hk + ':' + ak;
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
