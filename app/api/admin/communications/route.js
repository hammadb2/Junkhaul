import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { recordAuditEvent } from '@/lib/auditEvents';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

const SAFE_RETRY_TYPES = new Set([
  'lead_follow_up',
  'lead_photo_request',
  'donation_more_photos_needed',
  'donation_rejected',
  'payment_link',
  'photo_request',
  'manager_follow_up',
]);

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'communications.retry',
    action: 'communications.read',
    metadata: { route: '/api/admin/communications' },
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');

  let query = supabaseAdmin.from('messages').select('*').order('sent_at', { ascending: false }).limit(200);
  if (status) query = query.eq('provider_status', status);
  if (entityType && entityId) {
    const column = {
      lead: 'lead_id',
      booking: 'booking_id',
      donation_request: 'donation_request_id',
      campaign: 'campaign_id',
      service_request: 'service_request_id',
      refund_request: 'refund_request_id',
      nearby_offer: 'nearby_offer_id',
      employee: 'employee_id',
    }[entityType];
    if (column) query = query.eq(column, entityId);
  }

  const [{ data: messages, error }, { data: suppressions }, { data: expectedReplies }] = await Promise.all([
    query,
    supabaseAdmin.from('sms_suppression').select('*').is('lifted_at', null).order('suppressed_at', { ascending: false }).limit(100),
    supabaseAdmin.from('expected_replies').select('*').eq('status', 'active').order('expires_at', { ascending: true }).limit(100),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    messages: messages || [],
    active_suppressions: suppressions || [],
    active_expected_replies: expectedReplies || [],
    failed_count: (messages || []).filter((m) => ['failed', 'rejected', 'suppressed'].includes(m.provider_status)).length,
  });
}

export async function POST(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'communications.retry',
    action: 'communications.retry',
  });
  if (!auth.ok) return auth.response;

  const { action, message_id, body = null, reason = null } = await req.json().catch(() => ({}));
  if (action !== 'retry_failed_message') return NextResponse.json({ error: 'Unsupported communications action' }, { status: 422 });
  if (!message_id) return NextResponse.json({ error: 'message_id required' }, { status: 422 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });

  const { data: original } = await supabaseAdmin.from('messages').select('*').eq('id', message_id).maybeSingle();
  if (!original) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (!['failed', 'rejected', 'suppressed'].includes(original.provider_status)) {
    return NextResponse.json({ error: 'Only failed, rejected, or suppressed messages can be retried' }, { status: 409 });
  }
  if (!SAFE_RETRY_TYPES.has(original.message_type)) {
    return NextResponse.json({ error: 'This message type is not safe to retry automatically' }, { status: 409 });
  }

  let retryResult;
  try {
    retryResult = await sendSMS(original.to_number, body || original.body, {
      message_type: original.message_type,
      booking_id: original.booking_id,
      lead_id: original.lead_id,
      donation_request_id: original.donation_request_id,
      campaign_id: original.campaign_id,
      service_request_id: original.service_request_id,
      refund_request_id: original.refund_request_id,
      nearby_offer_id: original.nearby_offer_id,
      employee_id: original.employee_id,
      workflow_action: `retry:${original.workflow_action || original.message_type}`,
      correlation_id: original.correlation_id,
    });
  } catch (error) {
    retryResult = { ok: false, error: error.message };
  }

  await supabaseAdmin.from('messages').update({ retry_count: Number(original.retry_count || 0) + 1 }).eq('id', message_id);
  await recordAuditEvent({
    entity_type: 'message',
    entity_id: message_id,
    event_type: 'message_retry_attempted',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_communications',
    reason,
    before: original,
    after: retryResult,
    metadata: { message_type: original.message_type, provider_status: original.provider_status },
  });

  return NextResponse.json({ ok: retryResult?.ok !== false, retry: retryResult });
}
