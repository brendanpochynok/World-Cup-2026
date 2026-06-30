// Builds the per-game win-probability map (edgeProb) used to weight the win
// scenarios, from two Polymarket sources: head-to-head game markets for the next
// round (most precise) and the reach-stage / outright-winner futures for every
// deeper round. Shared by the scenarios summary route and the walkthrough route.

import { GET as fetchOddsRoute } from '@/app/api/odds/route';
import type { MatchOdds } from '@/app/api/odds/route';
import { fetchFuturesOdds, advanceProbByRound, type FutureStage } from '@/lib/polymarket-futures';

const SLOTS_PER_ROUND: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

export interface KnockoutFixture {
  round: string;
  slot: number;
  home: string | null;
  away: string | null;
}

export interface ScenarioOdds {
  edgeProb: Record<string, Record<string, number>>;
  futuresResolved: Partial<Record<FutureStage, string>>;
}

// Returns the weighting map plus which futures markets resolved. Best-effort:
// any source that fails just contributes nothing (the caller decides whether a
// gap is fatal via findUnpricedGames).
export async function buildScenarioOdds(knockout: KnockoutFixture[], now: number): Promise<ScenarioOdds> {
  const edgeProb: Record<string, Record<string, number>> = {};
  let futuresResolved: Partial<Record<FutureStage, string>> = {};

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
    /* futures unavailable */
  }

  // 2. Head-to-head per-game markets override futures for known matchups.
  // Knockout games can't draw, so fold the draw evenly into each side.
  try {
    const oddsJson = (await (await fetchOddsRoute()).json()) as { odds?: Record<string, MatchOdds> };
    const oddsByKey = oddsJson.odds ?? {};
    for (const k of knockout) {
      if (!k.home || !k.away) continue;
      const o = oddsByKey[`${k.round}-${k.slot}`];
      if (!o) continue;
      edgeProb[`${k.round}-${k.slot}`] = {
        [k.home]: o.home + o.draw / 2,
        [k.away]: o.away + o.draw / 2,
      };
    }
  } catch {
    /* head-to-head unavailable */
  }

  return { edgeProb, futuresResolved };
}
