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

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .is('converted_to_booking_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch quote history for all these leads in one query.
  const leadIds = (leads || []).map((l) => l.id);
  let quotesByLead = {};
  if (leadIds.length > 0) {
    const { data: quotes } = await supabaseAdmin
      .from('lead_quotes')
      .select('lead_id, price, load_size, photos, itemized, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });
    (quotes || []).forEach((q) => {
      if (!quotesByLead[q.lead_id]) quotesByLead[q.lead_id] = [];
      quotesByLead[q.lead_id].push(q);
    });
  }

  const enriched = (leads || []).map((l) => ({
    ...l,
    quotes: quotesByLead[l.id] || [],
  }));

  return NextResponse.json({ leads: enriched });
}
