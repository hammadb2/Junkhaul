import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { logDispatchAction, findEmployeeByPhone, findEmployeeByEmail, findEmployeeByName, DISPATCH_AGENT } from './dispatchAuth';
import { randomBytes } from 'crypto';

const OPERATOR_PHONE = process.env.HAMMAD_PHONE || '+18259458282';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';

function getSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith('https://')) return env.replace(/\/$/, '');
  return 'https://junkhaul.ca';
}

// Helper: send password reset email (same logic as admin crew route)
async function sendPasswordResetEmail({ email, first_name, token }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — password reset email skipped');
    return false;
  }
  const resetUrl = `${getSiteUrl()}/portal/reset-password?token=${token}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e4e4e7;">
<div style="text-align:center;margin-bottom:24px;"><span style="font-size:22px;font-weight:800;color:#f97316;">JunkHaul</span></div>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">Hi ${first_name},</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">You requested a password reset through Dispatch. Please set a new password to access your account:</p>
<p style="margin:0 0 20px;"><a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background:#f97316;border-radius:10px;">Set new password</a></p>
<p style="margin:0 0 10px;font-size:13px;color:#999;">This link expires in 24 hours.</p>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5;">Junk Haul Calgary · (587) 325-0751</p>
</div>
</body></html>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Junk Haul Calgary <crew@junkhaul.ca>',
        to: email,
        subject: 'Reset your Junk Haul Calgary password',
        html,
      }),
    });
    return true;
  } catch (e) {
    console.error('Password reset email failed:', e);
    return false;
  }
}

export const dispatchTools = {
  // 1 — Get crew schedule for today or a specific date
  async get_crew_schedule({ phone, email, name, date }) {
    let employee;
    if (phone) employee = await findEmployeeByPhone(phone);
    else if (email) employee = await findEmployeeByEmail(email);
    else if (name) {
      const matches = await findEmployeeByName(name);
      if (!matches || matches.length === 0) return 'NOT FOUND: No crew member with that name exists in the system. Tell the caller you cant find them and ask for their phone number instead. DO NOT make up any information.';
      if (matches.length === 1) employee = matches[0];
      else return `Found ${matches.length} crew members with that name: ${matches.map(m => `${m.name} (${m.phone})`).join(', ')}. Ask which one.`;
    }
    if (!employee) return 'NOT FOUND: No crew member exists in the system with the information provided. Tell the caller: "I cant find you on our crew roster. What phone number did you register with?" If they provide a phone number and it still fails, tell them: "I still cant find you in our system. You may need to contact Hammad directly at (587) 325-0751 to get set up." DO NOT make up any schedule or job information.';

    if (employee.status === 'terminated') {
      await logDispatchAction({ action: 'schedule_lookup_terminated', caller_phone: phone, employee_id: employee.id, tier: 'C', details: `Attempted schedule lookup for terminated employee ${employee.name}` });
      return `That crew member (${employee.name}) is no longer active. This needs to be escalated to the owner. Do NOT share any schedule information.`;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Find crew assignment for this employee on this date
    const { data: assignment } = await supabaseAdmin
      .from('crew_assignments')
      .select('*')
      .or(`driver_employee_id.eq.${employee.id},secondary_employee_id.eq.${employee.id}`)
      .eq('assignment_date', targetDate)
      .maybeSingle();

    // Get bookings for this assignment
    let bookings = [];
    if (assignment) {
      const { data: bks } = await supabaseAdmin
        .from('bookings')
        .select('id, booking_ref, name, phone, address, job_date, job_time, load_size, status, total_price, balance_due, notes, crew_notes, quadrant')
        .eq('crew_assignment_id', assignment.id)
        .in('status', ['confirmed', 'scheduled', 'en_route', 'arrived', 'in_progress', 'completed'])
        .order('job_time', { ascending: true });
      bookings = bks || [];
    }

    // Also get unassigned bookings for backward compat
    if (!assignment) {
      const { data: bks } = await supabaseAdmin
        .from('bookings')
        .select('id, booking_ref, name, phone, address, job_date, job_time, load_size, status, total_price, balance_due, notes, crew_notes, quadrant')
        .eq('job_date', targetDate)
        .in('status', ['confirmed', 'scheduled', 'en_route', 'arrived', 'in_progress', 'completed'])
        .order('job_time', { ascending: true });
      bookings = bks || [];
    }

    await logDispatchAction({ action: 'schedule_lookup', caller_phone: phone, employee_id: employee.id, tier: 'A', details: `Schedule lookup for ${employee.name} on ${targetDate}` });

    let result = `CREW MEMBER: ${employee.name}\n`;
    result += `Status: ${employee.status}\n`;
    result += `Date: ${targetDate}\n\n`;

    if (assignment) {
      result += `TRUCK ASSIGNMENT: Truck ${assignment.truck_number || 'TBD'}\n`;
      result += `Role: ${assignment.driver_employee_id === employee.id ? 'Driver' : 'Secondary'}\n\n`;
    } else {
      result += `No truck assignment found for today.\n\n`;
    }

    result += `TODAY'S JOBS (${bookings.length}):\n`;
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      result += `\n${i + 1}. ${b.booking_ref || b.id} — ${b.name}\n`;
      result += `   Address: ${b.address}\n`;
      result += `   Time: ${b.job_time || 'TBD'}\n`;
      result += `   Load: ${b.load_size || 'TBD'}\n`;
      result += `   Status: ${b.status}\n`;
      result += `   Price: $${b.total_price} (Balance: $${b.balance_due})\n`;
      if (b.notes) result += `   Notes: ${b.notes}\n`;
      if (b.crew_notes) result += `   Crew Notes: ${b.crew_notes}\n`;
    }

    if (bookings.length === 0) result += 'No jobs scheduled.\n';

    return result;
  },

  // 2 — Get booking details for a specific job
  async get_booking_details({ booking_ref, phone, booking_id }) {
    let query = supabaseAdmin.from('bookings').select('*');
    if (booking_id) {
      const { data } = await query.eq('id', booking_id).maybeSingle();
      if (!data) return 'NOT FOUND: No booking exists with that ID. Tell the caller honestly that the booking was not found. DO NOT make up booking details.';
      return formatBookingForDispatch(data);
    }
    if (booking_ref) {
      const { data } = await query.ilike('booking_ref', booking_ref).maybeSingle();
      if (!data) return 'NOT FOUND: No booking exists with that reference. Tell the caller honestly. DO NOT make up booking details.';
      return formatBookingForDispatch(data);
    }
    if (phone) {
      const normalized = phone.replace(/\D/g, '');
      const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
      const { data } = await query.or(patterns.map(p => `phone.eq.${p}`).join(',')).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return 'NOT FOUND: No booking found for that phone number. Tell the caller honestly. DO NOT make up booking details.';
      return formatBookingForDispatch(data);
    }
    return 'I need a booking reference, booking ID, or customer phone number to look up the job.';
  },

  // 3 — Get crew location (where is my crew partner / truck)
  async get_crew_location({ employee_id, phone }) {
    let emp;
    if (phone) emp = await findEmployeeByPhone(phone);
    else if (employee_id) {
      const { data } = await supabaseAdmin.from('employees').select('id, name, phone').eq('id', employee_id).maybeSingle();
      emp = data;
    }
    if (!emp) return 'I couldnt find that crew member. Ask for their phone number.';

    const { data: loc } = await supabaseAdmin
      .from('crew_locations')
      .select('lat, lng, heading, speed, updated_at, employee_id')
      .eq('employee_id', emp.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await logDispatchAction({ action: 'location_lookup', caller_phone: phone, employee_id: emp.id, tier: 'A' });

    if (!loc) return `No location data found for ${emp.name}. They may not have started their shift or the crew app isnt running.`;

    const age = Math.round((Date.now() - new Date(loc.updated_at).getTime()) / 60000);
    return `CREW MEMBER: ${emp.name}\nLast known location: ${loc.lat}, ${loc.lng}\nUpdated: ${age} minutes ago\nSpeed: ${loc.speed || 0} km/h\nHeading: ${loc.heading || 0}°`;
  },

  // 4 — Trigger password reset for a crew member (Tier B)
  async trigger_password_reset({ phone, email, name, caller_phone }) {
    let employee;
    if (phone) employee = await findEmployeeByPhone(phone);
    else if (email) employee = await findEmployeeByEmail(email);
    else if (name) {
      const matches = await findEmployeeByName(name);
      if (matches?.length === 1) employee = matches[0];
      else if (matches?.length > 1) return `Found ${matches.length} crew members with that name. Ask for their phone number to narrow it down.`;
    }

    if (!employee) return 'I couldnt find a crew member with that info. Ask for their phone number or email.';

    if (employee.status === 'terminated') {
      await logDispatchAction({ action: 'password_reset_terminated', caller_phone, employee_id: employee.id, tier: 'C', details: `Attempted reset for terminated employee ${employee.name}` });
      return `That crew member (${employee.name}) is no longer active. This needs to be escalated to the owner — do NOT reset their password.`;
    }

    if (!employee.email) return `I found ${employee.name} but they dont have an email on file. Escalate this to the owner — theyll need to update the crew members email first.`;

    // Generate reset token (same logic as admin crew route)
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 3600e3).toISOString();

    try {
      await supabaseAdmin
        .from('employees')
        .update({ reset_token: resetToken, reset_expires_at: resetExpires })
        .eq('id', employee.id);
    } catch (e) {
      console.error('Failed to save reset token:', e);
      return 'Something went wrong saving the reset token. Escalate this to the owner.';
    }

    const sent = await sendPasswordResetEmail({
      email: employee.email,
      first_name: employee.first_name || employee.name?.split(' ')[0] || 'there',
      token: resetToken,
    });

    if (!sent) return `I found ${employee.name} but couldnt send the reset email. Escalate this to the owner.`;

    await logDispatchAction({
      action: 'password_reset',
      caller_phone,
      employee_id: employee.id,
      tier: 'B',
      details: `Password reset triggered for ${employee.name} (${employee.email})`,
    });

    // Notify owner
    try {
      await sendSMS(OPERATOR_PHONE, `[DISPATCH] Password reset triggered for ${employee.name} (${employee.email}). Tier B action — logged for review.`, null, 'dispatch_password_reset');
    } catch (_) {}

    return `Password reset link sent to ${employee.email}. Tell them to check their email (including spam folder) for a link from crew@junkhaul.ca. The link expires in 24 hours. They can also go to junkhaul.ca/portal/reset-password to set a new password once they click the link.`;
  },

  // 5 — Resend payment link to a customer (Tier A)
  async resend_payment_link({ booking_id, caller_phone }) {
    if (!booking_id) return 'I need a booking ID to resend the payment link.';

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, name, phone, balance_due, status')
      .eq('id', booking_id)
      .maybeSingle();

    if (error || !booking) return 'Booking not found.';

    const payUrl = `${SITE}/pay/${booking_id}`;
    const smsBody = `Hi ${booking.name}, here's your payment link for your Junk Haul Calgary pickup. Balance due: $${booking.balance_due}. Pay here: ${payUrl}`;

    try {
      await sendSMS(booking.phone, smsBody, booking_id, 'dispatch_payment_link');
    } catch (e) {
      return 'Failed to send the payment link SMS. Escalate this.';
    }

    await logDispatchAction({ action: 'resend_payment_link', caller_phone, booking_id, tier: 'A', details: `Payment link resent for booking ${booking_id}` });

    return `Payment link sent to ${booking.name} at ${booking.phone}. Balance due: $${booking.balance_due}.`;
  },

  // 6 — Get customer feedback for a booking (Tier A)
  async get_customer_feedback({ booking_id, phone }) {
    let booking;
    if (booking_id) {
      const { data } = await supabaseAdmin.from('bookings').select('id, name, phone, booking_ref').eq('id', booking_id).maybeSingle();
      booking = data;
    } else if (phone) {
      const normalized = phone.replace(/\D/g, '');
      const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
      const { data } = await supabaseAdmin.from('bookings').select('id, name, phone, booking_ref').or(patterns.map(p => `phone.eq.${p}`).join(',')).order('created_at', { ascending: false }).limit(1).maybeSingle();
      booking = data;
    }
    if (!booking) return 'No booking found. I need a booking ID or customer phone number.';

    // Get customer feedback
    const { data: feedback } = await supabaseAdmin
      .from('customer_feedback')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent call history with sentiment
    const { data: calls } = await supabaseAdmin
      .from('call_history')
      .select('call_date, sentiment, summary, agent_type')
      .or(`caller_number.eq.${booking.phone}`)
      .order('call_date', { ascending: false })
      .limit(5);

    await logDispatchAction({ action: 'feedback_lookup', caller_phone: phone, booking_id: booking.id, tier: 'A' });

    let result = `CUSTOMER: ${booking.name}\n`;
    result += `Booking: ${booking.booking_ref || booking.id}\n\n`;

    if (feedback && feedback.length > 0) {
      result += `FEEDBACK (${feedback.length} entries):\n`;
      for (const f of feedback) {
        result += `\n  Rating: ${f.rating || 'N/A'}/5\n`;
        result += `  Review: ${f.review || 'No written review'}\n`;
        result += `  Date: ${f.created_at}\n`;
      }
    } else {
      result += 'No customer feedback on file.\n';
    }

    if (calls && calls.length > 0) {
      result += `\nRECENT CALLS (${calls.length}):\n`;
      for (const c of calls) {
        result += `\n  Date: ${c.call_date}\n`;
        result += `  Sentiment: ${c.sentiment || 'neutral'}\n`;
        result += `  Summary: ${c.summary || 'No summary'}\n`;
        result += `  Agent: ${c.agent_type || 'unknown'}\n`;
      }
    } else {
      result += '\nNo recent calls on file.\n';
    }

    return result;
  },

  // 7 — Log a job issue (Tier A/B depending on severity)
  async log_issue({ booking_id, employee_id, issue_type, severity, description, caller_phone }) {
    if (!description) return 'I need a description of the issue to log it.';

    const { data, error } = await supabaseAdmin
      .from('job_issues')
      .insert({
        employee_id: employee_id || null,
        booking_id: booking_id || null,
        issue_type: issue_type || 'other',
        severity: severity || 'medium',
        description,
      })
      .select()
      .single();

    if (error) return `Failed to log the issue: ${error.message}`;

    // Notify admin
    await supabaseAdmin.from('crew_notifications').insert({
      employee_id: employee_id || null,
      type: severity === 'high' ? 'warning' : 'info',
      title: `Issue flagged by Dispatch: ${issue_type}`,
      body: description.substring(0, 200),
      link: booking_id ? `/portal/job?booking_id=${booking_id}` : null,
    }).then(() => {});

    const tier = severity === 'high' ? 'C' : severity === 'medium' ? 'B' : 'A';
    await logDispatchAction({ action: 'log_issue', caller_phone, employee_id, booking_id, tier, details: `${issue_type} (${severity}): ${description}` });

    return `Issue logged. Type: ${issue_type}, Severity: ${severity}. ${severity === 'high' ? 'This has been flagged for immediate owner review.' : 'This has been logged for review.'}`;
  },

  // 8 — Log an incident report (Tier B/C depending on severity)
  async log_incident({ booking_id, employee_id, incident_type, severity, description, location, caller_phone }) {
    if (!description) return 'I need a description of the incident to log it.';

    const { data, error } = await supabaseAdmin
      .from('incident_reports')
      .insert({
        employee_id: employee_id || null,
        booking_id: booking_id || null,
        incident_type: incident_type || 'other',
        severity: severity || 'medium',
        description,
        location: location || null,
        reported_to: DISPATCH_AGENT,
      })
      .select()
      .single();

    if (error) return `Failed to log the incident: ${error.message}`;

    // Notify admin
    await supabaseAdmin.from('crew_notifications').insert({
      employee_id: employee_id || null,
      type: 'warning',
      title: `Incident filed by Dispatch: ${incident_type}`,
      body: `Severity: ${severity} — ${description.substring(0, 100)}`,
    }).then(() => {});

    const tier = severity === 'critical' || severity === 'high' ? 'C' : 'B';
    await logDispatchAction({ action: 'log_incident', caller_phone, employee_id, booking_id, tier, details: `${incident_type} (${severity}): ${description}` });

    // Auto-escalate high/critical incidents to owner immediately
    if (severity === 'critical' || severity === 'high') {
      try {
        await sendSMS(OPERATOR_PHONE, `[DISPATCH ESCALATION] ${severity.toUpperCase()} incident logged by ${caller_phone || 'crew'}: ${incident_type} — ${description.substring(0, 150)}. Booking: ${booking_id || 'N/A'}. REVIEW IMMEDIATELY.`, null, 'dispatch_incident_escalation');
      } catch (_) {}
      return `Incident logged and escalated. Severity: ${severity}. The owner has been texted and will review this immediately. ${severity === 'critical' ? 'This is a critical incident — the owner needs to be reached NOW.' : ''}`;
    }

    return `Incident logged. Type: ${incident_type}, Severity: ${severity}. This has been logged for review.`;
  },

  // 9 — Mark a job as no-show (Tier B — requires owner notification)
  async mark_no_show({ booking_id, reason, caller_phone }) {
    if (!booking_id) return 'I need a booking ID to mark a no-show.';

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, name, phone, booking_ref, status, job_date')
      .eq('id', booking_id)
      .maybeSingle();

    if (!booking) return 'Booking not found.';
    if (booking.status === 'completed') return 'That booking is already marked as completed — it cant be marked as a no-show.';
    if (booking.status === 'cancelled') return 'That booking is already cancelled.';

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'no_show', updated_at: new Date().toISOString() })
      .eq('id', booking_id);

    if (error) return `Failed to mark no-show: ${error.message}`;

    await logDispatchAction({ action: 'mark_no_show', caller_phone, booking_id, tier: 'B', details: `No-show marked for booking ${booking.booking_ref || booking_id}. Reason: ${reason || 'Customer not reachable'}` });

    // Notify owner
    try {
      await sendSMS(OPERATOR_PHONE, `[DISPATCH] No-show marked for booking ${booking.booking_ref || booking_id} (${booking.name}). Reason: ${reason || 'Customer not reachable'}. Tier B — logged for review.`, null, 'dispatch_no_show');
    } catch (_) {}

    return `Booking ${booking.booking_ref || booking_id} marked as no-show. Customer: ${booking.name}. The owner has been notified. The crew can move on to their next stop.`;
  },

  // 10 — Escalate to owner immediately (Tier C)
  async escalate_to_owner({ reason, caller_phone, employee_id, booking_id, priority }) {
    const priorityLabel = priority === 'critical' ? 'CRITICAL' : priority === 'urgent' ? 'URGENT' : 'STANDARD';
    const msg = `[DISPATCH ESCALATION — ${priorityLabel}] ${reason}. Caller: ${caller_phone || 'unknown'}. Employee: ${employee_id || 'N/A'}. Booking: ${booking_id || 'N/A'}. ${priority === 'critical' ? 'NEEDS IMMEDIATE ATTENTION.' : 'Please follow up ASAP.'}`;

    try {
      await sendSMS(OPERATOR_PHONE, msg, null, 'dispatch_escalation');
    } catch (_) {}

    try {
      await supabaseAdmin.from('escalations').insert({
        caller_phone: caller_phone || null,
        booking_ref: booking_id || null,
        reason: `[Dispatch ${priorityLabel}] ${reason}`,
        escalated_by: DISPATCH_AGENT,
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    await logDispatchAction({ action: 'escalate_to_owner', caller_phone, employee_id, booking_id, tier: 'C', details: `${priorityLabel}: ${reason}` });

    if (priority === 'critical') {
      return `This has been escalated as CRITICAL. The owner has been texted and should respond within minutes. Tell the crew member: "Ive paged Hammad directly — hes getting a text right now. If you dont hear from him within 5 minutes, call him at (587) 325-0751." Stay on the line if you can.`;
    }
    return `This has been escalated to the owner. Theyve been texted and will follow up. Tell the crew member: "Hammads been notified — hell reach out to you about this. If its urgent and you dont hear from him within 30 minutes, call him directly at (587) 325-0751."`;
  },

  // 11 — Notify operator (lighter touch than escalate)
  async notify_operator({ message, caller_phone }) {
    try {
      await sendSMS(OPERATOR_PHONE, `[DISPATCH] ${message}. From: ${caller_phone || 'unknown'}.`, null, 'dispatch_notify');
    } catch (_) {}
    await logDispatchAction({ action: 'notify_operator', caller_phone, tier: 'B', details: message });
    return 'The owner has been notified. Theyll see this as a text message.';
  },

  // 12 — Get today's dispatch overview (for the dispatch agent to know the day's status)
  async get_today_overview({ caller_phone }) {
    const today = new Date().toISOString().split('T')[0];

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, name, phone, address, job_date, job_time, load_size, status, total_price, balance_due, quadrant, crew_assignment_id, no_show_risk_score, flag_for_review, deposit_paid')
      .eq('job_date', today)
      .order('job_time', { ascending: true });

    const { data: assignments } = await supabaseAdmin
      .from('crew_assignments')
      .select('*')
      .eq('assignment_date', today);

    await logDispatchAction({ action: 'today_overview', caller_phone, tier: 'A' });

    const todayBookings = bookings || [];
    const totalRevenue = todayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const collected = todayBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price || 0), 0);
    const balanceDue = todayBookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);

    let result = `TODAY'S DISPATCH OVERVIEW — ${today}\n\n`;
    result += `Total jobs: ${todayBookings.length}\n`;
    result += `Total revenue: $${totalRevenue}\n`;
    result += `Collected: $${collected}\n`;
    result += `Balance due: $${balanceDue}\n`;
    result += `Trucks assigned: ${assignments?.length || 0}\n\n`;

    // Flagged items
    const noDeposit = todayBookings.filter(b => !b.deposit_paid);
    const flagged = todayBookings.filter(b => b.flag_for_review);
    const highRisk = todayBookings.filter(b => b.no_show_risk_score && b.no_show_risk_score > 0.5);

    if (noDeposit.length > 0) {
      result += `NO DEPOSIT PAID (${noDeposit.length}):\n`;
      noDeposit.forEach(b => result += `  - ${b.booking_ref} ${b.name} — $${b.total_price}\n`);
      result += '\n';
    }
    if (flagged.length > 0) {
      result += `FLAGGED FOR REVIEW (${flagged.length}):\n`;
      flagged.forEach(b => result += `  - ${b.booking_ref} ${b.name}\n`);
      result += '\n';
    }
    if (highRisk.length > 0) {
      result += `HIGH NO-SHOW RISK (${highRisk.length}):\n`;
      highRisk.forEach(b => result += `  - ${b.booking_ref} ${b.name} (risk: ${Math.round((b.no_show_risk_score || 0) * 100)}%)\n`);
      result += '\n';
    }

    result += `JOB LIST:\n`;
    for (let i = 0; i < todayBookings.length; i++) {
      const b = todayBookings[i];
      result += `\n${i + 1}. ${b.booking_ref || b.id} — ${b.name}\n`;
      result += `   ${b.job_time || 'TBD'} | ${b.address} | ${b.load_size} | ${b.status}\n`;
      result += `   $${b.total_price} (bal $${b.balance_due}) | ${b.quadrant || '?'}\n`;
    }

    return result;
  },

  // 13 — Answer policy questions (Tier A — no data access needed)
  async get_policy_info({ query }) {
    const q = (query || '').toLowerCase();
    const policies = {
      cancellation: 'Cancellation policy: More than 24 hours before pickup = full $50 deposit refund. Within 24 hours = deposit forfeited (weve already blocked the slot). If WE cancelled or no-showed = full refund + priority rebooking.',
      pricing: 'Pricing: Quarter load $169, Half load $269, Full load $399, Single item from $89. Add-ons: Same-day +$50, Stairs +$25/flight, Freon/appliance +$40. All prices include disposal, labour, and transport.',
      donation: 'Donation policy: Usable items (furniture, appliances in working order, clothing, toys) are taken to local charities/donation centers. We dont charge extra for this — its part of the service. We dont donate broken or soiled items.',
      landfill: 'Landfill: East Calgary Landfill (3801 68 St SE) is our primary drop. Summer hours (May-Sep): Mon-Sat 7:30am-5pm, Sun 9am-5pm. Winter hours: Mon-Sat 7:30am-5pm, closed Sundays. Spyhill Landfill (11901 56 St NW) is the backup. Transfer sites are also available for smaller loads.',
      payment: 'Payment: $50 deposit locks in the slot (paid online via Stripe). Balance is due on-site after the job — crew collects via card (payment link sent to customer phone) or cash. We dont accept e-transfer to personal accounts, crypto, or personal cheques.',
      service_area: 'Service area: Calgary city limits and immediate surrounding areas (Airdrie, Chestermere, Cochrane, Okotoks within 15km of city limits). Outside that = out of area, we save their info for expansion.',
      hours: 'Operating hours: 7 days a week, 7am-8pm. Bookings typically scheduled 8am-6pm. Same-day available if slots are open and the job is feasible.',
      safety: 'Safety: Crew can refuse to enter any property they feel is unsafe (hostile occupant, unsafe structure, hoarding beyond scope, aggressive animal). No penalty for refusing. Crew should not handle hazardous materials (paint, propane, asbestos, medical waste, chemicals). Log the incident and advise customer on proper disposal.',
    };

    for (const [key, value] of Object.entries(policies)) {
      if (q.includes(key) || q.includes(key.slice(0, -1))) return value;
    }

    // Default: return all policy topics
    return `I can answer questions about: cancellation policy, pricing, donation policy, landfill locations and hours, payment methods, service area, operating hours, and safety protocols. What specifically do you need to know?`;
  },
};

// Helper: format booking for dispatch
function formatBookingForDispatch(b) {
  let result = `BOOKING: ${b.booking_ref || b.id}\n`;
  result += `Customer: ${b.name}\n`;
  result += `Phone: ${b.phone}\n`;
  result += `Address: ${b.address}\n`;
  result += `Job Date: ${b.job_date || 'N/A'}\n`;
  result += `Job Time: ${b.job_time || 'N/A'}\n`;
  result += `Load Size: ${b.load_size || 'N/A'}\n`;
  result += `Status: ${b.status}\n`;
  result += `Total Price: $${b.total_price || 'N/A'}\n`;
  result += `Deposit Paid: $${b.deposit_paid || 0}\n`;
  result += `Balance Due: $${b.balance_due || b.total_price || 'N/A'}\n`;
  result += `Quadrant: ${b.quadrant || 'N/A'}\n`;
  if (b.same_day) result += `Same Day: Yes (+$50)\n`;
  if (b.stairs) result += `Stairs: ${b.stairs} flights (+$${(b.stairs * 25)})\n`;
  if (b.has_freon) result += `Freon: Yes (+$${b.freon_fee || 40})\n`;
  if (b.notes) result += `\nNotes: ${b.notes}\n`;
  if (b.crew_notes) result += `\nCrew Notes: ${b.crew_notes}\n`;
  if (b.flag_for_review) result += `\n*** FLAGGED FOR REVIEW ***\n`;
  if (!b.deposit_paid) result += `\n*** NO DEPOSIT PAID ***\n`;
  return result;
}

export const runDispatchTool = async (name, args) => {
  const fn = dispatchTools[name];
  if (!fn) return `Unknown tool: ${name}`;
  try {
    return await fn(args || {});
  } catch (e) {
    console.error(`Dispatch tool ${name} failed:`, e);
    return 'Sorry, something went wrong on our end. The owner has been notified and will follow up.';
  }
};
