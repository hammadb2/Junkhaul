import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getLaunchGates, signLaunchGate } from '@/lib/launchGates';
import { getTenantBySlug } from '@/lib/rehaul';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tenant = await getTenantBySlug(req.headers.get('x-tenant') || 'junkhaul');
    const gates = await getLaunchGates({ tenantId: tenant.id });
    return NextResponse.json({ gates });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    const tenant = await getTenantBySlug(req.headers.get('x-tenant') || 'junkhaul');
    const gate = await signLaunchGate({
      tenantId: tenant.id,
      gate: body.gate,
      actorId: body.actor_id,
      evidence: body.evidence,
    });
    return NextResponse.json({ gate });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
