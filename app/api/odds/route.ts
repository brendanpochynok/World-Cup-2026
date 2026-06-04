import { NextResponse } from 'next/server';
import { GROUP_MATCHES, computeMatchProbabilities } from '@/lib/worldcup-data';

export const revalidate = 300; // re-fetch Polymarket every 5 minutes

export interface MatchOdds {
  home: number;   // probability 0–1
  draw: number;
  away: number;
  source: 'polymarket' | 'model';
}

// Normalise a name for fuzzy team matching
const ALIASES: Record<string, string> = {
  'united states': 'United States',
  'usa': 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  "ivory coast": "Cote d'Ivoire",
  "côte d'ivoire": "Cote d'Ivoire",
  "cote d'ivoire": "Cote d'Ivoire",
  'ivory': "Cote d'Ivoire",
  'south korea': 'South Korea',
  'republic of korea': 'South Korea',
  'korea republic': 'South Korea',
  'democratic republic of the congo': 'DR Congo',
  'democratic republic of congo': 'DR Congo',
  'dr congo': 'DR Congo',
  'drc': 'DR Congo',
  'cape verde': 'Cabo Verde',
  'bosnia and herzegovina': 'Bosnia and Herzegovina',
  'bosnia': 'Bosnia and Herzegovina',
  'bosnia & herzegovina': 'Bosnia and Herzegovina',
  'saudi arabia': 'Saudi Arabia',
  'new zealand': 'New Zealand',
  'south africa': 'South Africa',
};

const ALL_TEAM_NAMES: string[] = Array.from(
  new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))
);

function resolveTeam(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (ALIASES[lower]) return ALIASES[lower];
  for (let i = 0; i < ALL_TEAM_NAMES.length; i++) {
    if (ALL_TEAM_NAMES[i].toLowerCase() === lower) return ALL_TEAM_NAMES[i];
  }
  return null;
}

// Build a lookup: (homeTeam, awayTeam) -> matchId (both orderings)
const MATCH_LOOKUP = new Map<string, string>();
for (const m of GROUP_MATCHES) {
  MATCH_LOOKUP.set(`${m.home}|${m.away}`, m.matchId);
  MATCH_LOOKUP.set(`${m.away}|${m.home}`, m.matchId);
}

interface PolyMarket {
  question: string;
  outcomes: string;        // JSON array string
  outcomePrices: string;   // JSON array string
  active: boolean;
  closed: boolean;
}

async function fetchPolymarketOdds(): Promise<Record<string, MatchOdds>> {
  const result: Record<string, MatchOdds> = {};
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?q=World+Cup+2026&active=true&closed=false&limit=500',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (compatible; WorldCupPool/1.0; +https://worldcup2026pool.vercel.app)',
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return result;

    const markets: PolyMarket[] = await res.json();

    for (const mkt of markets) {
      if (!mkt.active || mkt.closed) continue;

      let outcomes: string[];
      let prices: number[];
      try {
        outcomes = JSON.parse(mkt.outcomes) as string[];
        prices = (JSON.parse(mkt.outcomePrices) as string[]).map(Number);
      } catch {
        continue;
      }

      if (outcomes.length !== 3 || prices.length !== 3) continue;

      // Find which outcome is "Draw"
      const drawIdx = outcomes.findIndex((o) =>
        /^draw$/i.test(o.trim())
      );
      if (drawIdx === -1) continue;

      const teamIdxs = [0, 1, 2].filter((i) => i !== drawIdx);
      const t1 = resolveTeam(outcomes[teamIdxs[0]]);
      const t2 = resolveTeam(outcomes[teamIdxs[1]]);
      if (!t1 || !t2) continue;

      const matchId =
        MATCH_LOOKUP.get(`${t1}|${t2}`) ?? MATCH_LOOKUP.get(`${t2}|${t1}`);
      if (!matchId) continue;

      const match = GROUP_MATCHES.find((m) => m.matchId === matchId)!;
      // Determine which outcome index maps to home/away
      const homeTeamName = outcomes[teamIdxs[0]];
      const resolvedFirst = resolveTeam(homeTeamName);
      let homeProb: number;
      let awayProb: number;
      let drawProb: number;

      if (resolvedFirst === match.home) {
        homeProb = prices[teamIdxs[0]];
        awayProb = prices[teamIdxs[1]];
      } else {
        homeProb = prices[teamIdxs[1]];
        awayProb = prices[teamIdxs[0]];
      }
      drawProb = prices[drawIdx];

      // Normalise so they sum to 1
      const total = homeProb + drawProb + awayProb || 1;
      result[matchId] = {
        home: homeProb / total,
        draw: drawProb / total,
        away: awayProb / total,
        source: 'polymarket',
      };
    }
  } catch (err) {
    console.error('Polymarket fetch error:', err);
  }
  return result;
}

export async function GET() {
  const polyOdds = await fetchPolymarketOdds();

  const odds: Record<string, MatchOdds> = {};
  for (const match of GROUP_MATCHES) {
    if (polyOdds[match.matchId]) {
      odds[match.matchId] = polyOdds[match.matchId];
    } else {
      const p = computeMatchProbabilities(match.home, match.away);
      odds[match.matchId] = { ...p, source: 'model' };
    }
  }

  return NextResponse.json({ odds });
}
