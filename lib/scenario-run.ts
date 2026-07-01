// Shared runner for the win-scenarios feature, used by both the admin and the
// public API routes. Always weights games by live Polymarket odds (no 50/50
// fallback): if the markets can't fully price the remaining bracket it returns a
// clear error rather than guessing.

import {
  computeWinScenarios,
  walkScenario,
  expandForcedChain,
  findUnpricedGames,
  ScenarioOddsError,
  type ScenariosResult,
  type WalkResult,
} from '@/lib/win-scenarios';
import { buildScenarioOdds } from '@/lib/scenario-odds';
import { loadScenarioInputs } from '@/lib/scenario-data';
import type { FutureStage } from '@/lib/polymarket-futures';

export type WinScenariosResponse =
  | (ScenariosResult & {
      pendingGroupGames: number;
      futuresResolved: Partial<Record<FutureStage, string>>;
    })
  | { error: string };

export type WalkResponse = (WalkResult & { selectedKey: string }) | { error: string };

function futuresList(resolved: Partial<Record<FutureStage, string>>): string {
  return Object.entries(resolved).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
}

// Full pool-win breakdown: win %, expected payout, per-champion, etc.
export async function runWinScenarios(): Promise<WinScenariosResponse> {
  const { tree, entries, knockout, pendingGroupGames, payout } = await loadScenarioInputs();

  const built = await buildScenarioOdds(knockout, Date.now());
  const futuresResolved = built.futuresResolved;
  const edgeProb = Object.keys(built.edgeProb).length > 0 ? built.edgeProb : undefined;
  if (!edgeProb) {
    return { error: 'Live odds are unavailable right now — please try again in a minute.' };
  }

  // Every undecided game must be priced; report all gaps at once.
  const gaps = findUnpricedGames(tree, edgeProb);
  if (gaps.length > 0) {
    const teams = Array.from(new Set(gaps.flatMap((g) => g.missing))).sort();
    return {
      error:
        `Live odds incomplete — no Polymarket price for ${teams.length} team` +
        `${teams.length !== 1 ? 's' : ''}: ${teams.join(', ')}. ` +
        `(Resolved futures markets: ${futuresList(futuresResolved)}.)`,
    };
  }

  try {
    const result = computeWinScenarios(tree, entries, { edgeProb, strict: true, payout });
    return { ...result, pendingGroupGames, futuresResolved };
  } catch (e) {
    if (e instanceof ScenarioOddsError) {
      return { error: `Live odds incomplete — ${e.message}. (Futures: ${futuresList(futuresResolved)}.)` };
    }
    throw e;
  }
}

// One entry's walkthrough given a path of already-chosen game winners.
export async function runWalk(
  selectedKey: string,
  path: { key: string; team: string }[],
): Promise<WalkResponse> {
  const { tree, entries, knockout, payout } = await loadScenarioInputs();
  const built = await buildScenarioOdds(knockout, Date.now());
  const edgeProb = Object.keys(built.edgeProb).length > 0 ? built.edgeProb : undefined;

  const forced: Record<string, string> = {};
  for (const step of path) {
    if (!step?.key || !step?.team) continue;
    Object.assign(forced, expandForcedChain(tree, step.key, step.team));
  }

  const result = walkScenario(tree, entries, { selectedKey, forced, edgeProb, payout });
  return { ...result, selectedKey };
}
