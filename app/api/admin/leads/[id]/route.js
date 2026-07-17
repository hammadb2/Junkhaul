import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { data: lead, error } = await supabaseAdmin.from('leads').select('*, quotes:lead_quotes(*)').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const [{ data: messages }, { data: timeline }, { data: attribution }, { data: donations }, { data: calls }] = await Promise.all([
    supabaseAdmin.from('messages').select('*').eq('lead_id', id).order('sent_at', { ascending: true }),
    supabaseAdmin.from('timeline_events').select('*').eq('entity_type', 'lead').eq('entity_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('attribution_records').select('*, campaign:marketing_campaigns(*), batch:campaign_batches(*)').eq('lead_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('donation_requests').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('phone_calls').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
  ]);
  return NextResponse.json({ lead, messages: messages || [], timeline: timeline || [], attribution: attribution || [], donations: donations || [], calls: calls || [] });
}
