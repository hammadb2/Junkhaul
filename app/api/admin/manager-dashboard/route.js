import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { recordAuditEvent } from '@/lib/auditEvents';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

function managerScoped(context) {
  return context.roles.includes('manager') && !context.roles.includes('owner') && !context.roles.includes('admin');
}

async function getActiveScopes(employeeId) {
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from('manager_scopes')
    .select('scope_type, scope_value, effect, expires_at')
    .eq('employee_id', employeeId)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  return data || [];
}

function scopeAllows(scopes, row) {
  const pairs = [
    ['booking', row.id],
    ['date', row.job_date || row.operation_date],
    ['quadrant', row.quadrant],
    ['crew_assignment', row.crew_assignment_id],
    ['crew', row.crew_assignment_id],
    ['employee', row.employee_id],
    ['daily_operation', row.job_date || row.operation_date],
  ].filter(([, value]) => value).map(([scope_type, scope_value]) => `${scope_type}:${scope_value}`);
  if (scopes.some((s) => s.effect === 'deny' && pairs.includes(`${s.scope_type}:${s.scope_value}`))) return false;
  return scopes.some((s) => (s.effect || 'allow') === 'allow' && pairs.includes(`${s.scope_type}:${s.scope_value}`));
}

function filterScoped(context, scopes, rows) {
  if (!managerScoped(context)) return rows || [];
  return (rows || []).filter((row) => scopeAllows(scopes, row));
}

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'admin.read',
    action: 'manager_dashboard.read',
    metadata: { route: '/api/admin/manager-dashboard' },
  });
  if (!auth.ok) return auth.response;

  const today = new Date().toISOString().slice(0, 10);
  const scopes = managerScoped(auth.context) ? await getActiveScopes(auth.context.employee.id) : [];
  const [
    { data: todayBookings },
    { data: unassignedBookings },
    { data: failedMessages },
    { data: donationReview },
    { data: incidents },
    { data: escalations },
    { data: crewHours },
    { data: paymentProblems },
    { data: closeout },
  ] = await Promise.all([
    supabaseAdmin.from('bookings').select('id, booking_ref, name, phone, address, quadrant, job_date, job_time, status, crew_assignment_id, truck_size, deposit_paid, balance_due, no_show_risk_score').eq('job_date', today).order('job_time', { ascending: true }),
    supabaseAdmin.from('bookings').select('id, booking_ref, name, address, quadrant, job_date, job_time, status, crew_assignment_id, truck_size').gte('job_date', today).is('crew_assignment_id', null).in('status', ['confirmed','rescheduled']).order('job_date', { ascending: true }).limit(50),
    supabaseAdmin.from('messages').select('*').in('provider_status', ['failed','rejected','suppressed']).order('created_at', { ascending: false }).limit(25),
    supabaseAdmin.from('donation_requests').select('id, name, phone, address, status, ai_outcome, confidence, created_at, last_activity_at').in('status', ['submitted','analyzing','manual_review','needs_more_photos','ai_approved']).order('created_at', { ascending: false }).limit(25),
    supabaseAdmin.from('safety_incidents').select('*').in('status', ['open','investigating']).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('escalations').select('*').in('status', ['open','pending']).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('timesheets').select('id, employee_id, clock_in_at, clock_out_at, total_hours, approved_at, booking_id').is('approved_at', null).not('clock_out_at', 'is', null).order('clock_in_at', { ascending: false }).limit(25),
    supabaseAdmin.from('bookings').select('id, booking_ref, name, phone, job_date, status, deposit_paid, balance_due, payment_status').gte('job_date', today).or('deposit_paid.eq.false,payment_status.eq.failed').order('job_date', { ascending: true }).limit(25),
    supabaseAdmin.from('manager_daily_closeouts').select('*').eq('operation_date', today).eq('manager_employee_id', auth.context.employee.id).maybeSingle(),
  ]);

  const scopedTodayBookings = filterScoped(auth.context, scopes, todayBookings);
  const scopedUnassignedBookings = filterScoped(auth.context, scopes, unassignedBookings);
  const scopedIncidents = filterScoped(auth.context, scopes, incidents);
  const scopedEscalations = filterScoped(auth.context, scopes, escalations);
  const scopedCrewHours = filterScoped(auth.context, scopes, crewHours);
  const scopedPaymentProblems = filterScoped(auth.context, scopes, paymentProblems);

  return NextResponse.json({
    today,
    role_context: { roles: auth.context.roles, scoped: managerScoped(auth.context), scopes },
    queues: {
      today_bookings: scopedTodayBookings,
      unassigned_bookings: scopedUnassignedBookings,
      jobs_missing_crew: scopedUnassignedBookings.filter((b) => !b.crew_assignment_id),
      jobs_missing_truck: scopedTodayBookings.filter((b) => !b.truck_size),
      at_risk_jobs: scopedTodayBookings.filter((b) => Number(b.no_show_risk_score || 0) >= 50),
      failed_quo_messages: failedMessages || [],
      donation_requests_awaiting_review: donationReview || [],
      incidents: scopedIncidents,
      escalations: scopedEscalations,
      crew_hours_awaiting_review: scopedCrewHours,
      payment_problems: scopedPaymentProblems,
    },
    counts: {
      today_bookings: scopedTodayBookings.length,
      unassigned_bookings: scopedUnassignedBookings.length,
      failed_quo_messages: (failedMessages || []).length,
      donation_review: (donationReview || []).length,
      incidents: scopedIncidents.length,
      escalations: scopedEscalations.length,
      crew_hours_awaiting_review: scopedCrewHours.length,
      payment_problems: scopedPaymentProblems.length,
    },
    closeout: closeout || null,
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const auth = await requireStaffPermission(req, {
    permission: 'manager.closeout',
    action: 'manager_dashboard.closeout',
    reason: body.reason || null,
  });
  if (!auth.ok) return auth.response;

  const operationDate = body.operation_date || new Date().toISOString().slice(0, 10);
  const checklist = body.checklist && typeof body.checklist === 'object' ? body.checklist : {};
  const status = body.submit ? 'submitted' : 'draft';
  const payload = {
    operation_date: operationDate,
    manager_employee_id: auth.context.employee.id,
    checklist,
    notes: body.notes || null,
    status,
    submitted_at: status === 'submitted' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from('manager_daily_closeouts')
    .upsert(payload, { onConflict: 'operation_date,manager_employee_id' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const event = {
    entity_type: 'manager_daily_closeout',
    entity_id: data.id,
    event_type: 'manager_closeout_saved',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'manager_dashboard',
    after: data,
    reason: body.reason || null,
    metadata: { submit: !!body.submit },
  };
  await recordAuditEvent(event);
  await recordTimelineEvent(event);
  return NextResponse.json({ closeout: data });
}
