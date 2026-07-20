import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { recordTruckInspection } from '@/lib/crewSync';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  try {
    const inspection = await recordTruckInspection({ ...body, employee_id: employee.id });
    return NextResponse.json({ inspection });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
