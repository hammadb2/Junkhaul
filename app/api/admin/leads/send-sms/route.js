import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { requireStaffPermission } from '@/lib/staffAuth';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

export async function POST(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'communications.send_approved_sms',
    action: 'leads.send_follow_up',
    metadata: { route: '/api/admin/leads/send-sms' },
  });
  if (!auth.ok) return auth.response;
  const { leads, reason = null } = await req.json();
  if (!Array.isArray(leads)) return NextResponse.json({ error: 'leads array required' }, { status: 422 });

  const results = [];
  for (const lead of leads) {
    if (!lead.phone) continue;
    try {
      const message = `Hi ${lead.name || 'there'}, this is Junkhaul following up on your junk removal quote. Ready to book? Call us or reply to this message. - Junkhaul Calgary`;
      const sms = await sendSMS(lead.phone, message, {
        lead_id: lead.id,
        message_type: 'lead_follow_up',
        workflow_action: 'lead_follow_up',
      });

      // Mark follow-up as sent
      if (sms?.ok !== false) {
        await supabaseAdmin
          .from('leads')
          .update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() })
          .eq('id', lead.id);
        await recordTimelineEvent({
          entity_type: 'lead',
          entity_id: lead.id,
          event_type: 'lead_follow_up_sms',
          actor_type: 'employee',
          actor_id: auth.context.employee.id,
          source: 'admin_leads',
          reason,
          metadata: { message_id: sms?.message_id || sms?.id || null, provider_status: sms?.status || sms?.provider_status || null },
        });
      }

      results.push({ id: lead.id, phone: lead.phone, status: sms?.ok === false ? 'blocked_or_failed' : 'sent', message: sms });
    } catch (e) {
      results.push({ id: lead.id, phone: lead.phone, status: 'failed', error: e.message });
    }
  }

  return NextResponse.json({ results, sent: results.filter((r) => r.status === 'sent').length });
}
