import { NextResponse } from 'next/server';
import { getOrCreateAttributionCookie } from '@/lib/attribution';

export const runtime = 'nodejs';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  await getOrCreateAttributionCookie({
    channel: 'offline',
    source: 'door_hanger',
    landing_path: '/book/hanger',
    referrer: req.headers.get('referer') || null,
    tracking_code: code || null,
    code: code || null,
    attribution_reason: code ? 'door_hanger_tracking_code' : 'door_hanger_landing',
  });
  const dest = new URL('/book', url.origin);
  return NextResponse.redirect(dest, { status: 307 });
}
