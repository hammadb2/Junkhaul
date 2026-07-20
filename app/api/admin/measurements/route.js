import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getMeasurementsForBooking, correctMeasurement } from '@/lib/physicalMeasurements';

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
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  try {
    const measurements = await getMeasurementsForBooking(bookingId);
    return NextResponse.json({ measurements });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { measurement_id, corrected_by, correction_reason, updates } = await req.json();
    const result = await correctMeasurement({ measurementId: measurement_id, correctedBy: corrected_by, correctionReason: correction_reason, updates });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
