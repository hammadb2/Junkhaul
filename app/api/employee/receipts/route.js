import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/receipts — upload a transaction receipt
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    assignment_id, receipt_type, // uhaul, gas, dump, other
    vendor, amount_cad, receipt_photo_url, notes,
  } = body;

  if (!receipt_type || !amount_cad) {
    return NextResponse.json({ error: 'receipt_type and amount_cad are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('transaction_receipts')
    .insert({
      assignment_id: assignment_id || null,
      employee_id: emp.id,
      receipt_type,
      vendor: vendor || null,
      amount_cad,
      receipt_photo_url: receipt_photo_url || null,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, receipt: data });
}

// GET — list receipts for an assignment or employee
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get('assignment_id');
  const date = searchParams.get('date');

  let query = supabaseAdmin
    .from('transaction_receipts')
    .select('*')
    .eq('employee_id', emp.id)
    .order('created_at', { ascending: false });

  if (assignmentId) query = query.eq('assignment_id', assignmentId);
  if (date) {
    query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
  }

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ receipts: data || [] });
}
