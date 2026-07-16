import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/seed-donation-drops
//
// Runs weekly (Monday 6:00 AM). Creates recurring donation-drop
// bookings for partner donation centers. These are free community
// service jobs where the crew picks up donated items from donation
// centers and delivers them to designated storage/drop-off locations.
//
// Scheduled for the next Monday at 09:00.
// ============================================================

const DONATION_CENTERS = [
  {
    name: 'Goodwill Calgary',
    phone: '403-230-1666',
    address: '101, 1140 Edmonton Trail NE, Calgary, AB T2E 5K1',
    lat: 51.0618,
    lng: -114.0489,
    items: [
      { name: 'Donated clothing (sorted)', quantity: 8 },
      { name: 'Donated furniture (small)', quantity: 3 },
      { name: 'Donated household items', quantity: 5 },
    ],
  },
  {
    name: 'Salvation Army Calgary',
    phone: '403-265-3254',
    address: '815 1st Ave NE, Calgary, AB T2E 0B5',
    lat: 51.0508,
    lng: -114.0598,
    items: [
      { name: 'Donated clothing (sorted)', quantity: 6 },
      { name: 'Donated books and media', quantity: 10 },
      { name: 'Donated small appliances', quantity: 4 },
    ],
  },
  {
    name: 'Value Village Calgary',
    phone: '403-289-9500',
    address: '1825 16 Ave NW, Calgary, AB T2M 0L7',
    lat: 51.0863,
    lng: -114.1257,
    items: [
      { name: 'Donated clothing (sorted)', quantity: 10 },
      { name: 'Donated furniture (medium)', quantity: 2 },
      { name: 'Donated sporting goods', quantity: 4 },
    ],
  },
];

const STORAGE_FACILITY = {
  name: 'Junkhaul Storage Facility',
  address: '2520 23 Ave NE, Calgary, AB T2E 8S8',
  lat: 51.0404,
  lng: -113.9983,
};

export async function GET(req) {
  const ok = checkCronSecret(req);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Calculate next Monday at 09:00
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntilMonday = ((1 - now.getDay()) + 7) % 7;
  nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 && now.getHours() >= 6 ? 7 : daysUntilMonday));
  nextMonday.setHours(9, 0, 0, 0);
  const jobDate = nextMonday.toISOString().split('T')[0];
  const timeSlot = '09:00';

  const created = [];

  for (const center of DONATION_CENTERS) {
    // Check if a donation-drop booking already exists for this center + date
    const { data: existing } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('job_date', jobDate)
      .ilike('name', `%${center.name}%`)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existing) {
      created.push({ center: center.name, status: 'already_exists' });
      continue;
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        name: `${center.name} — Donation Drop`,
        phone: center.phone,
        address: center.address,
        address_data: {
          lat: center.lat,
          lng: center.lng,
          place_name: center.address,
          full_address: center.address,
        },
        job_date: jobDate,
        time_slot: timeSlot,
        window_start: '09:00',
        window_end: '10:00',
        window_label: '9:00 AM — 10:00 AM',
        total_price: 0,
        deposit_amount: 0,
        balance_due: 0,
        status: 'confirmed',
        load_size: 'half',
        notes: `Weekly donation drop from ${center.name}. Deliver to ${STORAGE_FACILITY.address}. Community service — no charge.`,
        itemized_items: center.items.map((item) => ({
          name: item.name,
          description: `Donated item from ${center.name}`,
          quantity: item.quantity,
          price: 0,
        })),
        quadrant: 'NE',
        payment_method: 'none',
        payment_status: 'no_charge',
        is_donation_drop: true,
        destination_address: STORAGE_FACILITY.address,
        destination_lat: STORAGE_FACILITY.lat,
        destination_lng: STORAGE_FACILITY.lng,
      })
      .select()
      .single();

    if (error) {
      created.push({ center: center.name, status: 'error', error: error.message });
    } else {
      created.push({ center: center.name, status: 'created', booking_id: data.id });
    }
  }

  return NextResponse.json({
    success: true,
    job_date: jobDate,
    created,
  });
}
