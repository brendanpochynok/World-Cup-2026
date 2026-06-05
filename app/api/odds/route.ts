import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';

export const revalidate = 300; // re-fetch every 5 minutes

export interface MatchOdds {
  home: number;   // probability 0–1
  draw: number;
  away: number;
  source: 'polymarket';
}

// Polymarket 3-letter codes for each team (primary first, fallbacks after)
const TEAM_CODES: Record<string, string[]> = {
  'Mexico':                   ['mex'],
  'South Africa':             ['rsa', 'zaf'],
  'South Korea':              ['kor'],
  'Czechia':                  ['cze'],
  'Canada':                   ['can'],
  'Switzerland':              ['che'],
  'Qatar':                    ['qat'],
  'Bosnia and Herzegovina':   ['bih'],
  'Brazil':                   ['bra'],
  'Morocco':                  ['mar'],
  'Haiti':                    ['hti', 'hai'],
  'Scotland':                 ['sco'],
  'United States':            ['usa'],
  'Paraguay':                 ['par', 'pry'],
  'Australia':                ['aus'],
  'Turkey':                   ['tur'],
  'Germany':                  ['deu', 'ger'],
  'Curacao':                  ['cur', 'cuw'],
  "Cote d'Ivoire":            ['civ'],
  'Ecuador':                  ['ecu'],
  'Netherlands':              ['ned', 'nld'],
  'Japan':                    ['jpn'],
  'Sweden':                   ['swe'],
  'Tunisia':                  ['tun'],
  'Belgium':                  ['bel'],
  'Egypt':                    ['egy'],
  'Iran':                     ['irn', 'iri'],
  'New Zealand':              ['nzl'],
  'Spain':                    ['esp'],
  'Cabo Verde':               ['cpv', 'cav'],
  'Saudi Arabia':             ['sau', 'ksa'],
  'Uruguay':                  ['uru', 'ury'],
  'France':                   ['fra'],
  'Senegal':                  ['sen'],
  'Norway':                   ['nor'],
  'Iraq':                     ['irq'],
  'Argentina':                ['arg'],
  'Algeria':                  ['dza', 'alg'],
  'Austria':                  ['aut'],
  'Jordan':                   ['jor'],
  'Portugal':                 ['por', 'prt'],
  'DR Congo':                 ['cod', 'cog'],
  'Uzbekistan':               ['uzb'],
  'Colombia':                 ['col'],
  'England':                  ['eng'],
  'Croatia':                  ['cro', 'hrv'],
  'Ghana':                    ['gha'],
  'Panama':                   ['pan'],
};

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

interface PolyMarket {
  slug: string;
  outcomePrices: string; // JSON array like '["0.46","0.54"]'
  active: boolean;
  closed: boolean;
}

interface PolyEvent {
  slug: string;
  startTime?: string; // ISO kick-off time e.g. "2026-06-24T19:00:00Z"
  markets: PolyMarket[];
}

async function fetchEventBySlug(slug: string): Promise<PolyEvent | null> {
  try {
    const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
    const res = await fetch(url, { headers: FETCH_HEADERS, next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data: PolyEvent[] = await res.json().catch(() => []);
    if (!Array.isArray(data) || data.length === 0) return null;
    const event = data.find((e) => e.slug === slug) ?? data[0];
    if (!event || !Array.isArray(event.markets) || event.markets.length === 0) return null;
    return event;
  } catch {
    return null;
  }
}

// Parse home/draw/away probabilities from a Polymarket negRisk event.
// Each child market slug ends in -{homeCode}, -{awayCode}, or -draw.
function parseEventOdds(
  event: PolyEvent,
  homeCode: string,
  awayCode: string
): { home: number; draw: number; away: number } | null {
  let homeProb = -1;
  let drawProb = -1;
  let awayProb = -1;

  for (let i = 0; i < event.markets.length; i++) {
    const market = event.markets[i];
    let prices: number[];
    try {
      prices = (JSON.parse(market.outcomePrices) as string[]).map(Number);
    } catch {
      continue;
    }
    // outcomePrices[0] = "Yes" probability for this binary market
    const yesPrice = prices[0];
    if (isNaN(yesPrice) || yesPrice < 0 || yesPrice > 1) continue;

    const mSlug = market.slug.toLowerCase();
    if (mSlug.endsWith('-' + homeCode)) {
      homeProb = yesPrice;
    } else if (mSlug.endsWith('-' + awayCode)) {
      awayProb = yesPrice;
    } else if (mSlug.endsWith('-draw')) {
      drawProb = yesPrice;
    }
  }

  if (homeProb < 0 || drawProb < 0 || awayProb < 0) return null;

  const total = homeProb + drawProb + awayProb || 1;
  return { home: homeProb / total, draw: drawProb / total, away: awayProb / total };
}

async function fetchMatchOdds(
  match: (typeof GROUP_MATCHES)[0]
): Promise<{ matchId: string; odds: MatchOdds; kickoff: string | null } | null> {
  const homeCodes = TEAM_CODES[match.home] ?? [];
  const awayCodes = TEAM_CODES[match.away] ?? [];
  if (homeCodes.length === 0 || awayCodes.length === 0) return null;

  // Try primary codes (home-away order), then reversed, then alternative codes
  const hPrimary = homeCodes[0];
  const aPrimary = awayCodes[0];

  const toTry: Array<{ slug: string; hCode: string; aCode: string }> = [
    { slug: `fifwc-${hPrimary}-${aPrimary}-${match.date}`, hCode: hPrimary, aCode: aPrimary },
    { slug: `fifwc-${aPrimary}-${hPrimary}-${match.date}`, hCode: hPrimary, aCode: aPrimary },
  ];
  if (homeCodes.length > 1) {
    const hAlt = homeCodes[1];
    toTry.push({ slug: `fifwc-${hAlt}-${aPrimary}-${match.date}`, hCode: hAlt, aCode: aPrimary });
    toTry.push({ slug: `fifwc-${aPrimary}-${hAlt}-${match.date}`, hCode: hAlt, aCode: aPrimary });
  }
  if (awayCodes.length > 1) {
    const aAlt = awayCodes[1];
    toTry.push({ slug: `fifwc-${hPrimary}-${aAlt}-${match.date}`, hCode: hPrimary, aCode: aAlt });
    toTry.push({ slug: `fifwc-${aAlt}-${hPrimary}-${match.date}`, hCode: hPrimary, aCode: aAlt });
  }

  for (let i = 0; i < toTry.length; i++) {
    const { slug, hCode, aCode } = toTry[i];
    const event = await fetchEventBySlug(slug);
    if (!event) continue;
    const odds = parseEventOdds(event, hCode, aCode);
    if (odds) {
      return {
        matchId: match.matchId,
        odds: { ...odds, source: 'polymarket' },
        kickoff: event.startTime ?? null,
      };
    }
  }
  return null;
}

export async function GET() {
  const odds: Record<string, MatchOdds> = {};
  const kickoffTimes: Record<string, string> = {};

  const results = await Promise.all(GROUP_MATCHES.map(fetchMatchOdds));
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r) continue;
    odds[r.matchId] = r.odds;
    if (r.kickoff) kickoffTimes[r.matchId] = r.kickoff;
  }

  return NextResponse.json({ odds, kickoffTimes });
}
