// Combinatorial "who can still win the pool" engine.
//
// Given the current bracket state (real R32 seeding, recorded results) and every
// entry's picks, it walks the space of all possible ways the remaining knockout
// games could play out and works out, for each entry, in what fraction of those
// futures they finish first (alone or tied). Small remaining brackets are solved
// exactly by enumerating every completion; large ones fall back to Monte-Carlo
// sampling. Every game is treated as a 50/50 coin flip, so the percentages are a
// pure count of *scenarios*, not odds-weighted probabilities.

import { ROUND_POINTS } from './scoring';

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
const SLOTS_PER_ROUND: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };
const CHAMPION_KEY = 'Final-0';

// Enumerate exactly while the number of genuinely-undecided games keeps the
// completion count at or under this; otherwise sample.
const EXACT_MAX_LEAVES = 1 << 20; // ~1.05M
const MONTE_CARLO_SAMPLES = 500_000;

export interface ScenarioEntryInput {
  key: string;                 // stable id, e.g. "poch#1"
  username: string;
  displayName: string | null;
  entry: number;
  entriesCount: number;
  fixedScore: number;          // realised score: settled matches + decided bracket slots
  maxScore: number;            // upper bound used to prune hopeless entries
  picks: Record<string, string>; // slotKey "R16-3" -> picked team (undecided slots only)
}

export interface TreeInput {
  r32: Record<number, [string, string]>; // real R32 seeding by slot
  decided: Record<string, string>;       // slotKey -> recorded winner
}

export interface ContenderScenario {
  key: string;
  username: string;
  displayName: string | null;
  entry: number;
  entriesCount: number;
  fixedScore: number;
  maxScore: number;
  winPct: number;       // % of scenarios finishing first (alone or tied)
  soleWinPct: number;   // % of scenarios finishing first alone
  status: 'clinched' | 'contender';
  aliveChampions: string[]; // tournament champions under which this entry can still win
}

export interface ChampionScenario {
  champion: string;     // the team that lifts the trophy (Final winner)
  pct: number;          // share of scenarios with this champion
  winners: { key: string; displayName: string; winPct: number }[]; // pool winners given this champion
}

export interface ScenariosResult {
  method: 'exact' | 'monte-carlo';
  weighted: boolean;        // true → games weighted by live odds, false → 50/50
  scenarios: number;        // exact completion count or sample count
  branchingGames: number;   // undecided games that actually flip a coin
  oddsGames: number;        // branching games that had live odds applied
  totalEntries: number;
  eliminatedCount: number;
  contenders: ContenderScenario[];
  byChampion: ChampionScenario[];
}

export interface ScenariosOptions {
  // slotKey -> team -> win probability (0–1). Used to weight that game instead
  // of a coin flip. Missing slots/teams fall back to an even split.
  edgeProb?: Record<string, Record<string, number>>;
  // When true, refuse to coin-flip: if any game can't be priced from edgeProb,
  // throw ScenarioOddsError instead of falling back to an even split.
  strict?: boolean;
}

// Thrown in strict mode when a game has no live odds for its participants.
export class ScenarioOddsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioOddsError';
  }
}

interface SlotNode {
  round: string;
  slot: number;
  key: string;
  decidedTeam: string | null; // recorded winner, if any
  feedA: string | null;       // prev-round slot key feeding side A (null for R32)
  feedB: string | null;
  points: number;
}

// Topologically-ordered slots: R32 first (so a slot's feeders are always
// resolved before it), then R16 … Final.
function buildSlotOrder(tree: TreeInput): SlotNode[] {
  const nodes: SlotNode[] = [];
  for (let ri = 0; ri < ROUND_ORDER.length; ri++) {
    const round = ROUND_ORDER[ri];
    const prev = ri > 0 ? ROUND_ORDER[ri - 1] : null;
    for (let slot = 0; slot < SLOTS_PER_ROUND[round]; slot++) {
      nodes.push({
        round,
        slot,
        key: `${round}-${slot}`,
        decidedTeam: tree.decided[`${round}-${slot}`] ?? null,
        feedA: prev ? `${prev}-${slot * 2}` : null,
        feedB: prev ? `${prev}-${slot * 2 + 1}` : null,
        points: ROUND_POINTS[round] ?? 0,
      });
    }
  }
  return nodes;
}

// Every team that could still appear in each slot, given the seeding, recorded
// results, and the bracket tree. A decided slot resolves to its winner; an
// undecided slot's reachable set is the union of its two feeders' reachable sets
// (R32 reads the seeding pair). Returns slotKey -> set of possible teams.
export function reachableTeams(tree: TreeInput): Map<string, Set<string>> {
  const reach = new Map<string, Set<string>>();
  const nodes = buildSlotOrder(tree); // topological: feeders before the slot
  for (const node of nodes) {
    if (node.decidedTeam) {
      reach.set(node.key, new Set([node.decidedTeam]));
      continue;
    }
    const set = new Set<string>();
    if (node.round === 'R32') {
      const seed = tree.r32[node.slot];
      if (seed?.[0]) set.add(seed[0]);
      if (seed?.[1]) set.add(seed[1]);
    } else {
      for (const feed of [node.feedA, node.feedB]) {
        if (feed) for (const t of Array.from(reach.get(feed) ?? [])) set.add(t);
      }
    }
    reach.set(node.key, set);
  }
  return reach;
}

// Undecided games where some possible participant has no odds in edgeProb.
// Lets the caller report every gap up front instead of one error per request.
export function findUnpricedGames(
  tree: TreeInput,
  edgeProb: Record<string, Record<string, number>>,
): { round: string; slot: number; missing: string[] }[] {
  const reach = reachableTeams(tree);
  const out: { round: string; slot: number; missing: string[] }[] = [];
  for (const round of ROUND_ORDER) {
    for (let slot = 0; slot < SLOTS_PER_ROUND[round]; slot++) {
      const key = `${round}-${slot}`;
      if (tree.decided[key]) continue;              // already resolved
      const teams = Array.from(reach.get(key) ?? []);
      if (teams.length < 2) continue;               // not a real game (yet)
      const priced = edgeProb[key] ?? {};
      const missing = teams.filter((t) => typeof priced[t] !== 'number');
      if (missing.length > 0) out.push({ round, slot, missing });
    }
  }
  return out;
}

// The two teams that can win a slot given the winners chosen so far. R32 reads
// the real seeding; later rounds read whoever advanced from the two feeders.
function participantsOf(
  node: SlotNode,
  tree: TreeInput,
  winners: Map<string, string | null>,
): string[] {
  let a: string | null;
  let b: string | null;
  if (node.round === 'R32') {
    const seed = tree.r32[node.slot];
    a = seed?.[0] ?? null;
    b = seed?.[1] ?? null;
  } else {
    a = node.feedA ? winners.get(node.feedA) ?? null : null;
    b = node.feedB ? winners.get(node.feedB) ?? null : null;
  }
  const out: string[] = [];
  if (a) out.push(a);
  if (b && b !== a) out.push(b);
  return out;
}

export function computeWinScenarios(
  tree: TreeInput,
  entries: ScenarioEntryInput[],
  opts: ScenariosOptions = {},
): ScenariosResult {
  const totalEntries = entries.length;
  const edgeProb = opts.edgeProb;
  const weighted = !!edgeProb;
  const strict = !!opts.strict;

  // An entry can only ever finish first if its ceiling reaches the highest
  // *guaranteed* score in the pool — anyone below that is mathematically out.
  const floor = entries.reduce((m, e) => Math.max(m, e.fixedScore), 0);
  const contenders = entries.filter((e) => e.maxScore >= floor);
  const eliminatedCount = totalEntries - contenders.length;

  const nodes = buildSlotOrder(tree);

  // Win probabilities for a slot's participants, aligned to `parts`. Falls back
  // to an even split when no odds are supplied for that game.
  const probsFor = (key: string, parts: string[]): number[] => {
    if (parts.length <= 1) return parts.map(() => 1);
    const ep = edgeProb?.[key];
    if (ep) {
      const vals = parts.map((t) => (typeof ep[t] === 'number' ? Math.max(0, ep[t]) : NaN));
      // Need every participant priced to weight the game cleanly.
      if (vals.every((v) => !isNaN(v))) {
        const sum = vals.reduce((a, b) => a + b, 0);
        if (sum > 0) return vals.map((v) => v / sum);
      }
    }
    if (strict) {
      const missing = parts.filter((t) => !(typeof edgeProb?.[key]?.[t] === 'number'));
      throw new ScenarioOddsError(
        `No live odds for ${missing.join(' / ') || parts.join(' v ')} at ${key}`,
      );
    }
    return parts.map(() => 1 / parts.length);
  };
  const hasOdds = (key: string, parts: string[]): boolean =>
    weighted && parts.length >= 2 && !!edgeProb?.[key] && parts.some((t) => typeof edgeProb![key][t] === 'number');

  // Per slot, which contenders picked which team — so assigning a winner is an
  // O(pickers) score update rather than a scan of every entry.
  const pickIndex = new Map<string, Map<string, number[]>>();
  for (const node of nodes) {
    const byTeam = new Map<string, number[]>();
    for (let i = 0; i < contenders.length; i++) {
      const team = contenders[i].picks[node.key];
      if (!team) continue;
      (byTeam.get(team) ?? byTeam.set(team, []).get(team)!).push(i);
    }
    if (byTeam.size > 0) pickIndex.set(node.key, byTeam);
  }

  // How many slots actually flip a coin (undecided AND two live candidates)?
  // Drives the exact-vs-sample decision and is reported to the admin. Also count
  // how many of those games have live odds we can weight by.
  const winnersProbe = new Map<string, string | null>();
  let branchingGames = 0;
  let oddsGames = 0;
  for (const node of nodes) {
    const parts = participantsOf(node, tree, winnersProbe);
    if (node.decidedTeam) {
      winnersProbe.set(node.key, node.decidedTeam);
    } else if (parts.length >= 2) {
      branchingGames++;
      if (hasOdds(node.key, parts)) oddsGames++;
      winnersProbe.set(node.key, parts[0]); // arbitrary for the probe walk
    } else {
      winnersProbe.set(node.key, parts[0] ?? null);
    }
  }

  const useExact = branchingGames <= 30 && Math.pow(2, branchingGames) <= EXACT_MAX_LEAVES;

  const C = contenders.length;
  const score = new Array<number>(C);
  for (let i = 0; i < C; i++) score[i] = contenders[i].fixedScore;

  // Tallies. Each completion contributes its probability `weight` (1 for an
  // even-odds completion or a single Monte-Carlo sample), so weighted and
  // unweighted runs share the same code.
  let scenarios = 0;     // integer count of completions / samples
  let totalWeight = 0;   // summed weight (≈1 for weighted exact, = scenarios otherwise)
  const winCount = new Array<number>(C).fill(0);
  const soleWinCount = new Array<number>(C).fill(0);
  const championTotals = new Map<string, number>();
  const championWins = new Map<string, number[]>(); // champion -> per-contender win weight

  const recordLeaf = (winners: Map<string, string | null>, weight: number) => {
    scenarios++;
    totalWeight += weight;
    let best = -Infinity;
    for (let i = 0; i < C; i++) if (score[i] > best) best = score[i];
    let leaders = 0;
    for (let i = 0; i < C; i++) if (score[i] === best) leaders++;
    const champion = winners.get(CHAMPION_KEY) ?? null;
    let champArr: number[] | undefined;
    if (champion) {
      championTotals.set(champion, (championTotals.get(champion) ?? 0) + weight);
      champArr = championWins.get(champion);
      if (!champArr) { champArr = new Array<number>(C).fill(0); championWins.set(champion, champArr); }
    }
    for (let i = 0; i < C; i++) {
      if (score[i] !== best) continue;
      winCount[i] += weight;
      if (leaders === 1) soleWinCount[i] += weight;
      if (champArr) champArr[i] += weight;
    }
  };

  // Apply / undo a slot's contribution to running contender scores.
  const apply = (key: string, team: string | null, sign: number) => {
    if (!team) return;
    const byTeam = pickIndex.get(key);
    const idxs = byTeam?.get(team);
    if (!idxs) return;
    const pts = nodesByKey.get(key)!.points;
    for (const i of idxs) score[i] += sign * pts;
  };

  const nodesByKey = new Map(nodes.map((n) => [n.key, n]));

  if (useExact) {
    const winners = new Map<string, string | null>();
    // Each completion's weight is the product of the chosen game probabilities.
    const dfs = (idx: number, weight: number) => {
      if (idx === nodes.length) { recordLeaf(winners, weight); return; }
      const node = nodes[idx];
      if (node.decidedTeam) {
        winners.set(node.key, node.decidedTeam);
        dfs(idx + 1, weight);
        winners.delete(node.key);
        return;
      }
      const parts = participantsOf(node, tree, winners);
      if (parts.length === 0) {
        winners.set(node.key, null);
        dfs(idx + 1, weight);
        winners.delete(node.key);
        return;
      }
      const probs = probsFor(node.key, parts);
      for (let j = 0; j < parts.length; j++) {
        const team = parts[j];
        winners.set(node.key, team);
        apply(node.key, team, +1);
        dfs(idx + 1, weight * probs[j]);
        apply(node.key, team, -1);
      }
      winners.delete(node.key);
    };
    dfs(0, 1);
  } else {
    const winners = new Map<string, string | null>();
    for (let s = 0; s < MONTE_CARLO_SAMPLES; s++) {
      const applied: Array<[string, string]> = [];
      for (const node of nodes) {
        let team: string | null;
        if (node.decidedTeam) {
          team = node.decidedTeam;
        } else {
          const parts = participantsOf(node, tree, winners);
          if (parts.length === 0) {
            team = null;
          } else {
            // Sample a winner weighted by the game's odds (even split otherwise).
            const probs = probsFor(node.key, parts);
            let r = Math.random();
            let j = 0;
            while (j < probs.length - 1 && r >= probs[j]) { r -= probs[j]; j++; }
            team = parts[j];
          }
        }
        winners.set(node.key, team);
        if (team) { apply(node.key, team, +1); applied.push([node.key, team]); }
      }
      recordLeaf(winners, 1);
      for (const [key, team] of applied) apply(key, team, -1);
      winners.clear();
    }
  }

  const pctOf = (n: number) => (totalWeight > 0 ? (n / totalWeight) * 100 : 0);
  const CLINCH_EPS = 1e-9;

  const out: ContenderScenario[] = contenders.map((e, i) => {
    const aliveChampions: string[] = [];
    for (const [champ, arr] of Array.from(championWins)) if (arr[i] > 0) aliveChampions.push(champ);
    aliveChampions.sort(
      (a, b) => (championWins.get(b)![i]) - (championWins.get(a)![i]),
    );
    return {
      key: e.key,
      username: e.username,
      displayName: e.displayName,
      entry: e.entry,
      entriesCount: e.entriesCount,
      fixedScore: e.fixedScore,
      maxScore: e.maxScore,
      winPct: pctOf(winCount[i]),
      soleWinPct: pctOf(soleWinCount[i]),
      status: totalWeight > 0 && winCount[i] >= totalWeight - CLINCH_EPS ? 'clinched' : 'contender',
      aliveChampions,
    };
  });
  out.sort((a, b) => b.winPct - a.winPct || b.fixedScore - a.fixedScore || a.username.localeCompare(b.username));

  const labelOf = (e: { displayName: string | null; username: string; entriesCount: number; entry: number }) =>
    (e.displayName || e.username) + (e.entriesCount > 1 ? ` (#${e.entry})` : '');

  const byChampion: ChampionScenario[] = Array.from(championTotals.entries())
    .map(([champion, total]) => {
      const arr = championWins.get(champion)!;
      const winners = contenders
        .map((e, i) => ({
          key: e.key,
          displayName: labelOf(e),
          winPct: total > 0 ? (arr[i] / total) * 100 : 0,
        }))
        .filter((w) => w.winPct > 0)
        .sort((a, b) => b.winPct - a.winPct);
      return { champion, pct: pctOf(total), winners };
    })
    .sort((a, b) => b.pct - a.pct);

  return {
    method: useExact ? 'exact' : 'monte-carlo',
    weighted,
    scenarios,
    branchingGames,
    oddsGames,
    totalEntries,
    eliminatedCount,
    contenders: out,
    byChampion,
  };
}

// ── Scenario walkthrough ──────────────────────────────────────────────────────
// Steps a single entry through the games that actually decide their fate: at
// each step it surfaces the most decisive remaining game and, for each way it
// could go, the entry's resulting win chance — so the admin can click down a
// path ("England win it all → you're in; then who wins the other semi?").

export interface WalkBranch {
  team: string;
  winPct: number;            // selected entry's win chance if this team wins the slot
  share: number;             // % of the current sub-space where this team wins it
  terminal: 'win' | 'lose' | null; // resolves the entry's fate outright?
}

export interface WalkResult {
  winPct: number;            // selected entry's win chance on the current path
  status: 'clinched' | 'dead' | 'pivotal' | 'tossup';
  scenarios: number;
  method: 'exact' | 'monte-carlo';
  pivotal?: { round: string; slot: number; key: string; branches: WalkBranch[] };
}

// Force a team to win a slot by forcing every game on its path up to that slot —
// a team can only win round R if it won every earlier round, so this keeps the
// constraint self-consistent (and lets sampling avoid rejection).
export function expandForcedChain(tree: TreeInput, key: string, team: string): Record<string, string> {
  const dash = key.lastIndexOf('-');
  const targetRound = key.slice(0, dash);
  const targetSlot = parseInt(key.slice(dash + 1), 10);
  let r32slot = -1;
  for (const s of Object.keys(tree.r32)) {
    const [a, b] = tree.r32[Number(s)];
    if (a === team || b === team) { r32slot = Number(s); break; }
  }
  if (r32slot < 0) return { [key]: team }; // unknown seeding — force just the slot
  const out: Record<string, string> = {};
  let slot = r32slot;
  for (const round of ROUND_ORDER) {
    out[`${round}-${slot}`] = team;
    if (round === targetRound) {
      if (slot !== targetSlot) return { [key]: team }; // inconsistent pick — fall back
      break;
    }
    slot = Math.floor(slot / 2);
  }
  return out;
}

export function walkScenario(
  tree: TreeInput,
  entries: ScenarioEntryInput[],
  opts: { selectedKey: string; forced?: Record<string, string>; edgeProb?: Record<string, Record<string, number>> },
): WalkResult {
  const forced = opts.forced ?? {};
  const edgeProb = opts.edgeProb;
  const floor = entries.reduce((m, e) => Math.max(m, e.fixedScore), 0);
  const contenders = entries.filter((e) => e.maxScore >= floor);
  const sel = contenders.findIndex((c) => c.key === opts.selectedKey);
  if (sel < 0) return { winPct: 0, status: 'dead', scenarios: 0, method: 'exact' };

  const nodes = buildSlotOrder(tree);
  const nodesByKey = new Map(nodes.map((n) => [n.key, n]));
  const C = contenders.length;

  const pickIndex = new Map<string, Map<string, number[]>>();
  for (const node of nodes) {
    const byTeam = new Map<string, number[]>();
    for (let i = 0; i < C; i++) {
      const team = contenders[i].picks[node.key];
      if (!team) continue;
      (byTeam.get(team) ?? byTeam.set(team, []).get(team)!).push(i);
    }
    if (byTeam.size > 0) pickIndex.set(node.key, byTeam);
  }

  const probsFor = (key: string, parts: string[]): number[] => {
    if (parts.length <= 1) return parts.map(() => 1);
    const ep = edgeProb?.[key];
    if (ep) {
      const vals = parts.map((t) => (typeof ep[t] === 'number' ? Math.max(0, ep[t]) : NaN));
      if (vals.every((v) => !isNaN(v))) {
        const sum = vals.reduce((a, b) => a + b, 0);
        if (sum > 0) return vals.map((v) => v / sum);
      }
    }
    return parts.map(() => 1 / parts.length);
  };

  // Free games = undecided and not pinned by the current path; these are what we
  // bucket on to find the next decisive game.
  const freeKeys = nodes.filter((n) => !n.decidedTeam && !(n.key in forced)).map((n) => n.key);
  const probe = new Map<string, string | null>();
  let freeBranch = 0;
  for (const node of nodes) {
    const parts = participantsOf(node, tree, probe);
    if (node.decidedTeam) probe.set(node.key, node.decidedTeam);
    else if (node.key in forced) probe.set(node.key, forced[node.key]);
    else { if (parts.length >= 2) freeBranch++; probe.set(node.key, parts[0] ?? null); }
  }
  const useExact = freeBranch <= 30 && Math.pow(2, freeBranch) <= EXACT_MAX_LEAVES;

  const score = new Array<number>(C);
  for (let i = 0; i < C; i++) score[i] = contenders[i].fixedScore;
  const apply = (key: string, team: string | null, sign: number) => {
    if (!team) return;
    const idxs = pickIndex.get(key)?.get(team);
    if (!idxs) return;
    const pts = nodesByKey.get(key)!.points;
    for (const i of idxs) score[i] += sign * pts;
  };

  let total = 0;
  let selWins = 0;
  const bucket = new Map<string, Map<string, { total: number; wins: number }>>();

  const recordLeaf = (winners: Map<string, string | null>, weight: number) => {
    total += weight;
    let best = -Infinity;
    for (let i = 0; i < C; i++) if (score[i] > best) best = score[i];
    const won = score[sel] === best;
    if (won) selWins += weight;
    for (const key of freeKeys) {
      const t = winners.get(key);
      if (!t) continue;
      let m = bucket.get(key);
      if (!m) { m = new Map(); bucket.set(key, m); }
      let c = m.get(t);
      if (!c) { c = { total: 0, wins: 0 }; m.set(t, c); }
      c.total += weight;
      if (won) c.wins += weight;
    }
  };

  if (useExact) {
    const winners = new Map<string, string | null>();
    const dfs = (idx: number, weight: number) => {
      if (idx === nodes.length) { recordLeaf(winners, weight); return; }
      const node = nodes[idx];
      const pin = node.decidedTeam ?? (node.key in forced ? forced[node.key] : null);
      if (pin) {
        const parts = participantsOf(node, tree, winners);
        // A forced winner that can't actually reach this slot kills the branch.
        if (node.key in forced && !node.decidedTeam && parts.length > 0 && !parts.includes(pin)) return;
        winners.set(node.key, pin);
        apply(node.key, pin, +1);
        dfs(idx + 1, weight);
        apply(node.key, pin, -1);
        winners.delete(node.key);
        return;
      }
      const parts = participantsOf(node, tree, winners);
      if (parts.length === 0) {
        winners.set(node.key, null);
        dfs(idx + 1, weight);
        winners.delete(node.key);
        return;
      }
      const probs = probsFor(node.key, parts);
      for (let j = 0; j < parts.length; j++) {
        winners.set(node.key, parts[j]);
        apply(node.key, parts[j], +1);
        dfs(idx + 1, weight * probs[j]);
        apply(node.key, parts[j], -1);
      }
      winners.delete(node.key);
    };
    dfs(0, 1);
  } else {
    const winners = new Map<string, string | null>();
    for (let s = 0; s < MONTE_CARLO_SAMPLES; s++) {
      const applied: Array<[string, string]> = [];
      let valid = true;
      for (const node of nodes) {
        let team: string | null;
        const pin = node.decidedTeam ?? (node.key in forced ? forced[node.key] : null);
        if (pin) {
          const parts = participantsOf(node, tree, winners);
          if (node.key in forced && !node.decidedTeam && parts.length > 0 && !parts.includes(pin)) { valid = false; break; }
          team = pin;
        } else {
          const parts = participantsOf(node, tree, winners);
          if (parts.length === 0) team = null;
          else {
            const probs = probsFor(node.key, parts);
            let r = Math.random();
            let j = 0;
            while (j < probs.length - 1 && r >= probs[j]) { r -= probs[j]; j++; }
            team = parts[j];
          }
        }
        winners.set(node.key, team);
        if (team) { apply(node.key, team, +1); applied.push([node.key, team]); }
      }
      if (valid) recordLeaf(winners, 1);
      for (const [key, team] of applied) apply(key, team, -1);
      winners.clear();
    }
  }

  const method = useExact ? 'exact' : 'monte-carlo';
  if (total <= 0) return { winPct: 0, status: 'dead', scenarios: 0, method };
  const winPct = (selWins / total) * 100;
  const EPS = 1e-6;
  if (selWins <= EPS) return { winPct: 0, status: 'dead', scenarios: total | 0, method };
  if (selWins >= total - EPS) return { winPct: 100, status: 'clinched', scenarios: total | 0, method };

  // Pick the free game whose outcomes most spread the entry's win chance.
  let bestKey: string | null = null;
  let bestSpread = -1;
  for (const [key, m] of Array.from(bucket)) {
    const teams = Array.from(m.entries()).filter(([, c]) => c.total >= 0.02 * total);
    if (teams.length < 2) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [, c] of teams) {
      const r = c.wins / c.total;
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
    const spread = hi - lo;
    const pts = nodesByKey.get(key)!.points;
    // Prefer the biggest swing; on ties prefer the higher-value (later) round.
    if (spread > bestSpread + 1e-9 || (Math.abs(spread - bestSpread) <= 1e-9 && bestKey && pts > nodesByKey.get(bestKey)!.points)) {
      bestSpread = spread;
      bestKey = key;
    }
  }

  if (!bestKey || bestSpread < 0.005) {
    return { winPct, status: 'tossup', scenarios: total | 0, method };
  }

  const node = nodesByKey.get(bestKey)!;
  const m = bucket.get(bestKey)!;
  const branches: WalkBranch[] = Array.from(m.entries())
    .filter(([, c]) => c.total >= 0.02 * total)
    .map(([team, c]) => {
      const wp = (c.wins / c.total) * 100;
      return {
        team,
        winPct: wp,
        share: (c.total / total) * 100,
        terminal: wp >= 100 - 1e-6 ? 'win' : wp <= 1e-6 ? 'lose' : null,
      } as WalkBranch;
    })
    .sort((a, b) => b.winPct - a.winPct);

  return {
    winPct,
    status: 'pivotal',
    scenarios: total | 0,
    method,
    pivotal: { round: node.round, slot: node.slot, key: bestKey, branches },
  };
}
