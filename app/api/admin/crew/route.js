import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { auditSensitiveAttempt, hasPermission, redactEmployee, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// ------------------------------------------------------------
// Send onboarding invite email via Resend.
// ------------------------------------------------------------
function getSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  // Only use env var if it's a real https production URL — never localhost
  if (env && env.startsWith('https://')) return env.replace(/\/$/, '');
  return 'https://junkhaul.ca';
}

async function sendInviteEmail({ email, first_name, last_name, token }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — invite email skipped');
    return;
  }

  const inviteUrl = `${getSiteUrl()}/portal/onboard?token=${token}`;
  const subject = `You're invited to join Junk Haul Calgary`;
  const body = `Hi ${first_name},

You've been invited to join the Junk Haul Calgary crew as a junk removal crew member.

To complete your onboarding, please set up your account and fill in your details here:

${inviteUrl}

This invite link expires in 7 days. If you have any questions, just reply to this email or call us at (587) 325-0751.

Welcome aboard!
Junk Haul Calgary`;

  const bodyHTML = body
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (line.startsWith(inviteUrl)) {
        return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;"><a href="${inviteUrl}" style="color:#f97316;font-weight:600;">Complete your onboarding &rarr;</a></p>`;
      }
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:#ffffff;padding:28px 32px 20px;text-align:center;border-bottom:3px solid #f97316;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="72" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;">${subject}</p>
</td></tr>
<tr><td style="padding:0 32px 8px;">
${bodyHTML}
</td></tr>
<tr><td style="padding:8px 32px 24px;">
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#f97316;border-radius:10px;">
<a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Complete Onboarding</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 32px;">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:100%;border-top:1px solid #eeeeee;padding-top:20px;">
<tr><td style="padding-bottom:14px;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="56" style="display:block;" />
</td></tr>
<tr><td style="border-top:3px solid #f97316;padding-top:14px;">
<p style="margin:0 0 2px;font-size:17px;font-weight:bold;color:#1a1a1a;">Junk Haul Calgary</p>
<p style="margin:0 0 12px;font-size:13px;color:#888888;">Crew Team &middot; Calgary, AB</p>
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:14px;"><a href="tel:+15873250751" style="font-size:13px;color:#f97316;text-decoration:none;font-weight:600;">(587) 325-0751</a></td>
<td style="color:#ddd;padding-right:14px;font-size:13px;">|</td>
<td><a href="https://junkhaul.ca" style="font-size:13px;color:#f97316;text-decoration:none;font-weight:600;">junkhaul.ca</a></td>
</tr></table>
<p style="margin:10px 0 0;font-size:11px;color:#aaaaaa;">&#10003; Fully Licensed &amp; Insured &nbsp;|&nbsp; &#127464;&#127462; Canadian Owned &amp; Operated &nbsp;|&nbsp; Calgary, AB</p>
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Junk Haul Calgary <crew@junkhaul.ca>',
        reply_to: 'crew@junkhaul.ca',
        to: email,
        subject,
        html,
        text: body,
      }),
    });
  } catch (e) {
    console.error('Invite email failed:', e);
  }
}

// GET /api/admin/crew — list all employees with onboarding + clock + hours status
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'employees.read',
    action: 'crew.list',
    metadata: { route: '/api/admin/crew' },
  });
  if (!auth.ok) return auth.response;
  const canReadCompensation = hasPermission(auth.context, 'employees.read_compensation', { ownerOnly: true });
  const canReadSensitive = hasPermission(auth.context, 'employee_documents.read_sensitive', { ownerOnly: true });

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select(`
      id, email, name, first_name, last_name, phone, status, hire_date, pay_rate,
      onboarded_at, onboarding_completed_at, created_at,
      contract_signed, contract_signed_at, acknowledgments,
      td1_federal_data, td1_ab_data, invite_id
    `)
    .order('created_at', { ascending: false });

  // Open job clock sessions (clocked in right now)
  const { data: openSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, employee_id, clock_in_at, booking_id, assignment_id')
    .is('clock_out_at', null);
  const openByEmployee = new Map();
  for (const s of openSessions || []) {
    openByEmployee.set(s.employee_id, s);
  }

  // Period hours: current calendar month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: periodSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('employee_id, duration_minutes')
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', monthStart.toISOString());

  const periodByEmployee = new Map();
  for (const s of periodSessions || []) {
    const cur = periodByEmployee.get(s.employee_id) || { total_minutes: 0 };
    cur.total_minutes += Number(s.duration_minutes || 0);
    periodByEmployee.set(s.employee_id, cur);
  }

  // Pending invites
  const { data: invites } = await supabaseAdmin
    .from('employee_invites')
    .select('id, email, first_name, last_name, phone, pay_rate, status, created_at, expires_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const now = Date.now();
  const list = (employees || []).map((e) => {
    const open = openByEmployee.get(e.id);
    const period = periodByEmployee.get(e.id) || { total_minutes: 0 };
    const totalHours = Math.round((period.total_minutes / 60) * 100) / 100;
    const base = redactEmployee(e, { includeCompensation: canReadCompensation, includeSensitive: canReadSensitive });
    return {
      ...base,
      clocked_in: !!open,
      clock_in_at: open?.clock_in_at || null,
      clock_in_duration_min: open ? Math.round((now - new Date(open.clock_in_at).getTime()) / 60000) : null,
      current_booking_id: open?.booking_id || null,
      period: {
        total_hours: totalHours,
        total_minutes: period.total_minutes,
      },
      onboarding: {
        contract_signed: !!e.contract_signed,
        td1_federal: !!e.td1_federal_data,
        td1_ab: !!e.td1_ab_data,
        acknowledgments: e.acknowledgments && Object.keys(e.acknowledgments).length > 0,
        completed: !!e.onboarding_completed_at,
      },
    };
  });

  return NextResponse.json({
    employees: list,
    pending_invites: invites || [],
    summary: {
      total: list.length,
      onboarded: list.filter((e) => e.status === 'onboarded' || e.status === 'active').length,
      pending: list.filter((e) => e.status === 'pending').length,
      pending_verification: list.filter((e) => e.status === 'pending_verification').length,
      clocked_in_now: list.filter((e) => e.clocked_in).length,
      pending_invites: (invites || []).length,
    },
  });
}

// POST /api/admin/crew — invite a new crew member
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { first_name, last_name, phone, email, pay_rate } = body;
  if (pay_rate && !body.reason) {
    return NextResponse.json({ error: 'reason is required when setting an invite pay rate' }, { status: 422 });
  }
  const permission = pay_rate ? 'employees.change_pay_rate' : 'employees.create';
  const auth = await requireStaffPermission(req, {
    permission,
    ownerOnly: !!pay_rate,
    entityType: 'employee_invite',
    action: 'employees.invite',
    reason: body.reason || null,
    metadata: { email_present: !!email, pay_rate_present: !!pay_rate },
  });
  if (!auth.ok) return auth.response;

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'first_name, last_name, and email are required' }, { status: 422 });
  }

  const emailLower = email.toLowerCase().trim();

  // Check if employee already exists
  const { data: existing } = await supabaseAdmin
    .from('employees').select('id, email, onboarding_completed_at').eq('email', emailLower).maybeSingle();
  if (existing) {
    // If onboarding not complete, delete the incomplete record so a fresh invite can be sent
    if (!existing.onboarding_completed_at) {
      await supabaseAdmin.from('employee_documents').delete().eq('employee_id', existing.id);
      await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', existing.id);
      await supabaseAdmin.from('job_clock_sessions').delete().eq('employee_id', existing.id);
      await supabaseAdmin.from('employees').delete().eq('id', existing.id);
    } else {
      return NextResponse.json({ error: 'An employee with that email already exists' }, { status: 409 });
    }
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabaseAdmin
    .from('employee_invites')
    .select('id, token, status')
    .eq('email', emailLower)
    .eq('status', 'pending')
    .maybeSingle();

  // Generate token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();

  let invite;
  if (existingInvite) {
    // Refresh the token and expiry
    const { data, error } = await supabaseAdmin
      .from('employee_invites')
      .update({ token, expires_at: expiresAt, pay_rate: pay_rate || 18, phone: phone || null, first_name, last_name })
      .eq('id', existingInvite.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invite = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('employee_invites')
      .insert({
        email: emailLower,
        first_name,
        last_name,
        phone: phone || null,
        token,
        pay_rate: pay_rate || 18,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invite = data;
  }

  // Send invite email
  await sendInviteEmail({ email: emailLower, first_name, last_name, token: invite.token });

  await auditSensitiveAttempt({
    context: auth.context,
    allowed: true,
    permission,
    entityType: 'employee_invite',
    entityId: invite.id,
    action: 'employees.invite',
    reason: body.reason || null,
    after: { id: invite.id, email: emailLower, pay_rate: pay_rate || 18, status: invite.status },
  });

  return NextResponse.json({ ok: true, invite }, { status: 201 });
}
