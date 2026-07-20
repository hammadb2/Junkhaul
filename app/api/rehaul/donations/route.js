import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createDonationIntake } from '@/lib/donations';
import { getTenantByHost } from '@/lib/rehaul';

export const runtime = 'nodejs';

export async function POST(req) {
  const host = req.headers.get('host') || '';
  const tenant = await getTenantByHost(host);
  if (!tenant || tenant.slug !== 'rehaul') {
    return NextResponse.json({ error: 'Not a Rehaul host' }, { status: 404 });
  }

  let customerId = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(token);
    customerId = user?.id;
  }

  const body = await req.json();
  try {
    const result = await createDonationIntake({
      tenantId: tenant.id,
      customerId,
      address: body.address,
      preferredPickupDate: body.preferred_pickup_date,
      items: body.items,
      consent: body.consent,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
