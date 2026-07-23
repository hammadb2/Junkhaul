import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword, createSession, sessionCookieHeader } from '@/lib/employeeAuth';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// POST /api/employee/login
export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // No lockout/backoff previously existed -- unlimited password attempts
  // against a known email is unimpeded credential stuffing (audit I2).
  // Email-scoped is the real protection (stops brute-forcing one account);
  // IP-scoped catches one caller spraying many emails.
  try {
    assertRateLimit({ scope: 'employee_login_email', key: email.toLowerCase(), limit: 5, windowMs: 15 * 60 * 1000 });
    assertRateLimit({ scope: 'employee_login_ip', key: getClientKey(req), limit: 20, windowMs: 15 * 60 * 1000 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: err.status || 429, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, password_hash, status, onboarding_completed_at, verification_notes')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (!emp || !verifyPassword(password, emp.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  if (emp.status === 'terminated') {
    return NextResponse.json({ error: 'Account inactive. Contact your manager.' }, { status: 403 });
  }
  if (emp.status === 'deletion_requested') {
    return NextResponse.json(
      {
        error:
          'We are currently working on your request to delete your info. To regain access, please contact dispatch at (587) 325-0751.',
      },
      { status: 403 },
    );
  }
  if (emp.status === 'rejected') {
    return NextResponse.json({
      error: emp.verification_notes
        ? `Your application was not approved: ${emp.verification_notes}. Call (587) 325-0751 if you have questions.`
        : 'Your application was not approved. Call (587) 325-0751 if you have questions.',
    }, { status: 403 });
  }

  const sess = await createSession(emp.id);
  if (!sess) return NextResponse.json({ error: 'Login failed' }, { status: 500 });

  const res = NextResponse.json({
    employee: {
      id: emp.id,
      email: emp.email,
      name: emp.name,
      status: emp.status,
      onboarding_complete: !!emp.onboarding_completed_at,
      pending_verification: emp.status === 'pending_verification',
    },
  });
  res.headers.set('Set-Cookie', sessionCookieHeader(sess.token, sess.expiresAt));
  return res;
}
