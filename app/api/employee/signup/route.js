import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, encryptField, createSession, sessionCookieHeader } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/signup — new crew member onboarding (step 1: identity)
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, email, phone, password, sin, address } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // De-dupe by email
  const { data: existing } = await supabaseAdmin
    .from('employees').select('id').eq('email', email.toLowerCase()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const { data: emp, error } = await supabaseAdmin
    .from('employees')
    .insert({
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      name,
      phone: phone || null,
      sin_enc: sin ? encryptField(sin) : null,
      address: address || null,
      status: 'pending',
    })
    .select('id, email, name, status')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Seed the required document rows
  const docTypes = [
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
  ];
  await supabaseAdmin.from('employee_documents')
    .insert(docTypes.map((doc_type) => ({ employee_id: emp.id, doc_type, status: 'pending' })));

  // Auto-login
  const sess = await createSession(emp.id);
  if (!sess) return NextResponse.json({ error: 'Account created but login failed' }, { status: 500 });

  const res = NextResponse.json({ employee: emp });
  res.headers.set('Set-Cookie', sessionCookieHeader(sess.token, sess.expiresAt));
  return res;
}
