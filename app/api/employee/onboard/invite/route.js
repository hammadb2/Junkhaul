import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET — retrieve invite info by token (pre-auth, for onboarding page)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const { data: invite, error } = await supabaseAdmin
    .from('employee_invites')
    .select('id, email, first_name, last_name, phone, pay_rate, status, expires_at, created_at')
    .eq('token', token)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
  if (invite.status === 'accepted') return NextResponse.json({ error: 'This invite has already been used', invite }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired', invite }, { status: 410 });

  return NextResponse.json({ invite });
}

// POST — accept invite and create employee account
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { token, password, phone, address } = body;

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
  if (!phone || phone.replace(/[\s\-\(\)]/g, '').length < 10) {
    return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 });
  }
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: 'Your home address is required' }, { status: 400 });
  }

  // Look up invite
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('employee_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
  if (invite.status === 'accepted') return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });

  // Check if employee with this email already exists
  const { data: existing } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('email', invite.email)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });

  // Hash password
  const { hashPassword, createSession, sessionCookieHeader } = await import('@/lib/employeeAuth');
  const name = `${invite.first_name} ${invite.last_name}`.trim();

  const { data: emp, error: empErr } = await supabaseAdmin
    .from('employees')
    .insert({
      email: invite.email,
      password_hash: hashPassword(password),
      name,
      first_name: invite.first_name,
      last_name: invite.last_name,
      phone: phone || invite.phone || null,
      address: address || null,
      pay_rate: invite.pay_rate || 18,
      status: 'pending',
      hire_date: new Date().toISOString().slice(0, 10),
      invite_id: invite.id,
      onboarded_at: new Date().toISOString(),
    })
    .select('id, email, name, status')
    .single();
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  // Mark invite as accepted
  await supabaseAdmin
    .from('employee_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Seed required document rows
  const docTypes = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info', 'sin_document', 'drivers_license'];
  await supabaseAdmin.from('employee_documents')
    .insert(docTypes.map((doc_type) => ({ employee_id: emp.id, doc_type, status: 'pending' })));

  // Auto-login
  const sess = await createSession(emp.id);
  if (!sess) return NextResponse.json({ error: 'Account created but login failed' }, { status: 500 });

  const res = NextResponse.json({ employee: emp });
  res.headers.set('Set-Cookie', sessionCookieHeader(sess.token, sess.expiresAt));
  return res;
}
