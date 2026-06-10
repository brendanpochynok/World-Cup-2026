import { SCORING } from './worldcup-data';

export interface MatchPickResult {
  matchId: string;
  pick: string;
  actual: string | null;
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

// +1 correct pick, 0 if result was a draw (regardless of pick), -1 if totally wrong
export function calculateMatchPickPoints(
  pick: string,
  actualResult: string | null
): number {
  if (!actualResult) return 0;
  if (actualResult === 'draw') return 0; // draws always score 0 — rules page
  if (pick === actualResult) return SCORING.groupCorrect;
  return SCORING.groupWrong;
}

export function calculateBracketPickPoints(
  round: string,
  pickedTeam: string,
  actualTeam: string | null
): number {
  if (!actualTeam || pickedTeam !== actualTeam) return 0;
  switch (round) {
    case 'R32':   return SCORING.r32;
    case 'R16':   return SCORING.r16;
    case 'QF':    return SCORING.qf;
    case 'SF':    return SCORING.sf;
    case 'Final': return SCORING.final;
    default:      return 0;
  }
}

export function calculateTotalScore(params: {
  matchPicks: Array<{ matchId: string; pick: string }>;
  bracketPicks: Array<{ round: string; slot: number; team: string }>;
  matchResults: Map<string, string>;
  bracketResults: Map<string, string>;
}): number {
  let total = 0;
  for (const mp of params.matchPicks) {
    total += calculateMatchPickPoints(mp.pick, params.matchResults.get(mp.matchId) ?? null);
  }
  for (const bp of params.bracketPicks) {
    const actualTeam = params.bracketResults.get(`${bp.round}-${bp.slot}`) ?? null;
    total += calculateBracketPickPoints(bp.round, bp.team, actualTeam);
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

// Upper bound on a player's final score: current score plus every pick that
// could still come good (unfinished group matches, bracket slots without a
// recorded result).
export function calculateMaxPossibleScore(params: {
  currentScore: number;
  matchPicks: Array<{ matchId: string }>;
  bracketPicks: Array<{ round: string; slot: number }>;
  settledMatchIds: Set<string>;
  settledBracketSlots: Set<string>;
}): number {
  let max = params.currentScore;
  for (const mp of params.matchPicks) {
    if (!params.settledMatchIds.has(mp.matchId)) max += SCORING.groupCorrect;
  }
  for (const bp of params.bracketPicks) {
    if (!params.settledBracketSlots.has(`${bp.round}-${bp.slot}`)) {
      max += ROUND_POINTS[bp.round] ?? 0;
    }
  }
  return max;
}
