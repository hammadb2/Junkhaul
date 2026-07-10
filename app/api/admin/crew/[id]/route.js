import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = await adminToken();
  return token === expected;
}

function getSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith('https://')) return env.replace(/\/$/, '');
  return 'https://junkhaul.ca';
}

async function sendPasswordResetEmail({ email, first_name, token }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — password reset email skipped');
    return;
  }

  const resetUrl = `${getSiteUrl()}/portal/reset-password?token=${token}`;
  const subject = `Your Junk Haul Calgary account has been updated — set your password`;
  const body = `Hi ${first_name},

Your account details have been updated by the admin team at Junk Haul Calgary.

Please set a new password to access your account:

${resetUrl}

This link expires in 24 hours. If you have any questions, just reply to this email or call us at (587) 325-0751.

Junk Haul Calgary`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e4e4e7;">
<div style="text-align:center;margin-bottom:24px;"><span style="font-size:22px;font-weight:800;color:#f97316;">JunkHaul</span></div>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">Hi ${first_name},</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">Your account details have been updated by the admin team. Please set a new password to access your account:</p>
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
        subject,
        html,
        text: body,
      }),
    });
  } catch (e) {
    console.error('Password reset email failed:', e);
  }
}

// GET /api/admin/crew/[id] — single employee details with all onboarding data
export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, email, name, first_name, last_name, phone, status, hire_date, pay_rate,
      onboarded_at, onboarding_completed_at, created_at, updated_at,
      contract_signed, contract_signed_at, contract_data,
      td1_federal_data, td1_ab_data, acknowledgments,
      drive_folder_id, invite_id, address,
      selfie_url, license_data, verification_notes, verified_at, verified_by
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  // Documents
  const { data: documents } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', id)
    .order('doc_type');

  // Invite info
  let invite = null;
  if (employee.invite_id) {
    const { data: inv } = await supabaseAdmin
      .from('employee_invites')
      .select('*')
      .eq('id', employee.invite_id)
      .maybeSingle();
    invite = inv;
  }

  // Recent job clock sessions
  const { data: recentSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, booking_id, clock_in_at, clock_out_at, duration_minutes')
    .eq('employee_id', id)
    .order('clock_in_at', { ascending: false })
    .limit(20);

  // Crew assignments
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select('*')
    .or(`driver_employee_id.eq.${id},secondary_employee_id.eq.${id}`)
    .order('assignment_date', { ascending: false })
    .limit(20);

  return NextResponse.json({
    employee,
    documents: documents || [],
    invite,
    recent_sessions: recentSessions || [],
    assignments: assignments || [],
  });
}

// PATCH /api/admin/crew/[id] — update employee (all fields editable by admin)
export async function PATCH(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const allowed = [
    'status', 'pay_rate', 'first_name', 'last_name', 'name',
    'phone', 'email', 'hire_date', 'onboarding_completed_at',
    'address', 'onboarded_at',
  ];
  const update = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Normalize email
  if (update.email) update.email = update.email.toLowerCase().trim();

  // If name not provided but first/last are, derive it
  if (!update.name && (update.first_name || update.last_name)) {
    const { data: cur } = await supabaseAdmin.from('employees').select('first_name, last_name, name').eq('id', id).maybeSingle();
    const fn = update.first_name ?? cur?.first_name ?? '';
    const ln = update.last_name ?? cur?.last_name ?? '';
    update.name = `${fn} ${ln}`.trim() || cur?.name;
  }

  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .update(update)
    .eq('id', id)
    .select('id, email, name, first_name, last_name, phone, status, pay_rate, hire_date, updated_at, address')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If admin changed email or other key info, send a password reset link
  const shouldSendReset = body.send_reset === true || ('email' in body && body.email);
  if (shouldSendReset && employee.email) {
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 3600e3).toISOString(); // 24h
    // Try to save reset token — if column doesn't exist yet, the email still works
    // because the reset endpoint also looks up by token
    try {
      await supabaseAdmin
        .from('employees')
        .update({ reset_token: resetToken, reset_expires_at: resetExpires })
        .eq('id', id);
    } catch (e) {
      console.warn('reset_token column may not exist yet:', e.message);
    }

    await sendPasswordResetEmail({
      email: employee.email,
      first_name: employee.first_name || employee.name?.split(' ')[0] || 'there',
      token: resetToken,
    });
  }

  return NextResponse.json({ ok: true, employee, reset_sent: shouldSendReset });
}

// DELETE /api/admin/crew/[id] — terminate employee
export async function DELETE(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // End any open job clock sessions
  const now = new Date().toISOString();
  const { data: openSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, clock_in_at')
    .eq('employee_id', id)
    .is('clock_out_at', null);

  for (const s of openSessions || []) {
    const duration = Math.round((new Date(now).getTime() - new Date(s.clock_in_at).getTime()) / 60000);
    await supabaseAdmin.from('job_clock_sessions')
      .update({ clock_out_at: now, duration_minutes: duration })
      .eq('id', s.id);
  }

  // Mark as terminated (soft delete — keep records for payroll/history)
  const { error } = await supabaseAdmin
    .from('employees')
    .update({ status: 'terminated', updated_at: now })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revoke all sessions
  await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', id);

  return NextResponse.json({ ok: true });
}
