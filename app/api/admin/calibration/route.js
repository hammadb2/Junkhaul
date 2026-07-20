import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { recordCalibration } from '@/lib/physicalMeasurements';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  return token && token === expected;
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const record = await recordCalibration(body);
    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
