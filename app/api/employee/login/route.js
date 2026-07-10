import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword, createSession, sessionCookieHeader } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/login
export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, password_hash, status, onboarding_completed_at')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (!emp || !verifyPassword(password, emp.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  if (emp.status === 'terminated') {
    return NextResponse.json({ error: 'Account inactive. Contact your manager.' }, { status: 403 });
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
    },
  });
  res.headers.set('Set-Cookie', sessionCookieHeader(sess.token, sess.expiresAt));
  return res;
}
