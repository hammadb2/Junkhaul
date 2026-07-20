import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import {
  getDonationPipeline,
  transitionIntakeStatus,
  createInspection,
  createQuarantine,
  releaseQuarantine,
} from '@/lib/donations';
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  try {
    const tenant = await getTenantBySlug('rehaul');
    const pipeline = await getDonationPipeline({ tenantId: tenant.id, status });
    return NextResponse.json({ pipeline });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    switch (body.action) {
      case 'transition':
        return NextResponse.json({
          intake: await transitionIntakeStatus({
            intakeId: body.intake_id,
            toStatus: body.to_status,
            actorId: body.actor_id,
            reason: body.reason,
          }),
        });
      case 'inspect':
        return NextResponse.json({
          inspection: await createInspection({
            itemId: body.item_id,
            inspectorId: body.inspector_id,
            checklist: body.checklist,
            passed: body.passed,
            notes: body.notes,
          }),
        });
      case 'quarantine':
        return NextResponse.json({
          quarantine: await createQuarantine({
            itemId: body.item_id,
            location: body.location,
            reason: body.reason,
          }),
        });
      case 'release_quarantine':
        return NextResponse.json({
          quarantine: await releaseQuarantine({
            quarantineId: body.quarantine_id,
            releasedBy: body.released_by,
            reason: body.reason,
          }),
        });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
