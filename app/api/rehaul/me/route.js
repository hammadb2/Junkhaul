import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTenantByHost, getUserRehaulRoles } from '@/lib/rehaul';

export const runtime = 'nodejs';

export async function GET(req) {
  const host = req.headers.get('host') || '';
  const tenant = await getTenantByHost(host);
  const authHeader = req.headers.get('authorization');

  let user = null;
  let roles = [];
  let permissions = [];

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user: u } } = await supabase.auth.getUser(token);
    if (u) {
      user = { id: u.id, email: u.email };
      const result = await getUserRehaulRoles({ userId: u.id, tenantSlug: tenant?.slug || 'rehaul' });
      roles = result.roles;
      permissions = result.permissions;
    }
  }

  return NextResponse.json({ tenant, user, roles, permissions });
}
