// Loads the shared inputs for the win-scenarios engine from the database: the
// bracket tree (seeding + recorded results) and one scenario-entry per paid
// entry, with each entry's realised score, ceiling, and still-undecided picks.
// Used by both the scenarios summary route and the walkthrough route.

import { prisma } from '@/lib/prisma';
import {
  calculateTotalScore,
  calculateMaxPossibleScore,
  computeEliminatedTeams,
} from '@/lib/scoring';
import { calculatePayouts } from '@/lib/payouts';
import type { ScenarioEntryInput, TreeInput, PayoutSchedule } from '@/lib/win-scenarios';
import type { KnockoutFixture } from '@/lib/scenario-odds';

export interface ScenarioInputs {
  tree: TreeInput;
  entries: ScenarioEntryInput[];
  knockout: KnockoutFixture[];
  pendingGroupGames: number;
  payout: PayoutSchedule; // prize split from the live pot
}

export async function loadScenarioInputs(): Promise<ScenarioInputs> {
  const [matchResults, bracketResults, knockoutMatches, users, poolConfig] = await Promise.all([
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
    prisma.poolConfig.findUnique({ where: { id: 1 } }),
  ]);

  // Pot mirrors the standings: entry fee × every paid entry (invalid brackets
  // still paid in, even though they can't take a payout slot).
  const entryFee = poolConfig?.entryFeePerPlayer ?? 0;
  const totalPaidEntries = users.reduce((n, u) => n + (u.entriesCount ?? 1), 0);
  const [first, second] = calculatePayouts(entryFee * totalPaidEntries);
  const payout: PayoutSchedule = { first, second };

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

  const knockout: KnockoutFixture[] = knockoutMatches.map((k) => ({
    round: k.round,
    slot: k.slot,
    home: k.home,
    away: k.away,
  }));

  return { tree, entries, knockout, pendingGroupGames, payout };
}
