// Shared runner for the win-scenarios feature, used by both the admin and the
// public API routes. Always weights games by live Polymarket odds (no 50/50
// fallback): if the markets can't fully price the remaining bracket it returns a
// clear error rather than guessing.

import {
  computeWinScenarios,
  walkScenario,
  expandForcedChain,
  findUnpricedGames,
  validateBracketConsistency,
  ScenarioOddsError,
  type ScenariosResult,
  type ContenderScenario,
  type WalkResult,
} from '@/lib/win-scenarios';
import { buildScenarioOdds } from '@/lib/scenario-odds';
import { loadScenarioInputs } from '@/lib/scenario-data';
import { prisma } from '@/lib/prisma';
import type { FutureStage } from '@/lib/polymarket-futures';

// Contender plus how their odds moved since the last knockout game finished.
export type ContenderWithDelta = ContenderScenario & {
  winDelta: number | null; // percentage-point change in win% (null if no baseline)
  evDelta: number | null;  // dollar change in expected payout
};

export type WinScenariosResponse =
  | (Omit<ScenariosResult, 'contenders'> & {
      contenders: ContenderWithDelta[];
      pendingGroupGames: number;
      futuresResolved: Partial<Record<FutureStage, string>>;
      lastGame: { winner: string; loser: string; round: string } | null;
      hasBaseline: boolean; // is there a prior snapshot to diff against?
      bracketWarnings: string[];
    })
  | { error: string };

export type WalkResponse = (WalkResult & { selectedKey: string }) | { error: string };

type SnapEntry = { win: number; ev: number };

// Freeze the current win%/EV for this results-state (first write wins) and read
// back the previous state's snapshot to diff against.
async function snapshotAndDiff(
  signature: number,
  contenders: ContenderScenario[],
): Promise<{ prev: Record<string, SnapEntry>; hasBaseline: boolean }> {
  const current: Record<string, SnapEntry> = {};
  for (const c of contenders) current[c.key] = { win: c.winPct, ev: c.expectedPayout };

  // Persist this signature's baseline once (no-op if it already exists).
  await prisma.scenarioSnapshot
    .upsert({ where: { signature }, update: {}, create: { signature, payload: JSON.stringify(current) } })
    .catch(() => null);

  const prevRow = await prisma.scenarioSnapshot
    .findFirst({ where: { signature: { lt: signature } }, orderBy: { signature: 'desc' } })
    .catch(() => null);

  let prev: Record<string, SnapEntry> = {};
  if (prevRow) {
    try { prev = JSON.parse(prevRow.payload) as Record<string, SnapEntry>; } catch { prev = {}; }
  }
  return { prev, hasBaseline: !!prevRow };
}

function futuresList(resolved: Partial<Record<FutureStage, string>>): string {
  return Object.entries(resolved).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
}

// Full pool-win breakdown: win %, expected payout, per-champion, etc.
export async function runWinScenarios(): Promise<WinScenariosResponse> {
  const { tree, entries, knockout, pendingGroupGames, payout, decidedCount, lastGame } = await loadScenarioInputs();

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

  let result: ScenariosResult;
  try {
    result = computeWinScenarios(tree, entries, { edgeProb, strict: true, payout });
  } catch (e) {
    if (e instanceof ScenarioOddsError) {
      return { error: `Live odds incomplete — ${e.message}. (Futures: ${futuresList(futuresResolved)}.)` };
    }
    throw e;
  }

  // Movement since the previous knockout result.
  const { prev, hasBaseline } = await snapshotAndDiff(decidedCount, result.contenders);
  const contenders: ContenderWithDelta[] = result.contenders.map((c) => {
    const p = prev[c.key];
    return {
      ...c,
      winDelta: p ? c.winPct - p.win : null,
      evDelta: p ? c.expectedPayout - p.ev : null,
    };
  });

  return {
    ...result,
    contenders,
    pendingGroupGames,
    futuresResolved,
    lastGame,
    hasBaseline,
    bracketWarnings: validateBracketConsistency(tree),
  };
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
