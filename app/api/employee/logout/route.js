import { NextResponse } from 'next/server';
import { destroySession, clearCookieHeader, SESSION_COOKIE } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) await destroySession(match[1]);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookieHeader());
  return res;
}
