import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

// Mark a job complete. The review-requests cron will text the customer ~1h later.
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { booking_id, operator_notes } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'completed',
      operator_notes: operator_notes || null,
    })
    .eq('id', booking_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
