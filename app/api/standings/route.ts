import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { SCORING } from '@/lib/worldcup-data';

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
    const [users, matchResults, bracketResults] = await Promise.all([
      prisma.user.findMany({
        include: { matchPicks: true, bracketPicks: true },
      }),
      prisma.matchResult.findMany({ where: { status: 'finished', result: { not: null } } }),
      prisma.bracketResult.findMany(),
    ]);

    const resultMap = new Map(matchResults.map((r) => [r.matchId, r.result!]));
    const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

    const standings = users.map((u) => {
      let score = 0;

      // Group stage: +1 correct, -1 any wrong pick
      for (const mp of u.matchPicks) {
        const actual = resultMap.get(mp.matchId);
        if (!actual) continue;
        if (mp.pick === actual) score += SCORING.groupCorrect;
        else score += SCORING.groupWrong;
      }

      // Bracket: points by round
      for (const bp of u.bracketPicks) {
        const actual = bracketMap.get(`${bp.round}-${bp.slot}`);
        if (actual && bp.team === actual) score += ROUND_POINTS[bp.round] ?? 0;
      }

      // Champion bonus (Final slot 0)
      const finalPick = u.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0);
      const champion = bracketMap.get('Final-0') ?? null;
      if (finalPick && champion && finalPick.team === champion) score += SCORING.champion;

      return {
        userId: u.id,
        username: u.username,
        score,
        matchPicksCount: u.matchPicks.length,
        bracketPicksCount: u.bracketPicks.length,
        championPick: finalPick?.team ?? null,
      };
    });

    standings.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
    return NextResponse.json({ standings });
  } catch (err) {
    console.error('Standings error:', err);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}
