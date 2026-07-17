// Route version guard for stale-write protection.
//
// Crew actions that are route-sensitive (job state transitions, arrivals,
// completions, donation-stop actions) must send route_id and route_version.
// If the submitted version is stale, return 409 Conflict.

import { supabaseAdmin } from '@/lib/supabase.js';

/**
 * Validates that the submitted route_version matches the current route
 * version for the crew assignment associated with the given booking.
 *
 * Returns:
 *   { valid: true } if the version is current.
 *   { valid: false, conflict: { current_route_version, submitted_route_version, refresh_required, safe_retry } }
 *   { valid: true, skipped: true } if no route plan exists (backward compat).
 *
 * @param {string} bookingId - The booking ID the action targets.
 * @param {string|null} routeId - The route plan ID from the client.
 * @param {number|null} routeVersion - The route version from the client.
 */
export async function checkRouteVersion(bookingId, routeId, routeVersion) {
  // If no route version is provided, allow the action (backward compat
  // for older app versions that don't send route version yet).
  if (!routeVersion) {
    return { valid: true, skipped: true };
  }

  // Look up the booking to get its job_date.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('job_date, crew_assignment_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    // Let the caller handle the missing booking.
    return { valid: true, skipped: true };
  }

  // Find the crew assignment for this booking's date.
  let assignmentId = booking.crew_assignment_id;
  if (!assignmentId && booking.job_date) {
    const { data: assignment } = await supabaseAdmin
      .from('crew_assignments')
      .select('id, current_route_version')
      .eq('assignment_date', booking.job_date)
      .maybeSingle();
    if (assignment) {
      assignmentId = assignment.id;
      const currentVersion = assignment.current_route_version;
      if (currentVersion && routeVersion < currentVersion) {
        return {
          valid: false,
          conflict: {
            current_route_version: currentVersion,
            submitted_route_version: routeVersion,
            refresh_required: true,
            safe_retry: false,
          },
        };
      }
      return { valid: true };
    }
  }

  if (!assignmentId) {
    return { valid: true, skipped: true };
  }

  // Get the latest route plan version for this assignment.
  const { data: latestPlan } = await supabaseAdmin
    .from('route_plans')
    .select('id, route_version')
    .eq('crew_assignment_id', assignmentId)
    .order('route_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestPlan) {
    return { valid: true, skipped: true };
  }

  if (routeVersion < latestPlan.route_version) {
    return {
      valid: false,
      conflict: {
        current_route_version: latestPlan.route_version,
        submitted_route_version: routeVersion,
        refresh_required: true,
        safe_retry: false,
      },
    };
  }

  return { valid: true };
}

/**
 * Builds a 409 Conflict response for stale route versions.
 */
export function staleRouteResponse(conflict) {
  return Response.json(
    {
      error: 'Route version conflict',
      ...conflict,
    },
    { status: 409 }
  );
}
