import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabaseAdmin
    .from('call_history')
    .select('*')
    .order('call_date', { ascending: false })
    .limit(limit);

  if (phone) {
    // Normalize and search by multiple phone formats
    const normalizedPhone = phone.replace(/^\+1/, '').replace(/\D/g, '');
    const phonePatterns = [
      phone,
      `+1${normalizedPhone}`,
      `1${normalizedPhone}`,
      normalizedPhone,
    ].filter(Boolean);
    query = query.or(phonePatterns.map(p => `caller_number.eq.${p}`).join(','));
  }

  const { data: calls, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ calls: calls || [] });
}
