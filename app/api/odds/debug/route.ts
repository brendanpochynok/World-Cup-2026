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
  // Confirmed so far:
  // F1: fifwc-nld-jpn-2026-06-14 ✓
  // F2: fifwc-swe-tun-2026-06-14 ✓ (date was 06-15, now fixed to 06-14)
  // F4: fifwc-tun-jpn-2026-06-21 ✓
  //
  // Now probe F3 (NLD vs SWE), F5 (NLD vs TUN), F6 (JPN vs SWE)
  // with date variations in case MD2/MD3 dates are also off

  const md2Dates = ['2026-06-21', '2026-06-20', '2026-06-22'];
  const md3Dates = ['2026-06-26', '2026-06-25', '2026-06-27'];

  const slugsToTry: string[] = [
    // F3: NLD vs SWE (MD2)
    ...md2Dates.flatMap((d) => [`fifwc-nld-swe-${d}`, `fifwc-swe-nld-${d}`]),
    // F5: NLD vs TUN (MD3)
    ...md3Dates.flatMap((d) => [`fifwc-nld-tun-${d}`, `fifwc-tun-nld-${d}`]),
    // F6: JPN vs SWE (MD3)
    ...md3Dates.flatMap((d) => [`fifwc-jpn-swe-${d}`, `fifwc-swe-jpn-${d}`]),
    // Also re-confirm F2 with new date
    'fifwc-swe-tun-2026-06-14',
    'fifwc-tun-swe-2026-06-14',
  ];

  const results = await Promise.all(slugsToTry.map(probe));
  const found = results.filter((r) => r.found);
  const notFound = results.filter((r) => !r.found).map((r) => r.slug);

  return NextResponse.json({ found, not_found: notFound });
}
