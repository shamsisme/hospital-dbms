import { NextRequest, NextResponse } from 'next/server';

// Fast edge-side gate: requests without a session cookie never reach the app.
// Full validation (hash lookup, expiry, revocation) happens in each API route via requireSession().
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/break-glass', '/api/auth/me', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (request.cookies.get('mr_session')?.value) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Sign in with your staff badge to continue.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
