import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { SCORING, ENTRY_FEE_USD } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

const ROUND_POINTS: Record<string, number> = {
  R32: SCORING.r32,
  R16: SCORING.r16,
  QF:  SCORING.qf,
  SF:  SCORING.sf,
  Final: SCORING.final,
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [users, matchResults, bracketResults, poolConfig] = await Promise.all([
      prisma.user.findMany({
        include: { matchPicks: true, bracketPicks: true },
      }),
      prisma.matchResult.findMany({ where: { status: 'finished', result: { not: null } } }),
      prisma.bracketResult.findMany(),
      prisma.poolConfig.findUnique({ where: { id: 1 } }),
    ]);

    const resultMap = new Map(matchResults.map((r) => [r.matchId, r.result!]));
    const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

    const entryFee = poolConfig?.entryFeePerPlayer ?? ENTRY_FEE_USD;

    // Build one row per entry
    const rows = users.flatMap((u) => {
      const entryNums = Array.from({ length: u.entriesCount }, (_, i) => i + 1);
      return entryNums.map((entry) => {
        const myMatchPicks = u.matchPicks.filter((mp) => mp.entry === entry);
        const myBracketPicks = u.bracketPicks.filter((bp) => bp.entry === entry);

        let score = 0;

        for (const mp of myMatchPicks) {
          const actual = resultMap.get(mp.matchId);
          if (!actual) continue;
          if (mp.pick === actual) score += SCORING.groupCorrect;
          else if (actual === 'draw') score += 0;
          else score += SCORING.groupWrong;
        }

        for (const bp of myBracketPicks) {
          const actual = bracketMap.get(`${bp.round}-${bp.slot}`);
          if (actual && bp.team === actual) score += ROUND_POINTS[bp.round] ?? 0;
        }

        const finalPick = myBracketPicks.find((p) => p.round === 'Final' && p.slot === 0);

        return {
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          entry,
          entriesCount: u.entriesCount,
          score,
          matchPicksCount: myMatchPicks.length,
          bracketPicksCount: myBracketPicks.length,
          championPick: finalPick?.team ?? null,
        };
      });
    });

    const totalEntries = rows.length;
    const totalPot = entryFee * totalEntries;

    rows.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username) || a.entry - b.entry);

    // Assign prizes: 1st=75%, 2nd=25%, 3rd=free entry note
    const ranked = rows.map((row, idx) => {
      const rank = idx + 1;
      let prize: number | null = null;
      let prizeNote: string | null = null;
      if (rank === 1) prize = Math.round((totalPot * 0.75) / 10) * 10;
      else if (rank === 2) prize = totalPot - (Math.round((totalPot * 0.75) / 10) * 10);
      else if (rank === 3) prizeNote = 'Free entry next pool';
      return { ...row, rank, prize, prizeNote };
    });

    return NextResponse.json({ standings: ranked, totalPot, totalEntries, entryFee });
  } catch (err) {
    console.error('Standings error:', err);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}
