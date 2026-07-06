import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

export async function POST(req) {
  if (!(await checkAuth()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { booking_id } = await req.json();
  if (!booking_id)
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ crew_arrived_at: new Date().toISOString() })
    .eq('id', booking_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
