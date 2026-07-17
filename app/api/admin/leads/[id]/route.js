import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { recordAuditEvent } from '@/lib/auditEvents';
import { recordTimelineEvent } from '@/lib/timeline';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, {
    permission: 'leads.manage',
    entityType: 'lead',
    entityId: id,
    action: 'lead_detail.read',
    metadata: { route: '/api/admin/leads/[id]' },
  });
  if (!auth.ok) return auth.response;
  const { data: lead, error } = await supabaseAdmin.from('leads').select('*, quotes:lead_quotes(*)').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const [{ data: messages }, { data: timeline }, { data: attribution }, { data: donations }, { data: calls }, { data: bookings }, { data: waitlist }, { data: serviceRequests }, { data: refundRequests }] = await Promise.all([
    supabaseAdmin.from('messages').select('*').eq('lead_id', id).order('sent_at', { ascending: true }),
    supabaseAdmin.from('timeline_events').select('*').eq('entity_type', 'lead').eq('entity_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('attribution_records').select('*, campaign:marketing_campaigns(*), batch:campaign_batches(*)').eq('lead_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('donation_requests').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('phone_calls').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('bookings').select('id, booking_ref, status, job_date, job_time, total_price, created_at').or(`lead_id.eq.${id},phone.eq.${lead.phone}`).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('waitlist').select('*').eq('phone', lead.phone).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('service_requests').select('*').eq('phone', lead.phone).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('refund_requests').select('*').eq('phone', lead.phone).order('created_at', { ascending: false }).limit(10),
  ]);
  return NextResponse.json({
    lead,
    messages: messages || [],
    timeline: timeline || [],
    attribution: attribution || [],
    donations: donations || [],
    calls: calls || [],
    bookings: bookings || [],
    waitlist: waitlist || [],
    service_requests: serviceRequests || [],
    refund_requests: refundRequests || [],
  });
}

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason = null, payload = {} } = body;
  const auth = await requireStaffPermission(req, {
    permission: action === 'send_follow_up' || action === 'request_photos' ? 'communications.send_approved_sms' : 'leads.manage',
    entityType: 'lead',
    entityId: id,
    action: `lead.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;

  const { data: lead } = await supabaseAdmin.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  let after = lead;
  let result = {};
  if (action === 'add_note') {
    if (!payload.note) return NextResponse.json({ error: 'note required' }, { status: 422 });
    const note = `[${new Date().toISOString()}] ${auth.context.employee.id}: ${payload.note}`;
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ admin_notes: [lead.admin_notes || '', note].filter(Boolean).join('\n'), last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
  } else if (action === 'mark_invalid') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ status: 'invalid', abandonment_point: 'marked_invalid', last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
  } else if (action === 'mark_spam') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ status: 'spam', abandonment_point: 'marked_spam', last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
  } else if (action === 'convert_to_booking') {
    if (!reason || !payload.booking_id) return NextResponse.json({ error: 'reason and booking_id are required' }, { status: 422 });
    const { data: booking } = await supabaseAdmin.from('bookings').select('id,booking_ref').eq('id', payload.booking_id).maybeSingle();
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    await supabaseAdmin.from('bookings').update({ lead_id: id }).eq('id', booking.id);
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ status: 'converted', converted_to_booking_id: booking.id, last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
    result.booking = booking;
  } else if (action === 'convert_to_donation') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donation_requests')
      .insert({
        lead_id: id,
        session_id: lead.session_id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        status: 'draft',
        last_completed_step: 'admin_converted_from_lead',
        attribution_record_id: lead.attribution_record_id,
        first_touch_attribution_id: lead.first_touch_attribution_id,
        last_touch_attribution_id: lead.last_touch_attribution_id,
      })
      .select('*')
      .single();
    if (donationError) return NextResponse.json({ error: donationError.message }, { status: 500 });
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ status: 'engaged', last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
    result.donation_request = donation;
  } else if (action === 'add_to_waitlist') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const { data: waitlist, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .insert({
        name: lead.name || payload.name || 'Unknown lead',
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        preferred_date: payload.preferred_date || null,
        preferred_time: payload.preferred_time || null,
        source: 'admin_lead_detail',
        lead_id: id,
      })
      .select('*')
      .single();
    if (waitlistError) return NextResponse.json({ error: waitlistError.message }, { status: 500 });
    const { data, error } = await supabaseAdmin.from('leads').update({ last_activity_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
    result.waitlist = waitlist;
  } else if (action === 'merge_duplicate') {
    if (!reason || !payload.duplicate_lead_id) return NextResponse.json({ error: 'reason and duplicate_lead_id are required' }, { status: 422 });
    if (payload.duplicate_lead_id === id) return NextResponse.json({ error: 'duplicate_lead_id must be different from canonical lead' }, { status: 409 });
    const { data: duplicate } = await supabaseAdmin.from('leads').select('*').eq('id', payload.duplicate_lead_id).maybeSingle();
    if (!duplicate) return NextResponse.json({ error: 'Duplicate lead not found' }, { status: 404 });
    await Promise.all([
      supabaseAdmin.from('attribution_records').update({ lead_id: id }).eq('lead_id', duplicate.id),
      supabaseAdmin.from('messages').update({ lead_id: id }).eq('lead_id', duplicate.id),
      supabaseAdmin.from('phone_calls').update({ lead_id: id }).eq('lead_id', duplicate.id),
      supabaseAdmin.from('bookings').update({ lead_id: id }).eq('lead_id', duplicate.id),
      supabaseAdmin.from('donation_requests').update({ lead_id: id }).eq('lead_id', duplicate.id),
      supabaseAdmin.from('timeline_events').update({ entity_id: id }).eq('entity_type', 'lead').eq('entity_id', duplicate.id),
    ]);
    const mergedIds = new Set([...(Array.isArray(lead.merged_lead_ids) ? lead.merged_lead_ids : []), duplicate.id]);
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({ merged_lead_ids: [...mergedIds], last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('leads').update({ status: 'merged', merged_into_lead_id: id, last_activity_at: new Date().toISOString() }).eq('id', duplicate.id);
    after = data;
    result.merged_lead_id = duplicate.id;
  } else if (action === 'correct_attribution') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const update = {
      customer_reported_source: payload.customer_reported_source ?? lead.customer_reported_source,
      source: payload.source ?? lead.source,
      last_activity_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin.from('leads').update(update).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
  } else if (action === 'send_follow_up' || action === 'request_photos') {
    const message = action === 'request_photos'
      ? `Hi ${lead.name || 'there'}, could you upload a few photos so we can finish your Junk Haul quote?`
      : `Hi ${lead.name || 'there'}, this is Junkhaul following up on your junk removal quote. Ready to book? Call us or reply to this message. - Junkhaul Calgary`;
    result.message = await sendSMS(lead.phone, message, {
      lead_id: id,
      message_type: action === 'request_photos' ? 'lead_photo_request' : 'lead_follow_up',
      workflow_action: action,
    });
  } else if (action === 'escalate') {
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    const { data, error } = await supabaseAdmin.from('leads').update({ flag_for_review: true, abandonment_point: 'admin_escalated' }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    after = data;
  } else {
    return NextResponse.json({ error: 'Unsupported lead action' }, { status: 422 });
  }

  const event = {
    entity_type: 'lead',
    entity_id: id,
    event_type: `lead_${action}`,
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_lead_detail',
    before: lead,
    after,
    reason,
    metadata: { payload, result },
  };
  await recordAuditEvent(event);
  await recordTimelineEvent(event);
  return NextResponse.json({ ok: true, lead: after, result });
}
