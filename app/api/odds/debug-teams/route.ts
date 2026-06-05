import { NextResponse } from 'next/server';

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

export async function GET() {
  // FIFA World Cup tag ID confirmed from a known event: id=102232, slug=fifa-world-cup
  // Fetch up to 300 events tagged with FIFA World Cup
  const url = `https://gamma-api.polymarket.com/events?tag_slug=fifa-world-cup&limit=300`;
  const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: `Polymarket returned ${res.status}` }, { status: 502 });

  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return NextResponse.json({ error: 'Unexpected response', raw: typeof data });

  // Only keep fifwc- prefixed events (the match events, not outrights)
  const matchEvents = data.filter((e: { slug?: string }) => e.slug?.startsWith('fifwc-'));

  const teamMap: Record<string, string> = {};
  for (const event of matchEvents) {
    if (Array.isArray(event.teams)) {
      for (const t of event.teams) {
        if (t.name && t.abbreviation) teamMap[t.name] = t.abbreviation;
      }
    }
  }

  return NextResponse.json({
    totalTaggedEvents: data.length,
    matchEvents: matchEvents.length,
    teamAbbreviations: teamMap,
    sampleSlugs: matchEvents.slice(0, 5).map((e: { slug?: string }) => e.slug),
  });
}
