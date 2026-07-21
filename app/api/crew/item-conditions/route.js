import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// ============================================================
// POST /api/crew/item-conditions
//
// Saves crew-verified item conditions (good/damaged/missing)
// when crew arrives at the pickup location.
//
// Auth: accepts either the employee session cookie (jh_employee_session)
// or the legacy x-crew-pin header, matching the sibling
// /api/crew/collect-payment, /api/crew/resend-payment-link, and
// /api/crew/upload-photo routes. Previously this route only accepted
// the PIN header, but the crew app's session-based client (the one
// actually in use — see docs/RELIABILITY_MASTER_PLAN.md) has always
// called this endpoint with a session cookie, so every real item-
// condition submission was failing with 401.
//
// Body:
//   booking_id: string
//   conditions: { "0": "good", "1": "damaged", "1_note": "broken leg", ... }
// ============================================================
export async function POST(req) {
  try {
    const employee = await getAuthedEmployee(req);
    const pinAuthed = !employee && await crewAuth(req);
    if (!employee && !pinAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, conditions, route_id, route_version } = await req.json();
    if (!booking_id || !conditions) {
      return NextResponse.json({ error: 'Missing booking_id or conditions' }, { status: 400 });
    }

    // If authenticated via employee session, verify the employee is
    // assigned to this booking's crew. Legacy PIN auth bypasses this check.
    if (employee && !await isEmployeeAssignedToBooking(employee.id, booking_id)) {
      return NextResponse.json({ error: 'Not assigned to this booking' }, { status: 403 });
    }

    const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
      isLegacyPinAuth: !employee && pinAuthed,
      actionType: 'item_conditions',
      employeeId: employee?.id,
    });
    if (!routeCheck.valid) {
      if (routeCheck.status === 400) return missingVersionResponse();
      return staleRouteResponse(routeCheck.body);
    }

    // Fetch current booking to get existing itemized_items
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('id, itemized_items')
      .eq('id', booking_id)
      .maybeSingle();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Merge conditions into itemized_items
    let items = [];
    if (Array.isArray(booking.itemized_items)) {
      items = booking.itemized_items;
    } else if (typeof booking.itemized_items === 'string') {
      try { items = JSON.parse(booking.itemized_items); } catch { items = []; }
    }

    // Attach condition + notes to each item
    const updatedItems = items.map((it, i) => {
      const cond = conditions[String(i)] || conditions[i];
      const note = conditions[`${i}_note`] || conditions[`${String(i)}_note`];
      return {
        ...it,
        crew_condition: cond || null,
        crew_condition_note: note || null,
      };
    });

    // Save back to booking
    const { error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({
        itemized_items: updatedItems,
        crew_item_check_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    if (updateErr) {
      console.error('Failed to save item conditions:', updateErr);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // Log to timeline
    const damaged = updatedItems.filter((i) => i.crew_condition === 'damaged');
    const missing = updatedItems.filter((i) => i.crew_condition === 'missing');
    let summary = `Crew verified ${updatedItems.length} items`;
    if (damaged.length > 0) summary += `, ${damaged.length} damaged`;
    if (missing.length > 0) summary += `, ${missing.length} missing`;

    await supabaseAdmin.from('events').insert({
      booking_id,
      event_type: 'item_check',
      summary,
      metadata: { conditions: updatedItems.map((i) => ({ name: i.name, condition: i.crew_condition, note: i.crew_condition_note })) },
    });

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error('Item conditions error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
