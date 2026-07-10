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

async function sendInviteEmail({ email, first_name, last_name, token }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — invite email skipped');
    return;
  }

  const inviteUrl = `${getSiteUrl()}/portal/onboard?token=${token}`;
  const subject = `Reminder: Complete your Junk Haul Calgary onboarding`;
  const body = `Hi ${first_name},

This is a reminder to complete your onboarding for Junk Haul Calgary.

Your previous invite link may have expired. Here is a fresh one:

${inviteUrl}

This link expires in 7 days. If you have any questions, just reply to this email or call us at (587) 325-0751.

Welcome aboard!
Junk Haul Calgary`;

  const bodyHTML = body
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (line.startsWith(inviteUrl)) {
        return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;"><a href="${inviteUrl}" style="color:#f97316;font-weight:600;">Complete your onboarding &rarr;</a></p>`;
      }
      return `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e4e4e7;">
<div style="text-align:center;margin-bottom:24px;"><span style="font-size:22px;font-weight:800;color:#f97316;">JunkHaul</span></div>
${bodyHTML}
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;">
<a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background:#f97316;border-radius:10px;">Complete Onboarding</a>
</div>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5;">Junk Haul Calgary · (587) 325-0751</p>
</div>
</body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Junk Haul Calgary <crew@junkhaul.ca>',
      to: email,
      subject,
      html,
    }),
  });
}

// POST /api/admin/crew/[id]/resend-invite
// Resends onboarding invite. If the employee started but didn't finish onboarding,
// deletes the incomplete employee record so they can start fresh with the new invite.
export async function POST(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // Get employee
  const { data: employee, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('id, email, first_name, last_name, phone, pay_rate, status, invite_id, onboarding_completed_at')
    .eq('id', id)
    .maybeSingle();

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  if (employee.onboarding_completed_at) {
    return NextResponse.json({ error: 'This employee has already completed onboarding' }, { status: 400 });
  }

  // Delete the incomplete employee record so they can sign up fresh with the new invite.
  // This clears the "account already exists" error when they try to accept the new invite.
  // We keep the invite record but reset it to pending.
  await supabaseAdmin.from('employee_documents').delete().eq('employee_id', id);
  await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', id);
  await supabaseAdmin.from('job_clock_sessions').delete().eq('employee_id', id);
  await supabaseAdmin.from('employees').delete().eq('id', id);

  // Also check for any OTHER employee records with the same email (partial signups via /api/employee/signup)
  const { data: dupes } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('email', employee.email);
  for (const d of dupes || []) {
    await supabaseAdmin.from('employee_documents').delete().eq('employee_id', d.id);
    await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', d.id);
    await supabaseAdmin.from('job_clock_sessions').delete().eq('employee_id', d.id);
    await supabaseAdmin.from('employees').delete().eq('id', d.id);
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();

  let invite;
  if (employee.invite_id) {
    // Reset existing invite with fresh token
    const { data, error } = await supabaseAdmin
      .from('employee_invites')
      .update({ token, expires_at: expiresAt, status: 'pending', accepted_at: null })
      .eq('id', employee.invite_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invite = data;
  } else {
    // No existing invite — create a new one
    const { data, error } = await supabaseAdmin
      .from('employee_invites')
      .insert({
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        phone: employee.phone,
        token,
        pay_rate: employee.pay_rate || 18,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invite = data;
  }

  // Send the email
  await sendInviteEmail({
    email: employee.email,
    first_name: employee.first_name,
    last_name: employee.last_name,
    token: invite.token,
  });

  return NextResponse.json({ ok: true, invite });
}
