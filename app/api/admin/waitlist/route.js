import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === adminToken;
}

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ waitlist: data || [] });
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, phone, name } = await req.json();

  const msg = `Hi ${name}! A slot just opened up at Junk Haul Calgary. Book now before it's gone: https://junkhaul.ca/book`;

  try {
    await sendSMS(phone, msg, null, 'waitlist_notify');
    await supabaseAdmin
      .from('waitlist')
      .update({ notified: true, notified_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
