import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  computeWinScenarios,
  findUnpricedGames,
  ScenarioOddsError,
  type ScenariosResult,
} from '@/lib/win-scenarios';
import { buildScenarioOdds } from '@/lib/scenario-odds';
import { loadScenarioInputs } from '@/lib/scenario-data';
import type { FutureStage } from '@/lib/polymarket-futures';

export const dynamic = 'force-dynamic';

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

  const { tree, entries, knockout, pendingGroupGames } = await loadScenarioInputs();

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
    const built = await buildScenarioOdds(knockout, Date.now());
    futuresResolved = built.futuresResolved;
    edgeProb = Object.keys(built.edgeProb).length > 0 ? built.edgeProb : undefined;
  }

  // In odds mode, refuse to coin-flip: if any game can't be priced, error out
  // (rather than silently mixing in 50/50 guesses) so the admin can fix the slug
  // / team alias, or fall back to the combinatorics view deliberately. Report
  // every gap at once so name mismatches don't surface one round-trip at a time.
  if (useOdds && edgeProb) {
    const gaps = findUnpricedGames(tree, edgeProb);
    if (gaps.length > 0) {
      const teams = Array.from(new Set(gaps.flatMap((g) => g.missing))).sort();
      const found = Object.entries(futuresResolved).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
      return NextResponse.json({
        error:
          `Live odds incomplete — no Polymarket price for ${teams.length} team` +
          `${teams.length !== 1 ? 's' : ''}: ${teams.join(', ')}. ` +
          `These are usually name mismatches between our data and Polymarket. ` +
          `Resolved futures markets: ${found}. Add an alias, or use the 50/50 view.`,
      });
    }
  }

  let result: ScenariosResult;
  try {
    result = computeWinScenarios(tree, entries, { edgeProb, strict: useOdds });
  } catch (e) {
    if (e instanceof ScenarioOddsError) {
      const found = Object.entries(futuresResolved).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
      return NextResponse.json({
        error: `Live odds incomplete — ${e.message}. Resolved futures markets: ${found}. ` +
          `Check the Polymarket slug env vars, or use the 50/50 view.`,
      });
    }
    throw e;
  }

  const body: WinScenariosResponse = { ...result, pendingGroupGames, futuresResolved };
  return NextResponse.json(body);
}
