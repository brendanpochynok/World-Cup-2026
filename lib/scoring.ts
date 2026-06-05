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

// +1 correct pick, -1 wrong pick on decisive result, 0 if match drew and you didn't pick draw
export function calculateMatchPickPoints(
  pick: string,
  actualResult: string | null
): number {
  if (!actualResult) return 0;
  if (pick === actualResult) return SCORING.groupCorrect;
  if (actualResult === 'draw') return SCORING.groupDrawNoCall;
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

export function calculateChampionPickPoints(
  pickedTeam: string,
  actualChampion: string | null
): number {
  if (!actualChampion) return 0;
  return pickedTeam === actualChampion ? SCORING.champion : 0;
}

export function calculateTotalScore(params: {
  matchPicks: Array<{ matchId: string; pick: string }>;
  bracketPicks: Array<{ round: string; slot: number; team: string }>;
  // matchId -> "home"|"draw"|"away"
  matchResults: Map<string, string>;
  // "round-slot" -> team
  bracketResults: Map<string, string>;
  champion: string | null;
}): number {
  let total = 0;

  for (const mp of params.matchPicks) {
    const actual = params.matchResults.get(mp.matchId) ?? null;
    total += calculateMatchPickPoints(mp.pick, actual);
  }

  for (const bp of params.bracketPicks) {
    const actualTeam = params.bracketResults.get(`${bp.round}-${bp.slot}`) ?? null;
    total += calculateBracketPickPoints(bp.round, bp.team, actualTeam);
  }

  const finalPick = params.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0);
  if (finalPick) total += calculateChampionPickPoints(finalPick.team, params.champion);

  return total;
}

export const ROUND_POINTS: Record<string, number> = {
  R32:   SCORING.r32,
  R16:   SCORING.r16,
  QF:    SCORING.qf,
  SF:    SCORING.sf,
  Final: SCORING.final,
};
