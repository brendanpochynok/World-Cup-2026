import { SCORING } from './worldcup-data';

export interface GroupStandingPickResult {
  group: string;
  rank: 1 | 2 | 3 | 4;
  pickedTeam: string;
  actualTeam: string | null;
  points: number;
  correct: boolean;
}

export interface BracketPickResult {
  round: string;
  slot: number;
  team: string;
  actualTeam: string | null;
  points: number;
  correct: boolean;
}

// Calculate points for a single group standing pick position
// rank: 1 = rank1 (1st place), 2 = rank2 (2nd), 3 = rank3 (3rd), 4 = rank4 (4th)
export function calculateGroupRankPoints(
  rank: 1 | 2 | 3 | 4,
  pickedTeam: string,
  actualTeam: string | null
): number {
  if (!actualTeam || pickedTeam !== actualTeam) return 0;
  switch (rank) {
    case 1: return SCORING.groupRank1; // 4 pts
    case 2: return SCORING.groupRank2; // 3 pts
    case 3: return SCORING.groupRank3; // 2 pts
    case 4: return SCORING.groupRank4; // 1 pt
    default: return 0;
  }
}

// Calculate points for a bracket pick
export function calculateBracketPickPoints(
  round: string,
  pickedTeam: string,
  actualTeam: string | null
): number {
  if (!actualTeam) return 0;
  if (pickedTeam !== actualTeam) return 0;

  switch (round) {
    case 'R32':   return SCORING.r32;
    case 'R16':   return SCORING.r16;
    case 'QF':    return SCORING.qf;
    case 'SF':    return SCORING.sf;
    case 'Final': return SCORING.final;
    default:      return 0;
  }
}

// Calculate points for champion pick (Final, slot 0)
export function calculateChampionPickPoints(
  pickedTeam: string,
  actualChampion: string | null
): number {
  if (!actualChampion) return 0;
  return pickedTeam === actualChampion ? SCORING.champion : 0;
}

// Calculate total score for a user
export function calculateTotalScore(params: {
  groupStandingPicks: Array<{ group: string; rank1: string; rank2: string; rank3: string; rank4: string }>;
  bracketPicks: Array<{ round: string; slot: number; team: string }>;
  // Actual group standings: group => [1st, 2nd, 3rd, 4th]
  actualGroupStandings: Map<string, [string, string, string, string]>;
  // Actual bracket results: "round-slot" => team
  bracketResults: Map<string, string>;
  // Actual champion team (Final winner)
  champion: string | null;
}): number {
  let total = 0;

  // Group standing picks
  for (const gsp of params.groupStandingPicks) {
    const actual = params.actualGroupStandings.get(gsp.group);
    if (actual) {
      total += calculateGroupRankPoints(1, gsp.rank1, actual[0]);
      total += calculateGroupRankPoints(2, gsp.rank2, actual[1]);
      total += calculateGroupRankPoints(3, gsp.rank3, actual[2]);
      total += calculateGroupRankPoints(4, gsp.rank4, actual[3]);
    }
  }

  // Bracket picks
  for (const bp of params.bracketPicks) {
    const key = `${bp.round}-${bp.slot}`;
    const actualTeam = params.bracketResults.get(key) ?? null;
    total += calculateBracketPickPoints(bp.round, bp.team, actualTeam);
  }

  // Champion pick (Final, slot 0)
  const finalPick = params.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0);
  if (finalPick && params.champion) {
    total += calculateChampionPickPoints(finalPick.team, params.champion);
  }

  return total;
}

export const ROUND_POINTS: Record<string, number> = {
  R32:   SCORING.r32,
  R16:   SCORING.r16,
  QF:    SCORING.qf,
  SF:    SCORING.sf,
  Final: SCORING.final,
};
