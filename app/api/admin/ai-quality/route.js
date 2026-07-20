import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { generateQualitySnapshot, getQualitySnapshots } from '@/lib/aiQuality';

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
  const period = searchParams.get('period') || 'daily';
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  try {
    const snapshots = await getQualitySnapshots(period, limit);
    return NextResponse.json({ snapshots });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { period = 'daily' } = body;
  try {
    const snapshot = await generateQualitySnapshot(period);
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
