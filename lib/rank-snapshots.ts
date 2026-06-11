import { prisma } from './prisma';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export type EntryKey = `${number}-${number}`;

export function entryKey(userId: number, entry: number): EntryKey {
  return `${userId}-${entry}`;
}

// Keep today's snapshot row current for each entry. A row for a *previous*
// date therefore holds that day's final standings, which is what movement
// arrows compare against.
export async function updateRankSnapshots(
  ranked: { userId: number; entry: number; rank: number; score: number }[],
): Promise<void> {
  const date = todayUTC();

  // Ranks only change when match results are entered, so most page views
  // need no writes at all — compare against today's stored rows first.
  const existing = await prisma.rankSnapshot.findMany({
    where: { date },
    select: { userId: true, entry: true, rank: true, score: true },
  });
  const byEntry = new Map(existing.map((e) => [entryKey(e.userId, e.entry), e]));
  const stale = ranked.filter((r) => {
    const cur = byEntry.get(entryKey(r.userId, r.entry));
    return !cur || cur.rank !== r.rank || cur.score !== r.score;
  });
  if (stale.length === 0) return;

  await Promise.all(
    stale.map((r) =>
      prisma.rankSnapshot.upsert({
        where: { userId_entry_date: { userId: r.userId, entry: r.entry, date } },
        update: { rank: r.rank, score: r.score },
        create: { userId: r.userId, entry: r.entry, date, rank: r.rank, score: r.score },
      }),
    ),
  );
}

// Latest snapshot per entry from before today: Map<"userId-entry", rank>
export async function getPreviousRanks(): Promise<Map<EntryKey, number>> {
  const date = todayUTC();
  const rows = await prisma.rankSnapshot.findMany({
    where: { date: { lt: date } },
    orderBy: { date: 'desc' },
    select: { userId: true, entry: true, rank: true, date: true },
  });
  const map = new Map<EntryKey, number>();
  for (const row of rows) {
    const key = entryKey(row.userId, row.entry);
    if (!map.has(key)) map.set(key, row.rank);
  }
  return map;
}
