import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { POLYMARKET_TEAM_CODES as TEAM_CODES, POLYMARKET_TEAM_ALT_CODES as ALT_CODES } from '@/lib/polymarket-codes';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface MatchOdds {
  home: number;   // probability 0–1
  draw: number;
  away: number;
  source: 'polymarket';
  // 'live' = in-game prices still trading; 'prematch' = last odds before kickoff
  phase: 'prematch' | 'live';
}

interface OddsResponse {
  odds: Record<string, MatchOdds>;
  kickoffTimes: Record<string, string>;
}

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

interface PolyMarket {
  slug: string;
  outcomePrices: string; // JSON array like '["0.46","0.54"]'
  clobTokenIds?: string; // JSON array '["yesTokenId","noTokenId"]'
  active: boolean;
  closed: boolean;
}

interface PolyEvent {
  slug: string;
  startTime?: string; // ISO kick-off time e.g. "2026-06-24T19:00:00Z"
  markets: PolyMarket[];
}

async function fetchEventBySlug(slug: string, fresh = false): Promise<PolyEvent | null> {
  try {
    const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
    });
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

function isEventResolved(event: PolyEvent): boolean {
  return event.markets.every((m) => m.closed);
}

// Live in-game prices straight from the CLOB order book midpoint —
// gamma's outcomePrices field lags several minutes behind during games
async function fetchClobOdds(
  event: PolyEvent,
  homeCode: string,
  awayCode: string
): Promise<{ home: number; draw: number; away: number } | null> {
  const tokens: { key: 'home' | 'draw' | 'away'; tokenId: string }[] = [];
  for (const market of event.markets) {
    let ids: string[];
    try {
      ids = JSON.parse(market.clobTokenIds ?? '[]') as string[];
    } catch {
      continue;
    }
    const yesToken = ids[0]; // [0] = "Yes" outcome token
    if (!yesToken) continue;
    const mSlug = market.slug.toLowerCase();
    if (mSlug.endsWith('-' + homeCode)) tokens.push({ key: 'home', tokenId: yesToken });
    else if (mSlug.endsWith('-' + awayCode)) tokens.push({ key: 'away', tokenId: yesToken });
    else if (mSlug.endsWith('-draw')) tokens.push({ key: 'draw', tokenId: yesToken });
  }
  if (tokens.length !== 3) return null;

  const probs: Partial<Record<'home' | 'draw' | 'away', number>> = {};
  await Promise.all(
    tokens.map(async ({ key, tokenId }) => {
      try {
        const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`, {
          headers: FETCH_HEADERS,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { mid?: string };
        const mid = Number(data?.mid);
        if (!isNaN(mid) && mid >= 0 && mid <= 1) probs[key] = mid;
      } catch { /* fall back to gamma prices */ }
    })
  );

  if (probs.home === undefined || probs.draw === undefined || probs.away === undefined) return null;
  const total = probs.home + probs.draw + probs.away || 1;
  return { home: probs.home / total, draw: probs.draw / total, away: probs.away / total };
}

function uniqueCodes(primary: string, team: string): string[] {
  const alts = ALT_CODES[team] ?? [];
  return [primary, ...alts].filter((v, i, a) => a.indexOf(v) === i);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface MatchOddsResult {
  matchId: string;
  odds: MatchOdds;
  kickoff: string | null;
  // true while the match hasn't kicked off — these odds become the pre-match snapshot
  prematch: boolean;
}

type Snapshot = { home: number; draw: number; away: number };

function snapshotOdds(matchId: string, snap: Snapshot): MatchOddsResult {
  return {
    matchId,
    odds: { ...snap, source: 'polymarket', phase: 'prematch' },
    kickoff: null,
    prematch: false,
  };
}

async function fetchMatchOdds(
  match: (typeof GROUP_MATCHES)[0],
  finished: boolean,
  snapshot: Snapshot | undefined,
  now: number
): Promise<MatchOddsResult | null> {
  // Finished matches show the stored pre-match odds — no Polymarket fetch needed
  if (finished) {
    return snapshot ? snapshotOdds(match.matchId, snapshot) : null;
  }

  const hCode = TEAM_CODES[match.home];
  const aCode = TEAM_CODES[match.away];
  if (!hCode || !aCode) return null;

  const hCodes = uniqueCodes(hCode, match.home);
  const aCodes = uniqueCodes(aCode, match.away);

  // Try all combinations of home/away codes × ±1 day × both slug orderings
  // Polymarket slugs use UTC dates; local match dates can differ by ±1 day
  const toTry: { slug: string; hCode: string; aCode: string }[] = [];
  for (const h of hCodes) {
    for (const a of aCodes) {
      for (const delta of [0, 1, -1]) {
        const d = shiftDate(match.date, delta);
        toTry.push({ slug: `fifwc-${h}-${a}-${d}`, hCode: h, aCode: a });
        toTry.push({ slug: `fifwc-${a}-${h}-${d}`, hCode: h, aCode: a });
      }
    }
  }

  for (const { slug, hCode: h, aCode: a } of toTry) {
    const event = await fetchEventBySlug(slug);
    if (!event) continue;
    const odds = parseEventOdds(event, h, a);
    if (!odds) continue;

    const kickoff = event.startTime ?? match.kickoffIso;
    const started = now >= new Date(kickoff).getTime();

    if (!started) {
      return {
        matchId: match.matchId,
        odds: { ...odds, source: 'polymarket', phase: 'prematch' },
        kickoff: event.startTime ?? null,
        prematch: true,
      };
    }

    // In-game: re-check the event for resolution, then read live prices
    // from the order book; fall back to gamma prices if the CLOB is down
    const liveEvent = (await fetchEventBySlug(slug, true)) ?? event;

    // Market resolved (game decided) — fall back to the pre-match snapshot
    if (isEventResolved(liveEvent)) {
      return snapshot ? snapshotOdds(match.matchId, snapshot) : null;
    }

    const liveOdds =
      (await fetchClobOdds(liveEvent, h, a)) ?? parseEventOdds(liveEvent, h, a) ?? odds;
    return {
      matchId: match.matchId,
      odds: { ...liveOdds, source: 'polymarket', phase: 'live' },
      kickoff: liveEvent.startTime ?? event.startTime ?? null,
      prematch: false,
    };
  }
  return null;
}

// In-memory response cache: short TTL while games are live, longer otherwise
let oddsCache: { data: OddsResponse; at: number; hasLive: boolean } | null = null;
let lastSnapshotAt = 0;

export async function GET() {
  const now = Date.now();

  if (oddsCache && now - oddsCache.at < (oddsCache.hasLive ? 15_000 : 300_000)) {
    return NextResponse.json(oddsCache.data);
  }

  const [dbResults, dbSnapshots] = await Promise.all([
    prisma.matchResult.findMany(),
    prisma.oddsSnapshot.findMany(),
  ]);
  const finishedIds = new Set(
    dbResults.filter((r) => r.status === 'finished').map((r) => r.matchId)
  );
  const snapshotMap = new Map<string, Snapshot>(
    dbSnapshots.map((s) => [s.matchId, { home: s.home, draw: s.draw, away: s.away }])
  );

  const odds: Record<string, MatchOdds> = {};
  const kickoffTimes: Record<string, string> = {};

  const results = await Promise.all(
    GROUP_MATCHES.map((m) =>
      fetchMatchOdds(m, finishedIds.has(m.matchId), snapshotMap.get(m.matchId), now)
    )
  );

  const toSnapshot: { matchId: string; home: number; draw: number; away: number }[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r) continue;
    odds[r.matchId] = r.odds;
    if (r.kickoff) kickoffTimes[r.matchId] = r.kickoff;
    if (r.prematch) {
      toSnapshot.push({ matchId: r.matchId, home: r.odds.home, draw: r.odds.draw, away: r.odds.away });
    }
  }

  // Persist pre-kickoff odds (throttled) — the last write before kickoff
  // becomes the pre-match line shown once the game is over
  if (toSnapshot.length > 0 && now - lastSnapshotAt > 300_000) {
    lastSnapshotAt = now;
    await Promise.all(
      toSnapshot.map((s) =>
        prisma.oddsSnapshot.upsert({
          where: { matchId: s.matchId },
          update: { home: s.home, draw: s.draw, away: s.away },
          create: s,
        }).catch(() => null)
      )
    );
  }

  const hasLive = Object.values(odds).some((o) => o.phase === 'live');
  const responseData: OddsResponse = { odds, kickoffTimes };
  oddsCache = { data: responseData, at: now, hasLive };
  return NextResponse.json(responseData);
}
