import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkCronSecret } from '@/lib/cronAuth';
import { sendPushToEmployee } from '@/lib/pushNotifications';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// ============================================================
// ONBOARDING REMINDER CRON
// Runs daily. Finds employees who have an account but haven't
// completed onboarding. Sends push notifications + emails to
// remind them to finish.
//
// Vercel Cron: daily at 9:00 AM Calgary time
// ============================================================

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find employees who haven't completed onboarding
    // Status is 'invited' or 'pending' or 'onboarded' (partially)
    // but onboarding_completed_at is null
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, email, name, first_name, last_name, phone, status, onboarding_completed_at, created_at')
      .is('onboarding_completed_at', null)
      .in('status', ['invited', 'pending', 'onboarded'])
      .order('created_at', { ascending: false });

    if (!employees || employees.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No pending onboarding employees' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';
    let pushSent = 0;
    let emailSent = 0;

    for (const emp of employees) {
      // Check if we already sent a reminder today (avoid spamming)
      const { data: recentEvent } = await supabaseAdmin
        .from('system_events')
        .select('created_at')
        .eq('event_type', 'onboarding_reminder')
        .contains('payload', { employee_id: emp.id })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .limit(1);

      if (recentEvent && recentEvent.length > 0) {
        // Already reminded in the last 24 hours — skip
        continue;
      }

      // Send push notification
      try {
        const result = await sendPushToEmployee(emp.id, {
          title: 'Complete your onboarding',
          body: `Hi ${emp.first_name || emp.name || 'there'}! Finish your onboarding to start working. Tap here to continue.`,
          url: '/portal/onboard',
        });
        if (result && result.sent > 0) pushSent++;
      } catch (e) {
        // Push might fail if no subscription — that's fine
      }

      // Send email
      if (resendKey && emp.email) {
        try {
          const firstName = emp.first_name || emp.name?.split(' ')[0] || 'there';
          const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:#ffffff;padding:28px 32px 20px;text-align:center;border-bottom:3px solid #f97316;">
<img src="https://junkhaul.ca/crew-logo.png" alt="Junk Haul Crew" height="64" style="display:block;margin:0 auto;border-radius:12px;" />
</td></tr>
<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;">Complete your onboarding</p>
</td></tr>
<tr><td style="padding:0 32px 8px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">Hi ${firstName},</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">You're almost part of the crew! Complete your onboarding to start receiving job assignments.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">It takes about 10 minutes — you'll need:</p>
<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.8;color:#333333;">
<li>Your SIN and driver's license</li>
<li>A selfie</li>
<li>Banking info for direct deposit</li>
</ul>
</td></tr>
<tr><td style="padding:8px 32px 24px;">
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#f97316;border-radius:10px;">
<a href="${siteUrl}/portal" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Complete Onboarding</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 32px;">
<p style="margin:0;font-size:13px;color:#888888;">If you have any questions, call us at (587) 325-0751 or reply to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Junk Haul Calgary <crew@junkhaul.ca>',
              to: emp.email,
              subject: 'Complete your onboarding — Junk Haul Crew',
              html,
            }),
          });
          emailSent++;
        } catch (e) {
          // Email might fail — continue
        }
      }

      // Log the reminder
      await logEvent({
        event_type: 'onboarding_reminder',
        payload: { employee_id: emp.id, employee_email: emp.email, method: 'push+email' },
      });
    }

    return NextResponse.json({
      ok: true,
      pending_count: employees.length,
      push_sent: pushSent,
      email_sent: emailSent,
    });
  } catch (err) {
    console.error('onboarding-reminder error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
