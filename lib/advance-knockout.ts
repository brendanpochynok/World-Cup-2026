// Auto-advance knockout winners into the next round's fixtures.
//
// The scores page only lists KnockoutMatch rows whose teams are set. R32 was
// seeded by the admin, but nothing created later-round fixtures — so once R32
// finished, the Round of 16 never appeared. This fills each next-round slot
// from its two feeder winners (bracket convention: slot s is fed by slots 2s
// and 2s+1, even = home) and grabs kickoff times from ESPN's upcoming schedule.
// Admin-set values are respected: a row with both teams already set is left
// alone, and kickoffs are only filled when missing.

import { prisma } from './prisma';
import { teamKeys } from './espn-teams';

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
const SLOTS_PER_ROUND: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

interface ESPNEvent {
  date: string;
  competitions: Array<{
    competitors: Array<{ homeAway: string; team: { displayName: string } }>;
    status: { type: { state: string } };
  }>;
}

// Upcoming scheduled kickoffs keyed by team pair (both orders), cached briefly
// so repeated score polls don't hammer ESPN.
let scheduleCache: { map: Map<string, string>; at: number } | null = null;

async function fetchUpcomingSchedule(now: number): Promise<Map<string, string>> {
  if (scheduleCache && now - scheduleCache.at < 30 * 60_000) return scheduleCache.map;
  const map = new Map<string, string>();
  const day = new Date(now);
  const dates: string[] = [];
  for (let i = 0; i < 9; i++) {
    dates.push(day.toISOString().slice(0, 10).replace(/-/g, ''));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  await Promise.all(
    dates.map(async (ds) => {
      try {
        const res = await fetch(`${ESPN_BASE}?dates=${ds}`, { headers: ESPN_HEADERS, next: { revalidate: 1800 } });
        if (!res.ok) return;
        const data = await res.json();
        for (const event of (data?.events ?? []) as ESPNEvent[]) {
          const comp = event.competitions?.[0];
          if (!comp || !event.date) continue;
          const home = comp.competitors.find((c) => c.homeAway === 'home');
          const away = comp.competitors.find((c) => c.homeAway === 'away');
          if (!home || !away) continue;
          for (const hk of teamKeys(home.team.displayName)) {
            for (const ak of teamKeys(away.team.displayName)) {
              map.set(`${hk}:${ak}`, event.date);
              map.set(`${ak}:${hk}`, event.date);
            }
          }
        }
      } catch { /* schedule is best-effort */ }
    }),
  );
  scheduleCache = { map, at: now };
  return map;
}

function findKickoff(schedule: Map<string, string>, home: string, away: string): Date | null {
  for (const hk of teamKeys(home)) {
    for (const ak of teamKeys(away)) {
      const iso = schedule.get(`${hk}:${ak}`);
      if (iso) {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

export interface AdvanceResult {
  filled: string[];   // fixtures whose teams were set, e.g. "R16-6: Argentina v Colombia"
  kickoffs: string[]; // fixtures whose kickoff was discovered from ESPN
}

// Fill next-round fixtures from decided feeders. Safe to call repeatedly.
export async function advanceKnockoutFixtures(now = Date.now()): Promise<AdvanceResult> {
  const [koRows, results] = await Promise.all([
    prisma.knockoutMatch.findMany(),
    prisma.bracketResult.findMany(),
  ]);
  const winners = new Map(results.map((r) => [`${r.round}-${r.slot}`, r.team]));
  const rowByKey = new Map(koRows.map((k) => [`${k.round}-${k.slot}`, k]));

  const out: AdvanceResult = { filled: [], kickoffs: [] };
  const needKickoff: { round: string; slot: number; home: string; away: string }[] = [];

  for (let ri = 1; ri < ROUND_ORDER.length; ri++) {
    const round = ROUND_ORDER[ri];
    const prev = ROUND_ORDER[ri - 1];
    for (let slot = 0; slot < SLOTS_PER_ROUND[round]; slot++) {
      const home = winners.get(`${prev}-${slot * 2}`);
      const away = winners.get(`${prev}-${slot * 2 + 1}`);
      if (!home || !away) continue;

      const row = rowByKey.get(`${round}-${slot}`);
      if (row?.home && row?.away) {
        // Teams already set (by admin or a prior pass) — only backfill kickoff.
        if (!row.kickoff) needKickoff.push({ round, slot, home: row.home, away: row.away });
        continue;
      }

      await prisma.knockoutMatch.upsert({
        where: { round_slot: { round, slot } },
        update: { home, away },
        create: { round, slot, home, away },
      }).catch(() => null);
      out.filled.push(`${round}-${slot}: ${home} v ${away}`);
      if (!row?.kickoff) needKickoff.push({ round, slot, home, away });
    }
  }

  if (needKickoff.length > 0) {
    const schedule = await fetchUpcomingSchedule(now);
    for (const f of needKickoff) {
      const kickoff = findKickoff(schedule, f.home, f.away);
      if (!kickoff) continue;
      await prisma.knockoutMatch.update({
        where: { round_slot: { round: f.round, slot: f.slot } },
        data: { kickoff },
      }).catch(() => null);
      out.kickoffs.push(`${f.round}-${f.slot}: ${kickoff.toISOString()}`);
    }
  }

  return out;
}
