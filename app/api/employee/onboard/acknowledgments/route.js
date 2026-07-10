import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/onboard/acknowledgments — save acknowledgment checkboxes
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { tickets, phone, data, company_card } = body;

  const acks = {
    tickets: !!tickets,
    phone: !!phone,
    data: !!data,
    company_card: !!company_card,
    acknowledged_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('employees')
    .update({ acknowledgments: acks, updated_at: new Date().toISOString() })
    .eq('id', emp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, acknowledgments: acks });
}

// GET — retrieve current acknowledgments
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('acknowledgments')
    .eq('id', emp.id)
    .maybeSingle();

  return NextResponse.json({
    acknowledgments: employee?.acknowledgments || {},
  });
}
