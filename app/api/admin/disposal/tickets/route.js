import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { verifyTicket } from '@/lib/disposal';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  return token && token === expected;
}

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('disposal_tickets')
    .select('*, disposal_runs(*, facilities(*))')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data });
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ticket_id, verified_by, reason, corrected_values } = await req.json();
  if (!ticket_id || !verified_by || !reason) {
    return NextResponse.json({ error: 'ticket_id, verified_by, reason required' }, { status: 400 });
  }
  try {
    const ticket = await verifyTicket({ ticketId: ticket_id, verifiedBy: verified_by, reason, correctedValues: corrected_values });
    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
