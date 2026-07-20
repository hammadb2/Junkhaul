import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { listRehaulRoles, assignRehaulRole, getUserRehaulRoles } from '@/lib/rehaul';

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
  const userId = searchParams.get('user_id');
  try {
    if (userId) {
      const result = await getUserRehaulRoles({ userId, tenantSlug: 'rehaul' });
      return NextResponse.json(result);
    }
    const roles = await listRehaulRoles('rehaul');
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  try {
    const record = await assignRehaulRole({ userId: body.user_id, tenantSlug: 'rehaul', roleName: body.role_name });
    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
