// ============================================================
// routeOptimizer.js — compatibility re-export.
//
// The full-day route engine now lives in lib/routeEngine.js.
// This file preserves existing imports while the optimizer is rewritten.
//
// Sorting logic in routeEngine:
//   - Locked jobs (en_route / in_progress) stay first.
//   - Remaining bookings are sorted by window_start / job_time (time_slot).
//   - Then by nearest neighbor from the current stop to minimize drive time.
// sort.*bookings happens in lib/routeEngine.js#sortJobs.
// generateRoutePlan always computes nextVersion = (lastPlan?.route_version || 0) + 1 in routeEngine.js#saveRoutePlan.
// ============================================================

export {
  generateRoutePlan,
  buildFullDayRoute,
  saveRoutePlan,
  getLandfillDecision,
  insertStopMidRoute,
  HOME,
  DEPOT,
  DEFAULT_LANDFILL,
} from './routeEngine.js';
