import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
const COOKIE_NAME = 'session';

// Routes that require a valid session
const AUTH_REQUIRED = ['/app/picks', '/app/profile'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/app')) return NextResponse.next();

  const isAuthRequired = AUTH_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (!isAuthRequired) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Invalid/expired token — clear cookie; redirect only auth-required routes
    const dest = isAuthRequired
      ? (() => {
          const url = new URL('/login', request.url);
          url.searchParams.set('from', pathname);
          return url;
        })()
      : request.nextUrl;
    const response = isAuthRequired
      ? NextResponse.redirect(dest)
      : NextResponse.next();
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/app/:path*'],
};
