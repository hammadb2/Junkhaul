import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { revokeSessionToken } from '@/lib/crewSync';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  try {
    const record = await revokeSessionToken(body.token);
    return NextResponse.json({ revoked: true, record });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
