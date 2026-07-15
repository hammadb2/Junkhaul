import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { leads } = await req.json();
  if (!Array.isArray(leads)) return NextResponse.json({ error: 'leads array required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const results = [];
  for (const lead of leads) {
    if (!lead.phone) continue;
    try {
      const message = `Hi ${lead.name || 'there'}, this is Junkhaul following up on your junk removal quote. Ready to book? Call us or reply to this message. - Junkhaul Calgary`;
      // Log the SMS attempt
      const { error } = await supabase
        .from('sms_log')
        .insert({ to_phone: lead.phone, message, direction: 'outbound', status: 'sent', lead_id: lead.id });

      // Mark follow-up as sent
      if (!error) {
        await supabase
          .from('leads')
          .update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() })
          .eq('id', lead.id);
      }

      results.push({ id: lead.id, phone: lead.phone, status: error ? 'failed' : 'sent' });
    } catch (e) {
      results.push({ id: lead.id, phone: lead.phone, status: 'failed', error: e.message });
    }
  }

  return NextResponse.json({ results, sent: results.filter((r) => r.status === 'sent').length });
}
