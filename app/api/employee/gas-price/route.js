import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/gas-price — get current gas price (from cache or fetch fresh)
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check cache (less than 7 days old)
  const { data: cached } = await supabaseAdmin
    .from('gas_price_cache')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
  if (cached && new Date(cached.fetched_at) > sevenDaysAgo) {
    return NextResponse.json({
      price_per_litre: Number(cached.price_per_litre),
      currency: cached.currency,
      source: cached.source,
      fetched_at: cached.fetched_at,
      from_cache: true,
    });
  }

  // Fetch fresh from OilPriceAPI
  const apiKey = process.env.OILPRICEAPI_KEY;
  if (!apiKey) {
    // Return a reasonable default for Alberta if no API key
    return NextResponse.json({
      price_per_litre: 1.55,
      currency: 'CAD',
      source: 'default',
      fetched_at: new Date().toISOString(),
      from_cache: false,
      warning: 'OILPRICEAPI_KEY not set — using default Alberta price',
    });
  }

  try {
    const res = await fetch('https://api.oilpriceapi.com/v1/prices', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    // Find Alberta gasoline price
    const abPrice = data?.data?.find(
      (p) => p?.country === 'Canada' && p?.province === 'AB' && p?.type === 'gasoline'
    ) || data?.data?.find((p) => p?.type === 'gasoline');

    const price = abPrice?.price || abPrice?.value || 1.55;

    // Cache it
    await supabaseAdmin.from('gas_price_cache').insert({
      province: 'AB',
      price_per_litre: price,
      currency: 'CAD',
      source: 'OilPriceAPI',
    });

    return NextResponse.json({
      price_per_litre: Number(price),
      currency: 'CAD',
      source: 'OilPriceAPI',
      fetched_at: new Date().toISOString(),
      from_cache: false,
    });
  } catch (e) {
    console.error('Gas price fetch failed:', e);
    return NextResponse.json({
      price_per_litre: cached?.price_per_litre || 1.55,
      currency: 'CAD',
      source: cached?.source || 'default',
      fetched_at: cached?.fetched_at || new Date().toISOString(),
      from_cache: !!cached,
      warning: 'Failed to fetch fresh price',
    });
  }
}
