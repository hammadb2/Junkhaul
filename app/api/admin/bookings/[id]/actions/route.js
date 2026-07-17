import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { recordAuditEvent } from '@/lib/auditEvents';
import { recordTimelineEvent } from '@/lib/timeline';
import { managerCanAccessAny, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

const ACTION_PERMISSIONS = {
  assign_crew: 'bookings.assign',
  change_crew: 'bookings.assign',
  unassign_crew: 'bookings.assign',
  assign_truck: 'bookings.assign',
  change_truck: 'bookings.assign',
  unassign_truck: 'bookings.assign',
  reschedule: 'bookings.reschedule',
  cancel_without_refund: 'bookings.cancel',
  move_to_waitlist: 'bookings.reschedule',
  return_from_waitlist: 'bookings.reschedule',
  reopen: 'bookings.reschedule',
  mark_customer_unavailable: 'bookings.reschedule',
  record_no_show: 'bookings.reschedule',
  correct_address: 'bookings.correct_address',
  correct_access: 'bookings.correct_address',
  correct_property: 'bookings.correct_address',
  override_service_area: 'bookings.correct_address',
  request_photos: 'communications.send_approved_sms',
  send_quo_template: 'communications.send_approved_sms',
  resend_payment_link: 'communications.send_approved_sms',
  send_photo_upload_link: 'communications.send_approved_sms',
  send_reschedule_confirmation: 'communications.send_approved_sms',
  send_cancellation_notice: 'communications.send_approved_sms',
  add_internal_note: 'bookings.notes',
  review_quote: 'bookings.review_quote',
  manual_quote_correction: 'bookings.review_quote',
  flag_hazardous_item: 'bookings.review_quote',
  flag_quote_mismatch: 'bookings.review_quote',
  flag_issue: 'bookings.escalate',
  escalate: 'bookings.escalate',
  mark_ready_for_dispatch: 'bookings.assign',
};

const MESSAGE_TEMPLATES = {
  request_photos: 'Could you please upload a few more photos of the items for your Junk Haul booking? This helps us confirm the quote and arrive prepared.',
  send_photo_upload_link: 'Here is your secure photo-upload link for your Junk Haul booking: {{link}}',
  resend_payment_link: 'Here is your Junk Haul deposit/payment link: {{link}}',
  send_reschedule_confirmation: 'Your Junk Haul appointment has been rescheduled to {{date}} at {{time}}. Reply if anything looks wrong.',
  send_cancellation_notice: 'Your Junk Haul appointment has been cancelled. Refunds, if applicable, are handled separately by the owner/admin team.',
  manager_follow_up: 'A Junk Haul manager is reviewing your booking and will follow up shortly.',
};

function renderTemplate(action, payload, booking) {
  const key = payload?.template_key || action;
  const template = MESSAGE_TEMPLATES[key];
  if (!template) return null;
  return template
    .replace('{{link}}', payload?.link || 'https://junkhaul.ca/book')
    .replace('{{date}}', payload?.job_date || booking.job_date || '')
    .replace('{{time}}', payload?.job_time || booking.job_time || '');
}

function appendNote(existing, note, actorId) {
  const prefix = `[${new Date().toISOString()}] ${actorId}: `;
  return [existing || '', `${prefix}${note}`].filter(Boolean).join('\n');
}

async function assertManagerCanAct(context, booking) {
  if (!context.roles.includes('manager') || context.roles.includes('owner') || context.roles.includes('admin')) return true;
  const checks = [
    ['booking', booking.id],
    ['date', booking.job_date],
    ['quadrant', booking.quadrant],
    ['crew_assignment', booking.crew_assignment_id],
    ['crew', booking.crew_assignment_id],
    ['truck', booking.truck_id || booking.truck_size],
    ['route_plan', booking.route_plan_id],
    ['daily_operation', booking.job_date],
  ].filter(([, value]) => value).map(([scope_type, scope_value]) => ({ scope_type, scope_value }));
  return managerCanAccessAny ? managerCanAccessAny(context.employee.id, checks) : false;
}

async function writeActionEvents({ context, booking, action, reason, before, after, metadata, correlationId }) {
  const common = {
    entity_type: 'booking',
    entity_id: booking.id,
    event_type: action,
    actor_type: 'employee',
    actor_id: context.employee.id,
    source: 'admin_booking_detail',
    before,
    after,
    reason,
    metadata,
    correlation_id: correlationId,
  };
  await recordAuditEvent(common);
  await recordTimelineEvent(common);
}

export async function POST(req, { params }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const payload = body.payload || {};
  const reason = body.reason || payload.reason || null;
  const permission = ACTION_PERMISSIONS[action];

  if (!permission) return NextResponse.json({ error: 'Unsupported booking action' }, { status: 422 });
  if (['reschedule', 'cancel_without_refund', 'move_to_waitlist', 'return_from_waitlist', 'reopen', 'correct_address', 'override_service_area', 'manual_quote_correction', 'flag_hazardous_item', 'flag_quote_mismatch', 'flag_issue', 'escalate'].includes(action) && !reason) {
    return NextResponse.json({ error: 'reason is required for this action' }, { status: 422 });
  }

  const auth = await requireStaffPermission(req, {
    permission,
    entityType: 'booking',
    entityId: id,
    action,
    reason,
    metadata: { route: '/api/admin/bookings/[id]/actions' },
  });
  if (!auth.ok) return auth.response;

  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (['completed', 'cancelled'].includes(booking.status) && !['add_internal_note', 'send_quo_template', 'escalate', 'reopen'].includes(action)) {
    return NextResponse.json({ error: `Cannot perform ${action} on ${booking.status} booking` }, { status: 409 });
  }
  if (!(await assertManagerCanAct(auth.context, booking))) {
    await recordAuditEvent({
      entity_type: 'booking',
      entity_id: id,
      event_type: 'manager_scope_denied',
      actor_type: 'employee',
      actor_id: auth.context.employee.id,
      source: 'admin_booking_detail',
      reason,
      metadata: { action, permission },
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const before = booking;
  const correlationId = randomUUID();
  let after = null;
  let result = {};

  if (['assign_crew', 'change_crew'].includes(action)) {
    const assignmentId = payload.assignment_id || null;
    if (!assignmentId) return NextResponse.json({ error: 'assignment_id required' }, { status: 422 });
    const { data: assignment } = await supabaseAdmin.from('crew_assignments').select('*').eq('id', assignmentId).maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Crew assignment not found' }, { status: 404 });
    if (assignment.assignment_date && booking.job_date && assignment.assignment_date !== booking.job_date) {
      return NextResponse.json({ error: 'Crew assignment date does not match booking date' }, { status: 409 });
    }
    const { data: conflict } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, job_time, status')
      .eq('crew_assignment_id', assignmentId)
      .eq('job_date', booking.job_date)
      .eq('job_time', booking.job_time)
      .in('status', ['confirmed', 'rescheduled'])
      .neq('id', id)
      .limit(1)
      .maybeSingle();
    if (conflict) return NextResponse.json({ error: 'Crew already has a booking in this window', conflict }, { status: 409 });
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ crew_assignment_id: assignmentId })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
    result.assignment = assignment;
  } else if (action === 'unassign_crew') {
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ crew_assignment_id: null })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (['assign_truck', 'change_truck'].includes(action)) {
    const truckSize = Number(payload.truck_size);
    if (![15, 20, 26].includes(truckSize)) return NextResponse.json({ error: 'truck_size must be 15, 20, or 26' }, { status: 422 });
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ truck_size: truckSize, truck_fee: payload.truck_fee ?? booking.truck_fee ?? 0 })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'unassign_truck') {
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ truck_size: 15, truck_fee: 0 })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'reschedule') {
    if (!payload.job_date || !payload.job_time) return NextResponse.json({ error: 'job_date and job_time required' }, { status: 422 });
    const history = Array.isArray(booking.schedule_history) ? booking.schedule_history : [];
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        original_job_date: booking.original_job_date || booking.job_date,
        original_job_time: booking.original_job_time || booking.job_time,
        job_date: payload.job_date,
        job_time: payload.job_time,
        job_datetime: `${payload.job_date}T${payload.job_time}:00`,
        status: booking.status === 'pending_payment' ? booking.status : 'rescheduled',
        reschedule_count: Number(booking.reschedule_count || 0) + 1,
        schedule_history: [...history, { at: new Date().toISOString(), actor_id: auth.context.employee.id, action, reason, before: { job_date: booking.job_date, job_time: booking.job_time }, after: { job_date: payload.job_date, job_time: payload.job_time } }],
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'move_to_waitlist') {
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        operator_notes: appendNote(booking.operator_notes, reason || 'Moved to waitlist', auth.context.employee.id),
        schedule_history: [...(Array.isArray(booking.schedule_history) ? booking.schedule_history : []), { at: new Date().toISOString(), actor_id: auth.context.employee.id, action, reason, before: { status: booking.status, job_date: booking.job_date, job_time: booking.job_time }, after: { waitlist_pending: true } }],
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'return_from_waitlist' || action === 'reopen') {
    const nextStatus = action === 'reopen' ? 'confirmed' : 'confirmed';
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: nextStatus,
        operator_notes: appendNote(booking.operator_notes, reason || action, auth.context.employee.id),
        schedule_history: [...(Array.isArray(booking.schedule_history) ? booking.schedule_history : []), { at: new Date().toISOString(), actor_id: auth.context.employee.id, action, reason, before: { status: booking.status }, after: { status: nextStatus } }],
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'cancel_without_refund') {
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: 'operator',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'record_no_show') {
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'no_show', operator_notes: appendNote(booking.operator_notes, reason, auth.context.employee.id) })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'correct_address') {
    const update = {
      address: payload.address ?? booking.address,
      unit: payload.unit ?? booking.unit,
      buzzer: payload.buzzer ?? booking.buzzer,
      normalized_address: payload.normalized_address ?? booking.normalized_address,
      postal_code: payload.postal_code ?? booking.postal_code,
      quadrant: payload.quadrant ?? booking.quadrant,
      lat: payload.lat ?? booking.lat,
      lng: payload.lng ?? booking.lng,
      address_override_actor: auth.context.employee.id,
      address_override_reason: reason,
      address_correction_history: [
        ...(Array.isArray(booking.address_correction_history) ? booking.address_correction_history : []),
        { at: new Date().toISOString(), actor_id: auth.context.employee.id, reason, before: { address: booking.address, unit: booking.unit, lat: booking.lat, lng: booking.lng }, after: payload },
      ],
    };
    const { data, error: updateError } = await supabaseAdmin.from('bookings').update(update).eq('id', id).select('*').single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (['correct_access', 'correct_property', 'override_service_area'].includes(action)) {
    const update = {
      access_instructions: payload.access_instructions ?? booking.access_instructions,
      stairs: payload.stairs ?? booking.stairs,
      elevator: payload.elevator ?? booking.elevator,
      parking: payload.parking ?? booking.parking,
      property_type: payload.property_type ?? booking.property_type,
      apartment_status: payload.apartment_status ?? booking.apartment_status,
      service_area_result: payload.service_area_result ?? booking.service_area_result,
      address_override_actor: auth.context.employee.id,
      address_override_reason: reason,
    };
    const { data, error: updateError } = await supabaseAdmin.from('bookings').update(update).eq('id', id).select('*').single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (action === 'add_internal_note') {
    if (!payload.note) return NextResponse.json({ error: 'note required' }, { status: 422 });
    const { data, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ operator_notes: appendNote(booking.operator_notes, payload.note, auth.context.employee.id) })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (['review_quote', 'manual_quote_correction', 'flag_hazardous_item', 'flag_quote_mismatch', 'flag_issue', 'escalate', 'mark_ready_for_dispatch', 'mark_customer_unavailable'].includes(action)) {
    const note = payload.note || reason || action;
    const update = { operator_notes: appendNote(booking.operator_notes, note, auth.context.employee.id) };
    if (action === 'flag_hazardous_item') Object.assign(update, { has_hazmat: true, hazmat_description: payload.hazmat_description || booking.hazmat_description || reason });
    if (action === 'flag_quote_mismatch' || action === 'flag_issue') Object.assign(update, { flag_for_review: true, flag_reason: reason || payload.note || action });
    if (action === 'mark_ready_for_dispatch') Object.assign(update, { crew_status: 'confirmed' });
    const { data, error: updateError } = await supabaseAdmin.from('bookings').update(update).eq('id', id).select('*').single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    after = data;
  } else if (['request_photos', 'send_quo_template', 'resend_payment_link', 'send_photo_upload_link', 'send_reschedule_confirmation', 'send_cancellation_notice'].includes(action)) {
    const bodyText = action === 'send_quo_template' ? renderTemplate(payload.template_key, payload, booking) : renderTemplate(action, payload, booking);
    if (!bodyText) return NextResponse.json({ error: 'approved template not found' }, { status: 422 });
    const sms = await sendSMS(booking.phone, bodyText, {
      booking_id: booking.id,
      message_type: payload.message_type || action,
      workflow_action: action,
      correlation_id: correlationId,
    });
    after = booking;
    result.message = sms;
  }

  await writeActionEvents({
    context: auth.context,
    booking,
    action,
    reason,
    before,
    after,
    metadata: { payload, permission, result },
    correlationId,
  });

  return NextResponse.json({ ok: true, action, booking: after, result, correlation_id: correlationId });
}
