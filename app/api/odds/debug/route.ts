import { NextResponse } from 'next/server';

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://polymarket.com/',
};

async function probe(label: string, url: string) {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
    const rawText = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(rawText); } catch { /* ignore */ }
    return { label, url, status: res.status, ok: res.ok, parsed };
  } catch (err) {
    return { label, url, fetchError: String(err) };
  }
}

export async function GET() {
  // The slug from the embed code: fifwc-che-can-2026-06-24
  // Try both the events and markets endpoints to understand the data structure
  const results = await Promise.all([
    probe('event-by-slug', 'https://gamma-api.polymarket.com/events?slug=fifwc-che-can-2026-06-24'),
    probe('markets-by-event-slug', 'https://gamma-api.polymarket.com/markets?event_slug=fifwc-che-can-2026-06-24'),
    probe('market-by-slug-direct', 'https://gamma-api.polymarket.com/markets?slug=fifwc-che-can-2026-06-24'),
    // Also try fetching all fifwc events to see what's there
    probe('all-fifwc-events', 'https://gamma-api.polymarket.com/events?tag_slug=fifwc&active=true&limit=100'),
    probe('fifwc-group-slug', 'https://gamma-api.polymarket.com/events?slug=fifwc-group-stage-2026&active=true'),
  ]);

  return NextResponse.json(results);
}
