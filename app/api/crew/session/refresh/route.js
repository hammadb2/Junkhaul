import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { issueSessionToken } from '@/lib/crewSync';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  try {
    const { token, record } = await issueSessionToken({
      employeeId: employee.id,
      deviceId: body.device_id,
      scope: body.scope || [],
      expiresInHours: body.expires_in_hours || 24,
    });
    return NextResponse.json({ token, expires_at: record.expires_at, scope: record.scope });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
