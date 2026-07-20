import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { queryAudit, recordSecurityEvent } from '@/lib/audit';
import { getUserRehaulRoles } from '@/lib/rehaul';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');
  try {
    const events = await queryAudit({ entityType, entityId });
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    if (body.action === 'test_permission') {
      const { permissions } = await getUserRehaulRoles({ userId: body.user_id, tenantSlug: 'rehaul' });
      return NextResponse.json({ has_permission: permissions.includes(body.permission) });
    }
    const event = await recordSecurityEvent({
      tenantId: body.tenant_id,
      actorId: body.actor_id,
      eventType: body.event_type,
      severity: body.severity,
      description: body.description,
      payload: body.payload,
      correlationId: body.correlation_id,
    });
    return NextResponse.json({ event });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
