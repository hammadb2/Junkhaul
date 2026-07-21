import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';
import { cronStarted, cronFinished, cronFailed, logEvent } from '@/lib/audit';
import { getBooleanConfig } from '@/lib/config';
import { createAlert } from '@/lib/alerts';
import { getTenantBySlug } from '@/lib/rehaul';

export const runtime = 'nodejs';

// ============================================================
// 24-HOUR GUARANTEE AT-RISK CRON
//
// Junk Haul's core promise is pickup within 24 hours of booking. This
// scans for bookings approaching that deadline with no completion and
// escalates once, 4 hours before the guarantee would be breached —
// early enough that dispatch/crew can still reassign a truck or call
// the customer, late enough that it doesn't fire on jobs progressing
// normally.
//
// Detection and escalation only. Deliberately does not auto-reassign,
// auto-cancel, or auto-refund anything — those are dispatch/operator
// decisions.
//
// Recipients (per escalation policy): the assigned crew (if any),
// the admin/dispatch panel (via the alerts table — see lib/alerts.js
// and components/admin/AlertsPanel.js), and the operator phone.
// Follows the same text-plus-logged-row shape as the existing
// escalate_to_owner dispatch tool (lib/dispatchTools.js) rather than
// a silent flag.
//
// Idempotent: each booking is only alerted once, tracked via
// bookings.sla_risk_alerted_at (see migration
// 20260817000001_sla_risk_tracking.sql).
// ============================================================

const OPERATOR_PHONE = process.env.HAMMAD_PHONE || '+18259458282';
const WARNING_WINDOW_HOURS = 4;
const GUARANTEE_HOURS = 24;

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'at-risk-24h';
    await cronStarted(cronName);

    if (!(await getBooleanConfig('sla_at_risk_alert_enabled', true))) {
      await cronFinished(cronName, { skipped: true, reason: 'disabled_via_config' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled_via_config' });
    }

    const now = new Date();
    // Bookings created between 20 and 24 hours ago (i.e. within the last
    // WARNING_WINDOW_HOURS of the GUARANTEE_HOURS deadline) that haven't
    // completed and haven't already been alerted.
    const windowStart = new Date(now.getTime() - GUARANTEE_HOURS * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() - (GUARANTEE_HOURS - WARNING_WINDOW_HOURS) * 60 * 60 * 1000);

    const { data: atRiskBookings, error: queryErr } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, name, phone, address, job_date, job_time, status, created_at, crew_assignment_id')
      .not('status', 'in', '(completed,cancelled)')
      .is('sla_risk_alerted_at', null)
      .lte('created_at', windowEnd.toISOString())
      .gt('created_at', windowStart.toISOString());

    if (queryErr) throw queryErr;

    let alertedCount = 0;
    const errors = [];

    const tenant = await getTenantBySlug('junkhaul');

    for (const booking of atRiskBookings || []) {
      try {
        const deadline = new Date(new Date(booking.created_at).getTime() + GUARANTEE_HOURS * 60 * 60 * 1000);
        const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (60 * 60 * 1000)).toFixed(1);

        // Look up the assigned crew's phone numbers, if any.
        let crewPhones = [];
        if (booking.crew_assignment_id) {
          const { data: assignment } = await supabaseAdmin
            .from('crew_assignments')
            .select('driver_employee_id, secondary_employee_id')
            .eq('id', booking.crew_assignment_id)
            .maybeSingle();
          if (assignment) {
            const employeeIds = [assignment.driver_employee_id, assignment.secondary_employee_id].filter(Boolean);
            if (employeeIds.length) {
              const { data: employees } = await supabaseAdmin
                .from('employees')
                .select('phone')
                .in('id', employeeIds);
              crewPhones = (employees || []).map((e) => e.phone).filter(Boolean);
            }
          }
        }

        const assignmentNote = booking.crew_assignment_id
          ? (crewPhones.length ? 'Crew assigned.' : 'Crew assigned but no phone on file.')
          : 'NOT YET ASSIGNED TO A CREW.';
        const reason = `Booking ${booking.booking_ref || booking.id} (${booking.name}, ${booking.address || 'no address'}) is ${hoursRemaining}h from breaching the 24-hour pickup guarantee. ${assignmentNote}`;

        // Text the operator, always.
        try {
          await sendSMS(
            OPERATOR_PHONE,
            `[24H GUARANTEE AT RISK] ${reason} Booked ${booking.created_at}.`,
            booking.id,
            'sla_at_risk_operator'
          );
        } catch { /* best-effort */ }

        // Text the assigned crew, if any.
        for (const phone of crewPhones) {
          try {
            await sendSMS(
              phone,
              `[URGENT] Booking ${booking.booking_ref || booking.id} for ${booking.name} is within ${hoursRemaining}h of the 24-hour pickup guarantee. Please confirm you can make this pickup or contact dispatch.`,
              booking.id,
              'sla_at_risk_crew'
            );
          } catch { /* best-effort */ }
        }

        // Logged row — same shape as the existing escalate_to_owner
        // dispatch tool (text plus a persisted row, not a silent flag).
        await supabaseAdmin.from('escalations').insert({
          caller_phone: booking.phone || null,
          booking_ref: booking.booking_ref || booking.id,
          reason: `[24h Guarantee] ${reason}`,
          escalated_by: 'cron:at-risk-24h',
          priority: 'critical',
        });

        // Admin/dispatch panel visibility.
        try {
          await createAlert({
            tenantId: tenant.id,
            category: 'sla_at_risk',
            severity: 'critical',
            title: '24-hour guarantee at risk',
            description: reason,
            entityType: 'booking',
            entityId: booking.id,
          });
        } catch (alertErr) {
          console.error('Failed to create sla_at_risk alert:', alertErr.message);
        }

        await supabaseAdmin
          .from('bookings')
          .update({ sla_risk_alerted_at: now.toISOString() })
          .eq('id', booking.id);

        await logEvent({ event_type: 'sla_at_risk_alerted', booking_id: booking.id, payload: { hours_remaining: hoursRemaining, crew_assigned: !!booking.crew_assignment_id } });
        alertedCount++;
      } catch (err) {
        errors.push({ booking_id: booking.id, error: err.message });
      }
    }

    await cronFinished(cronName, { alerted: alertedCount, errors: errors.length });
    return NextResponse.json({
      ok: true,
      alerted: alertedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await cronFailed('at-risk-24h', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
