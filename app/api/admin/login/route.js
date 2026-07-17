import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword, createSession, sessionCookieHeader, clearCookieHeader } from '@/lib/employeeAuth';
import { getStaffRoles } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(req) {
  const { email, password } = await req.json();
  if (email) {
    if (!password) return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, email, name, password_hash, status')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (!employee || !verifyPassword(password, employee.password_hash)) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }
    if (employee.status === 'terminated' || employee.status === 'rejected' || employee.status === 'deletion_requested') {
      return NextResponse.json({ error: 'Account inactive.' }, { status: 403 });
    }
    const roles = await getStaffRoles(employee.id);
    if (!roles.some((role) => ['owner', 'admin', 'manager'].includes(role))) {
      return NextResponse.json({ error: 'Admin access is not enabled for this staff account.' }, { status: 403 });
    }
    const session = await createSession(employee.id);
    if (!session) return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
    const token = await adminToken();
    const res = NextResponse.json({ ok: true, employee: { id: employee.id, email: employee.email, name: employee.name, roles } });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    res.headers.append('Set-Cookie', sessionCookieHeader(session.token, session.expiresAt));
    return res;
  }
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
  }
  const token = await adminToken();
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', clearCookieHeader());
  return res;
}
