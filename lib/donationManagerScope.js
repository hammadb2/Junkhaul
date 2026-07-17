// Shared manager-scope checks for the donation intelligence admin APIs.
// Mirrors the inline assertManagerCanAct() pattern used by
// app/api/admin/bookings/[id]/actions/route.js — owner/admin bypass,
// managers must hold an explicit "allow" manager_scopes row (and no
// "deny" row) for the crew/date/quadrant in question.

import { managerCanAccessAny } from './staffAuth';

function isUnrestricted(context) {
  return context.roles.includes('owner') || context.roles.includes('admin');
}

export async function assertManagerScopeForCrewAssignment(context, crewAssignment) {
  if (isUnrestricted(context)) return true;
  if (!context.roles.includes('manager')) return false;
  const checks = [
    ['crew_assignment', crewAssignment?.id],
    ['crew', crewAssignment?.id],
    ['date', crewAssignment?.assignment_date],
  ].filter(([, value]) => value).map(([scope_type, scope_value]) => ({ scope_type, scope_value }));
  if (!checks.length) return false;
  return managerCanAccessAny(context.employee.id, checks);
}

export async function assertManagerScopeForDonationRequest(context, donationRequest) {
  if (isUnrestricted(context)) return true;
  if (!context.roles.includes('manager')) return false;
  const checks = [
    ['quadrant', donationRequest?.quadrant],
  ].filter(([, value]) => value).map(([scope_type, scope_value]) => ({ scope_type, scope_value }));
  if (!checks.length) return false;
  return managerCanAccessAny(context.employee.id, checks);
}
