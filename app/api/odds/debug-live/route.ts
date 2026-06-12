import { NextResponse } from 'next/server';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { POLYMARKET_TEAM_CODES as TEAM_CODES, POLYMARKET_TEAM_ALT_CODES as ALT_CODES } from '@/lib/polymarket-codes';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

interface PolyMarket {
  slug: string;
  outcomePrices: string;
  clobTokenIds?: string;
  active: boolean;
  closed: boolean;
}

interface PolyEvent {
  slug: string;
  startTime?: string;
  markets: PolyMarket[];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function allCodes(primary: string, team: string): string[] {
  const alts = ALT_CODES[team] ?? [];
  return [primary, ...alts].filter((v, i, a) => a.indexOf(v) === i);
}

async function fetchEvent(slug: string): Promise<PolyEvent | null> {
  try {
    const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`, {
      headers: HEADERS,
      cache: 'no-store',
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

// Raw CLOB midpoint call — returns status + body text so failures are visible
async function fetchMidpointRaw(tokenId: string) {
  try {
    const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`, {
      headers: HEADERS,
      cache: 'no-store',
    });
    const body = await res.text();
    return { httpStatus: res.status, body: body.slice(0, 500) };
  } catch (e) {
    return { httpStatus: 0, body: `fetch error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function GET(request: Request) {
  const matchId = new URL(request.url).searchParams.get('match') ?? 'A1';
  const match = GROUP_MATCHES.find((m) => m.matchId === matchId);
  if (!match) return NextResponse.json({ error: `unknown match ${matchId}` }, { status: 400 });

  const hCode = TEAM_CODES[match.home];
  const aCode = TEAM_CODES[match.away];
  if (!hCode || !aCode) {
    return NextResponse.json({ error: `missing team code: ${!hCode ? match.home : match.away}` });
  }

  const [storedSnapshot, dbResult] = await Promise.all([
    prisma.oddsSnapshot.findUnique({ where: { matchId } }).catch(() => null),
    prisma.matchResult.findUnique({ where: { matchId } }).catch(() => null),
  ]);

  // Same slug discovery as /api/odds
  const toTry: { slug: string; hCode: string; aCode: string }[] = [];
  for (const h of allCodes(hCode, match.home)) {
    for (const a of allCodes(aCode, match.away)) {
      for (const delta of [0, 1, -1]) {
        const d = shiftDate(match.date, delta);
        toTry.push({ slug: `fifwc-${h}-${a}-${d}`, hCode: h, aCode: a });
        toTry.push({ slug: `fifwc-${a}-${h}-${d}`, hCode: h, aCode: a });
      }
    }
  }

  let event: PolyEvent | null = null;
  let found: { slug: string; hCode: string; aCode: string } | null = null;
  for (const c of toTry) {
    event = await fetchEvent(c.slug);
    if (event) { found = c; break; }
  }
  if (!event || !found) {
    return NextResponse.json({ matchId, error: 'no Polymarket event found', tried: toTry.map((t) => t.slug) });
  }

  const now = Date.now();
  const kickoff = event.startTime ?? match.kickoffIso;

  const markets = await Promise.all(
    event.markets.map(async (m) => {
      const mSlug = m.slug.toLowerCase();
      const classified = mSlug.endsWith('-' + found.hCode) ? 'home'
        : mSlug.endsWith('-' + found.aCode) ? 'away'
        : mSlug.endsWith('-draw') ? 'draw'
        : 'UNMATCHED';

      let tokenIds: string[] = [];
      let tokenParseError: string | null = null;
      try {
        tokenIds = JSON.parse(m.clobTokenIds ?? '[]') as string[];
      } catch (e) {
        tokenParseError = e instanceof Error ? e.message : String(e);
      }
      const yesToken = tokenIds[0] ?? null;

      return {
        slug: m.slug,
        classified,
        active: m.active,
        closed: m.closed,
        outcomePrices: m.outcomePrices,
        clobTokenIdsRaw: m.clobTokenIds ?? null,
        tokenParseError,
        yesToken,
        clobMidpoint: yesToken ? await fetchMidpointRaw(yesToken) : null,
      };
    })
  );

  return NextResponse.json({
    matchId,
    home: match.home,
    away: match.away,
    slug: found.slug,
    startTime: event.startTime ?? null,
    serverNow: new Date(now).toISOString(),
    started: now >= new Date(kickoff).getTime(),
    dbStatus: dbResult?.status ?? null,
    storedSnapshot: storedSnapshot
      ? { home: storedSnapshot.home, draw: storedSnapshot.draw, away: storedSnapshot.away, updatedAt: storedSnapshot.updatedAt }
      : null,
    markets,
  });
}
