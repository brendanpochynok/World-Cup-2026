// Polymarket *futures* odds for the World Cup: each team's probability of
// reaching a given stage, plus the outright "wins the tournament" market.
//
// These let the win-scenarios engine weight knockout games it has no head-to-head
// market for (every round past the next one): the per-game win probability for a
// matchup at round R is each team's conditional one-round advance probability —
// P(reach R+1) / P(reach R) — normalised between the two teams who actually meet.
//
// Polymarket structures each of these as a negRisk event whose child markets are
// one-per-team "Yes/No" lines, with each child slug ending in the team code —
// exactly like the per-match markets in app/api/odds. The only unknown is the
// parent EVENT slug per stage, which is env-overridable so production can correct
// it without a code change.

import { ALL_TEAMS } from './worldcup-data';

export type FutureStage = 'reachR16' | 'reachQF' | 'reachSF' | 'reachFinal' | 'champion';

export interface FuturesOdds {
  // stage -> team name -> probability (0–1). champion is normalised to sum 1.
  stages: Record<FutureStage, Record<string, number>>;
  resolvedSlugs: Partial<Record<FutureStage, string>>; // which event slug resolved per stage
}

// Map a knockout round to the stage a team reaches by *winning* that round.
export const ROUND_ADVANCE_STAGE: Record<string, FutureStage> = {
  R32: 'reachR16',
  R16: 'reachQF',
  QF: 'reachSF',
  SF: 'reachFinal',
  Final: 'champion',
};

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

interface PolyMarket {
  slug: string;
  outcomePrices: string;   // JSON array like '["0.04","0.96"]' — [0] is "Yes"
  question?: string;       // "Will Egypt reach the Semifinals at the 2026 FIFA World Cup?"
  groupItemTitle?: string; // usually just the team, e.g. "Egypt"
  closed?: boolean;
}
interface PolyEvent {
  slug: string;
  markets: PolyMarket[];
}

// Candidate parent-event slugs per stage. Polymarket groups all teams under one
// event per stage, slug `world-cup-nation-to-reach-<stage>` (confirmed for the
// semifinals market). Env vars win and may hold a comma-separated list.
function slugCandidates(stage: FutureStage): string[] {
  const env = (v: string | undefined) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const map: Record<FutureStage, { env?: string; defaults: string[] }> = {
    reachR16: {
      env: process.env.POLYMARKET_REACH_R16_SLUG,
      defaults: ['world-cup-nation-to-reach-round-of-16', 'world-cup-nation-to-reach-last-16'],
    },
    reachQF: {
      env: process.env.POLYMARKET_REACH_QF_SLUG,
      defaults: ['world-cup-nation-to-reach-quarterfinals', 'world-cup-nation-to-reach-quarter-finals'],
    },
    reachSF: {
      env: process.env.POLYMARKET_REACH_SF_SLUG,
      defaults: ['world-cup-nation-to-reach-semifinals', 'world-cup-nation-to-reach-semi-finals'],
    },
    reachFinal: {
      env: process.env.POLYMARKET_REACH_FINAL_SLUG,
      defaults: ['world-cup-nation-to-reach-final', 'world-cup-nation-to-reach-the-final'],
    },
    champion: {
      env: process.env.POLYMARKET_WINNER_SLUG,
      defaults: ['world-cup-winner', 'fifa-world-cup-2026-winner', 'world-cup-2026-winner'],
    },
  };
  const entry = map[stage];
  return [...env(entry.env), ...entry.defaults];
}

// Strip accents/punctuation and lowercase so "Türkiye" / "Côte d'Ivoire" match.
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Polymarket's question text may use a common name that differs from ours.
const TEAM_ALIASES: Record<string, string[]> = {
  'United States': ['usa', 'united states', 'us'],
  'South Korea': ['south korea', 'korea republic', 'korea'],
  'Czechia': ['czechia', 'czech republic'],
  'Turkey': ['turkey', 'turkiye'],
  "Cote d'Ivoire": ['ivory coast', 'cote divoire', 'cote d ivoire'],
  'Bosnia and Herzegovina': ['bosnia and herzegovina', 'bosnia'],
  'Curacao': ['curacao'],
};

// All (normalized alias -> team) pairs, longest alias first so a longer name
// wins over a shorter one it contains.
const ALIAS_INDEX: { alias: string; team: string }[] = (() => {
  const out: { alias: string; team: string }[] = [];
  for (const team of ALL_TEAMS) {
    const aliases = TEAM_ALIASES[team] ?? [team];
    for (const a of aliases) out.push({ alias: norm(a), team });
  }
  return out.sort((x, y) => y.alias.length - x.alias.length);
})();

// Identify which team a per-team child market is about, from its title/question.
// Exported for tests.
export function teamOfMarket(market: PolyMarket): string | null {
  const title = market.groupItemTitle ? norm(market.groupItemTitle) : '';
  if (title) {
    const exact = ALIAS_INDEX.find((e) => e.alias === title);
    if (exact) return exact.team;
  }
  const hay = ' ' + norm(`${market.groupItemTitle ?? ''} ${market.question ?? ''} ${market.slug}`) + ' ';
  for (const { alias, team } of ALIAS_INDEX) {
    if (hay.includes(' ' + alias + ' ')) return team;
  }
  return null;
}

async function fetchEvent(slug: string): Promise<PolyEvent | null> {
  try {
    const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`, {
      headers: FETCH_HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data: PolyEvent[] = await res.json().catch(() => []);
    if (!Array.isArray(data) || data.length === 0) return null;
    const event = data.find((e) => e.slug === slug) ?? data[0];
    return event && Array.isArray(event.markets) && event.markets.length > 0 ? event : null;
  } catch {
    return null;
  }
}

// Parse a per-team event into team name -> "Yes" probability.
function parseTeamMarket(event: PolyEvent): Record<string, number> {
  const out: Record<string, number> = {};
  for (const market of event.markets) {
    let prices: number[];
    try {
      prices = (JSON.parse(market.outcomePrices) as string[]).map(Number);
    } catch {
      continue;
    }
    const yes = prices[0];
    if (isNaN(yes) || yes < 0 || yes > 1) continue;
    const team = teamOfMarket(market);
    if (team) out[team] = yes;
  }
  return out;
}

let cache: { data: FuturesOdds; at: number } | null = null;

export async function fetchFuturesOdds(now: number): Promise<FuturesOdds> {
  if (cache && now - cache.at < 300_000) return cache.data;

  const stages: FutureStage[] = ['reachR16', 'reachQF', 'reachSF', 'reachFinal', 'champion'];
  const result: FuturesOdds = {
    stages: { reachR16: {}, reachQF: {}, reachSF: {}, reachFinal: {}, champion: {} },
    resolvedSlugs: {},
  };

  await Promise.all(
    stages.map(async (stage) => {
      for (const slug of slugCandidates(stage)) {
        const event = await fetchEvent(slug);
        if (!event) continue;
        const probs = parseTeamMarket(event);
        if (Object.keys(probs).length === 0) continue;
        result.stages[stage] = probs;
        result.resolvedSlugs[stage] = slug;
        break;
      }
    }),
  );

  // The outright winner market is exclusive across teams — normalise to sum 1 so
  // the implied champion probabilities are clean.
  const champ = result.stages.champion;
  const sum = Object.values(champ).reduce((a, b) => a + b, 0);
  if (sum > 0) for (const k of Object.keys(champ)) champ[k] = champ[k] / sum;

  cache = { data: result, at: now };
  return result;
}

// Per-round, per-team probability of winning that round's game (advancing one
// stage), derived from the reach-stage ladder: P(reach next) / P(reach this).
// A team in R32 is assumed present (reach-this = 1). Returns round -> team -> p.
export function advanceProbByRound(
  futures: FuturesOdds,
): Record<string, Record<string, number>> {
  const reachThis: Record<string, FutureStage | null> = {
    R32: null, // present with probability 1
    R16: 'reachR16',
    QF: 'reachQF',
    SF: 'reachSF',
    Final: 'reachFinal',
  };
  const out: Record<string, Record<string, number>> = {};
  for (const round of Object.keys(ROUND_ADVANCE_STAGE)) {
    const nextStage = ROUND_ADVANCE_STAGE[round];
    const nextMap = futures.stages[nextStage];
    if (!nextMap || Object.keys(nextMap).length === 0) continue; // no market for this round
    const thisStage = reachThis[round];
    const thisMap = thisStage ? futures.stages[thisStage] : null;
    const perTeam: Record<string, number> = {};
    for (const [team, pNext] of Object.entries(nextMap)) {
      const pThis = thisMap ? thisMap[team] : 1;
      if (pThis === undefined || pThis <= 0) continue;
      // Monotonicity can be violated by market noise — clamp to a sane band.
      perTeam[team] = Math.min(0.999, Math.max(0.001, pNext / pThis));
    }
    if (Object.keys(perTeam).length > 0) out[round] = perTeam;
  }
  return out;
}
