import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts, jobDateTimeUTC } from '@/lib/dates';
import { requireStaffPermission } from '@/lib/staffAuth';
import { normalizePhone } from '@/lib/phone';
import { geocodeAddress } from '@/lib/geocode';
import { PRICING } from '@/lib/pricingConstants';
import { createDepositPayment } from '@/lib/stripe';
import { sendDepositLink, sendOperatorAlert } from '@/lib/messages';
import { resolveDispatch } from '@/lib/dispatch';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

const LOAD_ORDER = ['single_item', 'quarter', 'half', 'full'];

// POST /api/admin/bookings — manual booking entry (Dispatch "New Booking"
// modal). This route only had a GET handler (audit finding A1): every
// attempt 405'd, and — because the only place that fires the customer
// confirmation SMS/email and the operator alert is handleBookingConfirmed,
// wired solely to the Stripe deposit webhook — a booking entered here would
// never have notified anyone even once the POST handler existed.
//
// Staff enters the price directly (phone quotes are often already agreed
// verbally), so this does NOT run the customer-facing quote-decision engine
// — that gate exists to stop an untrusted client from setting its own
// price, which doesn't apply to a trusted staff session. Otherwise this
// mirrors exactly how every other phone-originated booking (Vapi) is
// created: inserted as pending_payment, a real Stripe deposit link is
// texted to the customer (never assume payment already happened), and the
// operator alert fires immediately so the "may never text me" gap is
// closed regardless of whether the customer completes the deposit. Once
// they do, the existing Stripe webhook -> handleBookingConfirmed path
// (unchanged, already correct) sends the customer's confirmation exactly
// as it does for every other channel.
export async function POST(req) {
  const auth = await requireStaffPermission(req, { permission: 'bookings.create', action: 'booking.create_manual' });
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, phone, address, job_date, job_time = '10:00', load_size, total_price } = body;

  if (!name || !phone || !address || !job_date || !load_size) {
    return NextResponse.json({ error: 'name, phone, address, job_date, and load_size are required' }, { status: 400 });
  }
  if (!LOAD_ORDER.includes(load_size)) {
    return NextResponse.json({ error: 'Invalid load_size' }, { status: 400 });
  }
  const price = Number(total_price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'total_price must be a positive number' }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  // Best-effort geocode — needed for dispatch/quadrant/tracking, but a
  // failure here must not block staff from getting the booking saved and
  // the customer texted; resolveDispatch below already tolerates null
  // lat/lng the same way create-booking's does.
  let geo = { lat: null, lng: null, quadrant: null, postal_code: null };
  try {
    const g = await geocodeAddress(address);
    if (g) geo = g;
  } catch (err) {
    console.error('[admin/bookings] geocode failed:', err.message);
  }

  const deposit = PRICING.deposit;
  const balance_due = Math.max(0, Math.round(price - deposit));

  const insert = {
    name,
    phone: normalizedPhone || phone,
    address,
    quadrant: geo.quadrant,
    lat: geo.lat,
    lng: geo.lng,
    postal_code: geo.postal_code || null,
    load_size,
    base_price: price,
    total_price: price,
    deposit_amount: deposit,
    balance_due,
    job_date,
    job_time,
    job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
    status: 'pending_payment',
    // 'phone' is the only constraint-valid source for a staff-entered call —
    // see bookings_source_check in supabase/migrations/0001_init.sql.
    source: 'phone',
  };

  const { data: booking, error } = await supabaseAdmin.from('bookings').insert(insert).select().single();
  if (error) {
    console.error('[admin/bookings] insert failed:', error.message);
    return NextResponse.json({ error: 'Could not create booking.' }, { status: 500 });
  }

  await recordTimelineEvent({
    entity_type: 'booking',
    entity_id: booking.id,
    event_type: 'booking_created_pending_payment',
    actor_type: 'staff',
    actor_id: auth.context.employee.id,
    source: 'admin_manual',
    after: insert,
  });

  // Tracking token — same as every other channel, so the customer portal
  // link and the review-request cron work identically for a manual booking.
  const trackingToken = randomBytes(16).toString('hex');
  await supabaseAdmin.from('bookings').update({ tracking_token: trackingToken }).eq('id', booking.id);

  // Deposit PaymentIntent + SMS link. Never assume a manually-entered
  // booking has already been paid — this texts the customer the same real
  // deposit link Vapi/WhatsApp/SMS bookings send, so payment_status only
  // ever reflects money actually collected (see audit F2's payment-state
  // principle applied here at creation time too).
  try {
    const intent = await createDepositPayment({
      booking_id: booking.id,
      customer_name: name,
      amount_cents: deposit * 100,
    });
    await supabaseAdmin.from('bookings').update({ stripe_payment_intent_id: intent.id }).eq('id', booking.id);
    await sendDepositLink(booking);
  } catch (err) {
    console.error('[admin/bookings] deposit link failed:', err.message);
  }

  // Operator alert — fires immediately regardless of the deposit link
  // above, which is the actual gap this route existed to close: a manually
  // entered booking previously never notified the owner at all.
  try {
    await sendOperatorAlert(booking);
  } catch (err) {
    console.error('[admin/bookings] operator alert failed:', err.message);
  }

  // Best-effort dynamic dispatch assignment, matching create-booking.
  try {
    await resolveDispatch({ id: booking.id, job_date, lat: geo.lat, lng: geo.lng, load_size });
  } catch (err) {
    console.error('[admin/bookings] resolveDispatch failed:', err.message);
  }

  return NextResponse.json({ booking_id: booking.id, booking_ref: booking.booking_ref, tracking_token: trackingToken });
}

// GET /api/admin/bookings?date=YYYY-MM-DD  (defaults to next operating day view)
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'admin.read', action: 'bookings.list' });
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const today = edmontonNowParts().date;

  let query = supabaseAdmin
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'rescheduled', 'completed', 'no_show'])
    .order('job_date', { ascending: true })
    .order('job_time', { ascending: true });

  if (date) {
    query = query.eq('job_date', date);
  } else {
    query = query.gte('job_date', today);
  }

  const { data: bookings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Denormalize assigned crew names onto each booking so the Dispatch job
  // list can show who's on a job without cross-referencing the live map.
  const assignmentIds = [...new Set((bookings || []).map((b) => b.crew_assignment_id).filter(Boolean))];
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabaseAdmin
      .from('crew_assignments')
      .select('id, driver_employee_id, secondary_employee_id')
      .in('id', assignmentIds);
    const employeeIds = [...new Set((assignments || []).flatMap((a) => [a.driver_employee_id, a.secondary_employee_id]).filter(Boolean))];
    let employeesById = {};
    if (employeeIds.length > 0) {
      const { data: employees } = await supabaseAdmin.from('employees').select('id, name, first_name, last_name').in('id', employeeIds);
      employeesById = Object.fromEntries((employees || []).map((e) => [e.id, e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Crew']));
    }
    const assignmentsById = Object.fromEntries((assignments || []).map((a) => [a.id, a]));
    for (const b of bookings) {
      const a = b.crew_assignment_id ? assignmentsById[b.crew_assignment_id] : null;
      b.assigned_crew_names = a
        ? [a.driver_employee_id, a.secondary_employee_id].filter(Boolean).map((id) => employeesById[id]).filter(Boolean)
        : [];
    }
  } else {
    for (const b of bookings) b.assigned_crew_names = [];
  }

  // Simple stats across the returned set.
  const stats = {
    jobs: bookings.length,
    revenue: bookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
    completed: bookings.filter((b) => b.status === 'completed').length,
    flagged: bookings.filter((b) => b.flag_for_review).length,
    high_risk: bookings.filter((b) => (b.no_show_risk_score || 0) >= 50).length,
  };

  return NextResponse.json({ bookings, stats });
}
