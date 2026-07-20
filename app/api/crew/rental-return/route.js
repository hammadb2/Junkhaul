import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { recordRentalReturn } from '@/lib/crewSync';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  try {
    const record = await recordRentalReturn({ ...body, employee_id: employee.id });
    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
