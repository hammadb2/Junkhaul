// Route version guard for stale-write protection.
//
// Crew actions that are route-sensitive must send route_id and route_version.
// If the submitted version is stale, return 409 Conflict.
//
// Modern crew-app requests (authenticated via employee session) MUST send
// route_version. Missing version = 400 Bad Request.
//
// Legacy PIN-authenticated requests are allowed without version temporarily,
// with audit logging. This exception has a removal date.

import { supabaseAdmin } from '@/lib/supabase.js';

// Actions classified by safe_retry semantics.
const SAFE_RETRY_ACTIONS = new Set([
  'route_acknowledgment',
  'note',
  'photo_upload',
]);

const UNSAFE_RETRY_ACTIONS = new Set([
  'job_completion',
  'payment',
  'job_removal',
  'route_reassignment',
  'job_start',
  'arrival',
  'en_route',
  'signature',
  'storage_drop',
  'item_conditions',
  'job_clock',
  'issue_report',
]);

// Legacy compatibility removal date. After this date, all versionless
// writes are rejected regardless of auth method.
const LEGACY_COMPAT_REMOVAL_DATE = new Date('2026-10-01T00:00:00Z');

/**
 * Validates that the submitted route_version matches the current route
 * version for the crew assignment associated with the given booking.
 *
 * @param {string} bookingId - The booking ID the action targets.
 * @param {string|null} routeId - The route plan ID from the client.
 * @param {number|null} routeVersion - The route version from the client.
 * @param {object} options - Options for auth method and action type.
 * @param {boolean} options.isLegacyPinAuth - True if authenticated via legacy PIN.
 * @param {string} options.actionType - The type of action (for safe_retry classification).
 * @param {string} options.employeeId - The employee ID (for audit logging).
 *
 * Returns:
 *   { valid: true } if the version is current.
 *   { valid: false, status, body } if the version is stale, missing, or unknown.
 */
export async function checkRouteVersion(bookingId, routeId, routeVersion, options = {}) {
  const { isLegacyPinAuth = false, actionType = 'unknown', employeeId = null } = options;

  // If no route version is provided:
  // - Legacy PIN auth: allow temporarily with audit logging (removal date enforced).
  // - Modern employee session: reject with 400.
  if (!routeVersion) {
    if (isLegacyPinAuth) {
      const now = new Date();
      if (now > LEGACY_COMPAT_REMOVAL_DATE) {
        return {
          valid: false,
          status: 400,
          body: {
            error: 'Route version required. Legacy compatibility period has ended.',
            refresh_required: true,
          },
        };
      }

      // Audit log the legacy versionless action.
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'route_plan',
        entity_id: routeId || null,
        event_type: 'legacy_versionless_action',
        actor_type: 'employee',
        actor_id: employeeId,
        source: 'legacy_pin_auth',
        metadata: {
          action_type: actionType,
          booking_id: bookingId,
          timestamp: now.toISOString(),
          removal_date: LEGACY_COMPAT_REMOVAL_DATE.toISOString(),
        },
      });

      return { valid: true, skipped: true, legacy: true };
    }

    // Modern crew-app request without route_version — reject.
    return {
      valid: false,
      status: 400,
      body: {
        error: 'Route version required for this action',
        refresh_required: true,
      },
    };
  }

  // Look up the booking to get its job_date and crew_assignment_id.
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
        return _buildConflictResponse(currentVersion, routeVersion, actionType);
      }
      return { valid: true };
    }
  }

  if (!assignmentId) {
    // No crew assignment found — can't enforce version. Allow but log.
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
    // No route plan exists — can't enforce version. Allow.
    return { valid: true, skipped: true };
  }

  if (routeVersion < latestPlan.route_version) {
    return _buildConflictResponse(latestPlan.route_version, routeVersion, actionType);
  }

  return { valid: true };
}

/**
 * Build a 409 Conflict response for stale route versions.
 * Classifies safe_retry based on action type.
 */
function _buildConflictResponse(currentVersion, submittedVersion, actionType) {
  const safeRetry = SAFE_RETRY_ACTIONS.has(actionType);
  const unsafeRetry = UNSAFE_RETRY_ACTIONS.has(actionType);

  return {
    valid: false,
    status: 409,
    body: {
      error: 'Route version conflict',
      current_route_version: currentVersion,
      submitted_route_version: submittedVersion,
      refresh_required: true,
      safe_retry: safeRetry && !unsafeRetry,
      action_type: actionType,
    },
  };
}

/**
 * Build a NextResponse-compatible stale route response.
 * Use this when you need to return the response directly.
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

/**
 * Build a 400 response for missing route version (modern app).
 */
export function missingVersionResponse() {
  return Response.json(
    {
      error: 'Route version required for this action',
      refresh_required: true,
    },
    { status: 400 }
  );
}

/**
 * Get the legacy compatibility removal date.
 */
export function getLegacyCompatRemovalDate() {
  return LEGACY_COMPAT_REMOVAL_DATE;
}
