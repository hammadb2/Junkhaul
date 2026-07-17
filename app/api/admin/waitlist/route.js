import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'waitlist.manage', action: 'waitlist.list' });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ waitlist: data || [] });
}

export async function POST(req) {
  const { id, phone, name } = await req.json();
  const auth = await requireStaffPermission(req, { permission: 'waitlist.manage', entityType: 'waitlist', entityId: id || null, action: 'waitlist.notify' });
  if (!auth.ok) return auth.response;

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
