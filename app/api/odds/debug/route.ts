import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';

const QUERIES = [
  'https://gamma-api.polymarket.com/markets?q=2026+FIFA+World+Cup&active=true&closed=false&limit=500',
  'https://gamma-api.polymarket.com/markets?q=World+Cup+2026+group&active=true&closed=false&limit=500',
];

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

const MATCH_TEAM_NAMES = Array.from(
  new Set(GROUP_MATCHES.flatMap((m) => [m.home, m.away]))
);

export async function GET() {
  const report: Record<string, unknown> = {};

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const url = QUERIES[qi];
    try {
      const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
      const rawText = await res.text();

      let parsed: unknown = null;
      let parseError: string | null = null;
      try { parsed = JSON.parse(rawText); } catch (e) { parseError = String(e); }

      const markets = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : null;
      const first3 = markets ? markets.slice(0, 3) : null;

      // Check how many markets have 3 outcomes
      let threeOutcomeCount = 0;
      let drawMatchCount = 0;
      const matchedMarkets: { question: string; outcomes: string[]; prices: number[] }[] = [];

      if (markets) {
        for (let mi = 0; mi < markets.length; mi++) {
          const mkt = markets[mi];
          let outcomes: string[] = [];
          let prices: number[] = [];
          try {
            outcomes = JSON.parse(mkt.outcomes as string) as string[];
            prices = (JSON.parse(mkt.outcomePrices as string) as string[]).map(Number);
          } catch { continue; }

          if (outcomes.length === 3) {
            threeOutcomeCount++;
            const hasDrawOutcome = outcomes.some((o) => /^(draw|tie|draw\/tie)$/i.test(String(o).trim()));
            const hasTeamOutcome = outcomes.some((o) =>
              MATCH_TEAM_NAMES.some((t) => t.toLowerCase() === String(o).toLowerCase().trim())
            );
            if (hasDrawOutcome) {
              drawMatchCount++;
              if (hasTeamOutcome) {
                matchedMarkets.push({ question: mkt.question as string, outcomes, prices });
              }
            }
          }
        }
      }

      report[`query${qi + 1}`] = {
        url,
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        rawSnippet: rawText.slice(0, 300),
        parseError,
        totalMarkets: markets?.length ?? 0,
        threeOutcomeMarkets: threeOutcomeCount,
        drawOutcomeMarkets: drawMatchCount,
        matchedWorldCupMarkets: matchedMarkets.length,
        first3RawMarkets: first3,
        matchedSamples: matchedMarkets.slice(0, 5),
      };
    } catch (err) {
      report[`query${qi + 1}`] = { url, fetchError: String(err) };
    }
  }

  return NextResponse.json(report);
}
