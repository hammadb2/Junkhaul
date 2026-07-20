import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { isRehaulHost, shouldBlockAdminOnRehaul } from '@/lib/rehaul';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || '';

  // Rehaul host cannot reach JunkHaul admin routes.
  if (shouldBlockAdminOnRehaul(host, pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Attach tenant slug and correlation ID for observability.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant', isRehaulHost(host) ? 'rehaul' : 'junkhaul');
  if (!requestHeaders.get('x-correlation-id')) {
    requestHeaders.set('x-correlation-id', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  // Protect /admin (except the login page itself).
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    const expected = await adminToken();
    if (!cookie || cookie !== expected) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
