import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET — verify reset token is valid
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, email, first_name, reset_expires_at')
    .eq('reset_token', token)
    .maybeSingle();

  if (!emp) return NextResponse.json({ error: 'Invalid reset token' }, { status: 404 });
  if (!emp.reset_expires_at || new Date(emp.reset_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This reset link has expired' }, { status: 410 });
  }

  return NextResponse.json({ ok: true, email: emp.email, first_name: emp.first_name });
}

// POST — set new password with reset token
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one special character' }, { status: 400 });
  }

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, email, reset_expires_at')
    .eq('reset_token', token)
    .maybeSingle();

  if (!emp) return NextResponse.json({ error: 'Invalid reset token' }, { status: 404 });
  if (!emp.reset_expires_at || new Date(emp.reset_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This reset link has expired' }, { status: 410 });
  }

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      password_hash: hashPassword(password),
      reset_token: null,
      reset_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', emp.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Destroy all existing sessions (force re-login)
  await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', emp.id);

  return NextResponse.json({ ok: true, email: emp.email });
}
