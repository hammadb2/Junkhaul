import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getReviewQueue } from '@/lib/aiQuality';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  return token && token === expected;
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'review_required';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  try {
    const observations = await getReviewQueue({ status, limit, offset });
    return NextResponse.json({ observations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
