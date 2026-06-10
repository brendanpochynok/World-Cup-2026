import { prisma } from './prisma';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Keep today's snapshot row current for each user. A row for a *previous*
// date therefore holds that day's final standings, which is what movement
// arrows compare against.
export async function updateRankSnapshots(
  ranked: { userId: number; rank: number; score: number }[],
): Promise<void> {
  const date = todayUTC();

  // Ranks only change when match results are entered, so most page views
  // need no writes at all — compare against today's stored rows first.
  const existing = await prisma.rankSnapshot.findMany({
    where: { date },
    select: { userId: true, rank: true, score: true },
  });
  const byUser = new Map(existing.map((e) => [e.userId, e]));
  const stale = ranked.filter((r) => {
    const cur = byUser.get(r.userId);
    return !cur || cur.rank !== r.rank || cur.score !== r.score;
  });
  if (stale.length === 0) return;

  await Promise.all(
    stale.map((r) =>
      prisma.rankSnapshot.upsert({
        where: { userId_date: { userId: r.userId, date } },
        update: { rank: r.rank, score: r.score },
        create: { userId: r.userId, date, rank: r.rank, score: r.score },
      }),
    ),
  );
}

// Latest snapshot per user from before today: Map<userId, rank>
export async function getPreviousRanks(): Promise<Map<number, number>> {
  const date = todayUTC();
  const rows = await prisma.rankSnapshot.findMany({
    where: { date: { lt: date } },
    orderBy: { date: 'desc' },
    select: { userId: true, rank: true, date: true },
  });
  const map = new Map<number, number>();
  for (const row of rows) {
    if (!map.has(row.userId)) map.set(row.userId, row.rank);
  }
  return map;
}
