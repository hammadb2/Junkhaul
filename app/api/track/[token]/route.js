import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// ============================================================
// GET /api/track/[token] — public tracking data endpoint.
// The token IS the auth (unguessable random hex). Also accepts
// a booking UUID for backwards compatibility.
// Returns: booking, crew (first_name + selfie_url), crew_location,
// storage_drops w/ photos, signature, feedback_submitted, tip_submitted
// ============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req, { params }) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // Look up by tracking_token, or by id if it's a UUID (backwards compat)
  let query = supabaseAdmin.from('bookings').select('*');
  if (UUID_RE.test(token)) {
    query = query.eq('id', token);
  } else {
    query = query.eq('tracking_token', token);
  }
  const { data: booking, error } = await query.maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // ── Crew: find crew_assignments for the booking's job_date ──
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_employee_id, secondary_employee_id')
    .eq('assignment_date', booking.job_date);

  const crewIds = new Set();
  const assignmentIds = new Set();
  for (const a of assignments || []) {
    if (a.driver_employee_id) crewIds.add(a.driver_employee_id);
    if (a.secondary_employee_id) crewIds.add(a.secondary_employee_id);
    if (a.id) assignmentIds.add(a.id);
  }

  let crew = [];
  let crewLocation = null;
  if (crewIds.size > 0) {
    const ids = Array.from(crewIds);
    const [empRes, locRes] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('id, first_name, selfie_url')
        .in('id', ids),
      supabaseAdmin
        .from('crew_locations')
        .select('employee_id, lat, lng, heading, speed, updated_at')
        .in('employee_id', ids),
    ]);

    crew = (empRes.data || []).map((e) => ({
      first_name: e.first_name,
      selfie_url: e.selfie_url,
    }));

    // Use the most recently updated location as the crew's current position
    const locs = (locRes.data || []).slice().sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    if (locs.length > 0) {
      const latest = locs[0];
      const ageMs = Date.now() - new Date(latest.updated_at).getTime();
      crewLocation = {
        lat: latest.lat,
        lng: latest.lng,
        heading: latest.heading,
        speed: latest.speed,
        updated_at: latest.updated_at,
        en_route: ageMs < 5 * 60 * 1000, // updated within last 5 min
      };
    }
  }

  // ── Storage drops (photos of items at storage facility) ──
  let storageDrops = [];
  const dropQuery = supabaseAdmin
    .from('storage_drops')
    .select(`
      id, item_photos, capacity_photo_url, created_at,
      facility:storage_facilities(name, address)
    `)
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: true });
  const { data: drops } = await dropQuery.catch(() => ({ data: [] }));
  storageDrops = drops || [];

  // ── Donation runs (storage → charity) for this booking's assignment ──
  let donationRuns = [];
  if (assignmentIds.size > 0) {
    const { data: drs } = await supabaseAdmin
      .from('donation_runs')
      .select(`
        id, item_photos, status, created_at, completed_at,
        center:donation_centers(name, address)
      `)
      .in('assignment_id', Array.from(assignmentIds))
      .order('created_at', { ascending: true })
      .catch(() => ({ data: [] }));
    donationRuns = drs || [];
  }

  // ── Customer signature ──
  const { data: signature } = await supabaseAdmin
    .from('customer_signatures')
    .select('customer_name_typed, amount_confirmed, payment_method, created_at')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Feedback / tip submitted flags ──
  const { data: feedback } = await supabaseAdmin
    .from('customer_feedback')
    .select('id, rating, review_text, reviewer_name, created_at')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tip } = await supabaseAdmin
    .from('crew_tips')
    .select('id, amount_cad, status, created_at')
    .eq('booking_id', booking.id)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    booking: {
      id: booking.id,
      booking_ref: booking.booking_ref,
      name: booking.name,
      address: booking.address,
      lat: booking.lat,
      lng: booking.lng,
      load_size: booking.load_size,
      itemized_items: booking.itemized_items || null,
      description_text: booking.description_text || null,
      job_date: booking.job_date,
      job_time: booking.job_time,
      total_price: booking.total_price,
      deposit_amount: booking.deposit_amount,
      deposit_paid: booking.deposit_paid,
      balance_due: booking.balance_due,
      payment_status: booking.payment_status,
      status: booking.status,
      crew_status: booking.crew_status,
      email: booking.email,
    },
    crew,
    crew_location: crewLocation,
    storage_drops: storageDrops,
    donation_runs: donationRuns,
    signature,
    feedback,
    tip,
    feedback_submitted: !!feedback,
    tip_submitted: !!tip,
  });
}
