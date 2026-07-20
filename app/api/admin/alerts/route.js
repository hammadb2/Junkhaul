import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getOpenAlerts, acknowledgeAlert, resolveAlert, createAlert } from '@/lib/alerts';
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
    const tenant = await getTenantBySlug('rehaul');
    const alerts = await getOpenAlerts({ tenantId: tenant.id });
    return NextResponse.json({ alerts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    switch (body.action) {
      case 'create':
        return NextResponse.json({ alert: await createAlert(body) });
      case 'acknowledge':
        return NextResponse.json({ alert: await acknowledgeAlert({ alertId: body.alert_id, actorId: body.actor_id }) });
      case 'resolve':
        return NextResponse.json({ alert: await resolveAlert({ alertId: body.alert_id }) });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
