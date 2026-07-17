import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'leads.manage',
    action: 'leads.list',
    metadata: { route: '/api/admin/leads' },
  });
  if (!auth.ok) return auth.response;

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
