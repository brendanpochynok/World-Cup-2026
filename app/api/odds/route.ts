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
  // Stored pre-match lines — clients use these for matches they know are
  // finished, even before the server-side finished signals catch up
  prematch: Record<string, { home: number; draw: number; away: number }>;
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

type OutcomeKey = 'home' | 'draw' | 'away';

// The "Yes" CLOB token for each of the three outcome markets
function collectYesTokens(
  event: PolyEvent,
  homeCode: string,
  awayCode: string
): { key: OutcomeKey; tokenId: string }[] | null {
  const tokens: { key: OutcomeKey; tokenId: string }[] = [];
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
  return tokens.length === 3 ? tokens : null;
}

function normalize(probs: Record<OutcomeKey, number>): { home: number; draw: number; away: number } {
  const total = probs.home + probs.draw + probs.away || 1;
  return { home: probs.home / total, draw: probs.draw / total, away: probs.away / total };
}

// Live in-game prices straight from the CLOB order book midpoint —
// gamma's outcomePrices field lags several minutes behind during games
async function fetchClobOdds(
  event: PolyEvent,
  homeCode: string,
  awayCode: string
): Promise<{ home: number; draw: number; away: number } | null> {
  const tokens = collectYesTokens(event, homeCode, awayCode);
  if (!tokens) return null;

  const probs: Partial<Record<OutcomeKey, number>> = {};
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
  return normalize(probs as Record<OutcomeKey, number>);
}

// Last traded price for a token just before `endTs` (unix seconds),
// from the CLOB price history
async function fetchHistoryPoint(tokenId: string, endTs: number): Promise<number | null> {
  try {
    const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&startTs=${endTs - 6 * 3600}&endTs=${endTs}&fidelity=10`;
    const res = await fetch(url, { headers: FETCH_HEADERS, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { history?: { t: number; p: number }[] };
    const hist = data?.history;
    if (!Array.isArray(hist) || hist.length === 0) return null;
    const p = Number(hist[hist.length - 1]?.p);
    return !isNaN(p) && p >= 0 && p <= 1 ? p : null;
  } catch {
    return null;
  }
}

// Reconstruct the pre-match line for a finished match with no stored
// snapshot, from order-book prices just before kickoff, and store it.
async function backfillSnapshot(
  event: PolyEvent,
  homeCode: string,
  awayCode: string,
  kickoffIso: string,
  matchId: string
): Promise<Snapshot | null> {
  const tokens = collectYesTokens(event, homeCode, awayCode);
  if (!tokens) return null;

  const endTs = Math.floor(new Date(kickoffIso).getTime() / 1000);
  if (!Number.isFinite(endTs) || endTs <= 0) return null;

  const probs: Partial<Record<OutcomeKey, number>> = {};
  await Promise.all(
    tokens.map(async ({ key, tokenId }) => {
      const p = await fetchHistoryPoint(tokenId, endTs);
      if (p !== null) probs[key] = p;
    })
  );
  if (probs.home === undefined || probs.draw === undefined || probs.away === undefined) return null;

  const snap = normalize(probs as Record<OutcomeKey, number>);
  await prisma.oddsSnapshot
    .upsert({
      where: { matchId },
      update: snap,
      create: { matchId, ...snap },
    })
    .catch(() => null);
  return snap;
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

// Past this point after kickoff the game is over even if the DB result and
// Polymarket's closed flag haven't caught up (90' + halftime + stoppage)
const ASSUME_FINISHED_MS = 150 * 60_000;

async function fetchMatchOdds(
  match: (typeof GROUP_MATCHES)[0],
  finished: boolean,
  snapshot: Snapshot | undefined,
  now: number
): Promise<MatchOddsResult | null> {
  const assumedDone =
    finished || now >= new Date(match.kickoffIso).getTime() + ASSUME_FINISHED_MS;

  // Finished matches show the stored pre-match odds — no Polymarket fetch
  // needed. Without a snapshot, fall through to discover the event and
  // backfill the pre-match line from price history.
  if (assumedDone && snapshot) {
    return snapshotOdds(match.matchId, snapshot);
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

    if (assumedDone) {
      const snap = await backfillSnapshot(event, h, a, kickoff, match.matchId);
      return snap ? snapshotOdds(match.matchId, snap) : null;
    }

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

    // Market resolved (game decided) — fall back to the pre-match snapshot,
    // reconstructing it from price history if it was never stored
    if (isEventResolved(liveEvent)) {
      const snap = snapshot ?? (await backfillSnapshot(liveEvent, h, a, kickoff, match.matchId));
      return snap ? snapshotOdds(match.matchId, snap) : null;
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

  // Freshen the snapshot map with this request's pre-kickoff prices
  for (const s of toSnapshot) {
    snapshotMap.set(s.matchId, { home: s.home, draw: s.draw, away: s.away });
  }

  const hasLive = Object.values(odds).some((o) => o.phase === 'live');
  const responseData: OddsResponse = {
    odds,
    kickoffTimes,
    prematch: Object.fromEntries(snapshotMap),
  };
  oddsCache = { data: responseData, at: now, hasLive };
  return NextResponse.json(responseData);
}
