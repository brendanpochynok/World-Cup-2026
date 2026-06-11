import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface GiphyImage { url?: string }
interface GiphyGif {
  id: string;
  images?: { fixed_height?: GiphyImage; fixed_height_small?: GiphyImage; original?: GiphyImage };
}

// Giphy URLs work without their tracking query string — stripping it keeps
// messages well under the 500-char limit
function clean(url: string | undefined): string | null {
  return url ? url.split('?')[0] : null;
}

// GET: search Giphy (?q=) or trending when no query. Returns
// { configured: false } when no GIPHY_API_KEY is set so the client can
// hide the GIF button. ?probe=1 skips the Giphy call entirely.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.GIPHY_API_KEY;
  if (!key) return NextResponse.json({ configured: false, gifs: [] });
  if (request.nextUrl.searchParams.get('probe')) {
    return NextResponse.json({ configured: true, gifs: [] });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const base = q
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&`
    : 'https://api.giphy.com/v1/gifs/trending?';
  const url = `${base}api_key=${key}&limit=24&rating=pg-13`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ configured: true, gifs: [], error: 'Giphy request failed' });
    }
    const data = await res.json();
    const gifs = ((data?.data ?? []) as GiphyGif[])
      .map((g) => ({
        id: g.id,
        url: clean(g.images?.fixed_height?.url ?? g.images?.original?.url),
        preview: clean(g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url),
      }))
      .filter((g) => g.url);
    return NextResponse.json({ configured: true, gifs });
  } catch {
    return NextResponse.json({ configured: true, gifs: [], error: 'Giphy unreachable' });
  }
}
