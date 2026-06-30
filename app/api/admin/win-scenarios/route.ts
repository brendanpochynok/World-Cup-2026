import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  calculateTotalScore,
  calculateMaxPossibleScore,
  computeEliminatedTeams,
} from '@/lib/scoring';
import {
  computeWinScenarios,
  type ScenarioEntryInput,
  type TreeInput,
  type ScenariosResult,
} from '@/lib/win-scenarios';
import { GET as fetchOddsRoute } from '@/app/api/odds/route';
import type { MatchOdds } from '@/app/api/odds/route';
import { fetchFuturesOdds, advanceProbByRound, type FutureStage } from '@/lib/polymarket-futures';

export const dynamic = 'force-dynamic';

const SLOTS_PER_ROUND: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

export type WinScenariosResponse =
  | (ScenariosResult & {
      pendingGroupGames: number;
      futuresResolved: Partial<Record<FutureStage, string>>;
    })
  | { error: string };

// Admin-only: works out, across every way the remaining knockout games could
// play out, what share of those scenarios each entry would win the pool — plus a
// per-champion breakdown ("if X lifts the trophy, these entries win").
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [matchResults, bracketResults, knockoutMatches, users] = await Promise.all([
    prisma.matchResult.findMany(),
    prisma.bracketResult.findMany(),
    prisma.knockoutMatch.findMany(),
    prisma.user.findMany({
      select: {
        username: true,
        displayName: true,
        entriesCount: true,
        bracketInvalid: true,
        matchPicks: { select: { matchId: true, pick: true, entry: true } },
        bracketPicks: { select: { round: true, slot: true, team: true, entry: true } },
      },
      orderBy: { username: 'asc' },
    }),
  ]);

  const resultMap = new Map(
    matchResults.filter((r) => r.status === 'finished' && r.result).map((r) => [r.matchId, r.result!]),
  );
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));
  const settledMatchIds = new Set(resultMap.keys());
  const settledBracketSlots = new Set(bracketMap.keys());
  const eliminatedTeams = computeEliminatedTeams(knockoutMatches, bracketMap);

  const tree: TreeInput = { r32: {}, decided: {} };
  for (const k of knockoutMatches) {
    if (k.round === 'R32' && k.home && k.away) tree.r32[k.slot] = [k.home, k.away];
  }
  for (const r of bracketResults) tree.decided[`${r.round}-${r.slot}`] = r.team;

  // Optional Polymarket weighting. Two market types feed it:
  //   1. Futures ("reach stage" + outright winner) give every team's chance of
  //      advancing each round, so even deep games we have no head-to-head line
  //      for are weighted rather than coin-flipped.
  //   2. Head-to-head game markets (the next round, teams already known) are
  //      more precise, so they override the futures-derived numbers per slot.
  const useOdds = req.nextUrl.searchParams.get('weighted') === '1';
  let edgeProb: Record<string, Record<string, number>> | undefined;
  let futuresResolved: Partial<Record<FutureStage, string>> = {};
  if (useOdds) {
    edgeProb = {};
    const now = Date.now();

    // 1. Futures: a per-team one-round advance probability for every round.
    try {
      const futures = await fetchFuturesOdds(now);
      futuresResolved = futures.resolvedSlugs;
      const advance = advanceProbByRound(futures);
      for (const round of Object.keys(SLOTS_PER_ROUND)) {
        const perTeam = advance[round];
        if (!perTeam) continue;
        for (let slot = 0; slot < SLOTS_PER_ROUND[round]; slot++) {
          edgeProb[`${round}-${slot}`] = { ...perTeam };
        }
      }
    } catch {
      /* futures unavailable — head-to-head + even split still apply */
    }

    // 2. Head-to-head per-game markets override futures for known matchups.
    // Knockout games can't draw, so fold the draw evenly into each side.
    try {
      const oddsJson = (await (await fetchOddsRoute()).json()) as { odds?: Record<string, MatchOdds> };
      const oddsByKey = oddsJson.odds ?? {};
      for (const k of knockoutMatches) {
        if (!k.home || !k.away) continue;
        const o = oddsByKey[`${k.round}-${k.slot}`];
        if (!o) continue;
        edgeProb[`${k.round}-${k.slot}`] = {
          [k.home]: o.home + o.draw / 2,
          [k.away]: o.away + o.draw / 2,
        };
      }
    } catch {
      /* head-to-head unavailable — futures + even split still apply */
    }

    if (Object.keys(edgeProb).length === 0) edgeProb = undefined;
  }

  // One scenario-entry per paid entry, with a picks map that holds only the
  // still-undecided bracket slots (decided slots are already in fixedScore).
  let pendingGroupGames = 0;
  const entries: ScenarioEntryInput[] = [];
  for (const user of users) {
    if (user.bracketInvalid) continue; // invalid brackets can't win the pool
    for (let entry = 1; entry <= (user.entriesCount ?? 1); entry++) {
      const matchPicks = user.matchPicks.filter((p) => p.entry === entry);
      const bracketPicks = user.bracketPicks.filter((p) => p.entry === entry);
      pendingGroupGames += matchPicks.filter((p) => !settledMatchIds.has(p.matchId)).length;

      const fixedScore = calculateTotalScore({
        matchPicks,
        bracketPicks,
        matchResults: resultMap,
        bracketResults: bracketMap,
      });
      const maxScore = calculateMaxPossibleScore({
        currentScore: fixedScore,
        matchPicks,
        bracketPicks,
        settledMatchIds,
        settledBracketSlots,
        eliminatedTeams,
      });

      const picks: Record<string, string> = {};
      for (const p of bracketPicks) {
        const key = `${p.round}-${p.slot}`;
        if (!settledBracketSlots.has(key)) picks[key] = p.team;
      }

      entries.push({
        key: `${user.username}#${entry}`,
        username: user.username,
        displayName: user.displayName,
        entry,
        entriesCount: user.entriesCount ?? 1,
        fixedScore,
        maxScore,
        picks,
      });
    }
  }

  const result = computeWinScenarios(tree, entries, { edgeProb });
  const body: WinScenariosResponse = { ...result, pendingGroupGames, futuresResolved };
  return NextResponse.json(body);
}
