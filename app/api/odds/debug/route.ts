import { NextResponse } from 'next/server';

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

async function probe(slug: string) {
  try {
    const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* */ }
    const found = Array.isArray(parsed) && parsed.length > 0;
    let markets: string[] = [];
    if (found && Array.isArray(parsed)) {
      const event = parsed[0] as { markets?: Array<{ slug?: string }> };
      markets = (event.markets ?? []).map((m) => m.slug ?? '').filter(Boolean);
    }
    return { slug, found, markets };
  } catch (err) {
    return { slug, found: false, markets: [], error: String(err) };
  }
}

export async function GET() {
  // Sweden code variants — probe F2 (Jun 15), F3 (Jun 21), F6 (Jun 26)
  // nld/jpn/tun all confirmed. Only Sweden is unknown.
  const sweVariants = ['swe', 'se', 'sv', 'sue', 'swd', 'swi', 'ned'];
  const partnerCodes = [
    { partner: 'tun', date: '2026-06-15' },  // F2
    { partner: 'nld', date: '2026-06-21' },  // F3
    { partner: 'jpn', date: '2026-06-26' },  // F6
  ];

  const slugsToTry: string[] = [];
  for (const v of sweVariants) {
    for (const { partner, date } of partnerCodes) {
      slugsToTry.push(`fifwc-${v}-${partner}-${date}`);
      slugsToTry.push(`fifwc-${partner}-${v}-${date}`);
    }
  }

  const results = await Promise.all(slugsToTry.map(probe));
  const found = results.filter((r) => r.found);
  const notFound = results.filter((r) => !r.found).map((r) => r.slug);

  return NextResponse.json({ found, not_found_count: notFound.length });
}
