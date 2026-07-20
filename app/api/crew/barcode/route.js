import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { recordBarcodeScan } from '@/lib/crewSync';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  try {
    const scan = await recordBarcodeScan({ ...body, employee_id: employee.id });
    return NextResponse.json({ scan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
