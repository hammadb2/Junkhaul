import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/dispatch-actions — list dispatch audit log
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'audit.read', action: 'dispatch_actions.read' });
  if (!auth.ok) return auth.response;

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
