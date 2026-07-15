import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/dispatch-actions — list dispatch audit log
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7', 10);
  const tier = searchParams.get('tier') || null;
  const employeeId = searchParams.get('employee_id') || null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from('dispatch_actions')
    .select('id, action, caller_phone, employee_id, booking_id, details, tier, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (tier) query = query.eq('tier', tier);
  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with employee names
  const employeeIds = [...new Set(data?.map(d => d.employee_id).filter(Boolean))];
  const employees = {};
  if (employeeIds.length > 0) {
    const { data: emps } = await supabaseAdmin
      .from('employees')
      .select('id, name, phone')
      .in('id', employeeIds);
    for (const e of emps || []) employees[e.id] = e;
  }

  const enriched = (data || []).map(d => ({
    ...d,
    employee_name: employees[d.employee_id]?.name || null,
    employee_phone: employees[d.employee_id]?.phone || null,
  }));

  // Summary stats
  const stats = {
    total: enriched.length,
    tierA: enriched.filter(d => d.tier === 'A').length,
    tierB: enriched.filter(d => d.tier === 'B').length,
    tierC: enriched.filter(d => d.tier === 'C').length,
    tierD: enriched.filter(d => d.tier === 'D').length,
  };

  return NextResponse.json({ actions: enriched, stats });
}
