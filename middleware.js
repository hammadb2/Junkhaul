import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
