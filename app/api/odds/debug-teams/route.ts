import { NextResponse } from 'next/server';

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'South Korea';

  // Fetch all fifwc events and find ones involving this team
  const url = `https://gamma-api.polymarket.com/events?seriesSlug=soccer-fifwc&limit=200`;
  const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: `Polymarket returned ${res.status}` }, { status: 502 });

  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return NextResponse.json({ error: 'Unexpected response', data });

  const matches = data.filter((e: { title?: string }) =>
    e.title?.toLowerCase().includes(name.toLowerCase())
  );

  return NextResponse.json({
    query: name,
    found: matches.length,
    events: matches.map((e: { slug?: string; title?: string; startTime?: string; teams?: { name: string; abbreviation: string }[] }) => ({
      slug: e.slug,
      title: e.title,
      startTime: e.startTime,
      teams: e.teams?.map((t) => ({ name: t.name, abbreviation: t.abbreviation })),
    })),
  });
}
