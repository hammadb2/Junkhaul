import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/events?type=&booking_id=&lead_id&limit=100&offset=0
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const event_type = searchParams.get('type');
  const booking_id = searchParams.get('booking_id');
  const lead_id = searchParams.get('lead_id');
  const limit = Math.min(500, parseInt(searchParams.get('limit') || '100', 10));
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabaseAdmin
    .from('system_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (event_type) query = query.eq('event_type', event_type);
  if (booking_id) query = query.eq('booking_id', booking_id);
  if (lead_id) query = query.eq('lead_id', lead_id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}

// Auth guard placeholder - will be added
