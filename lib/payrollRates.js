// ============================================================
// PAYROLL RATES — CRA T4127 rate tables.
//
// CRA publishes a new T4127 edition TWICE a year:
//   - 122nd edition: effective January 1, 2026  (2026-H1)
//   - 123rd edition: effective July 1, 2026      (2026-H2)
//
// Rates/thresholds CAN change mid-year, not just annually.
// The rate tables below are the seed/fallback. In production the
// engine loads the active edition from the `payroll_rates` table
// (see supabase/migrations/20260707_employee_portal.sql) so a new
// edition can be inserted without a code deploy.
//
// *** RECURRING REMINDER (set on our end, not in code): ***
//   Check canada.ca for a new T4127 every JANUARY and JULY.
//   Insert a new payroll_rates row with the next edition id and
//   effective_from date; the engine auto-selects the row whose
//   effective_from <= pay date and effective_to is null or >= pay date.
//
// All values sourced directly from CRA T4127 (122nd edition, Jan 1 2026)
// and canada.ca rate tables. Do NOT rebuild from blog summaries.
// ============================================================

// ------------------------------------------------------------
// 2026-H1 seed (effective Jan 1, 2026)
// ------------------------------------------------------------
export const RATES_2026_H1 = {
  edition: '2026-H1',
  effective_from: '2026-01-01',
  effective_to: '2026-06-30',
  // CPP (base + first additional, combined rate)
  cpp_rate: 0.0595,
  cpp_basic_exemption: 3500.0,
  cpp_max_pensionable: 74600.0,        // YMPE
  cpp_max_contribution: 4230.45,       // employee max (base + 1st additional)
  cpp_base_rate: 0.0495,               // base only (used in K2 credit calc)
  cpp_base_max_contribution: 3519.45,  // 0.0495 * (74600 - 3500)
  cpp_first_additional_rate: 0.0100,   // first additional
  cpp_first_additional_max: 711.00,    // 0.01 * (74600 - 3500)
  // CPP2 (second additional, earnings between YMPE and YAMPE)
  cpp2_rate: 0.0400,
  cpp2_lower_ceiling: 74600.0,         // = YMPE
  cpp2_upper_ceiling: 85000.0,         // YAMPE
  cpp2_max_contribution: 416.00,       // 0.04 * (85000 - 74600)
  // EI
  ei_rate: 0.0163,
  ei_max_insurable: 68900.0,
  ei_max_premium: 1123.07,             // 0.0163 * 68900
  // Federal tax brackets (Table 8.1)
  // Each: { from, to (null = infinity), rate, K }
  fed_brackets: [
    { from: 0,       to: 58523,   rate: 0.1400, K: 0 },
    { from: 58523,   to: 117045,  rate: 0.2050, K: 3804 },
    { from: 117045,  to: 181440,  rate: 0.2600, K: 10241 },
    { from: 181440,  to: 258482,  rate: 0.2900, K: 15685 },
    { from: 258482,  to: null,    rate: 0.3300, K: 26024 },
  ],
  fed_lowest_rate: 0.1400,             // R1 (credit rate)
  fed_basic_personal_amount: 16452.0,  // BPAF (max; reduced for high income via formula)
  fed_bpa_min: 14829.0,                // BPAF floor (income >= 258482)
  fed_bpa_phaseout_start: 181440.0,
  fed_bpa_phaseout_end: 258482.0,
  // Canada Employment Amount (Table 8.2)
  cea: 1501.0,
  // Alberta tax brackets (Table 8.1)
  ab_brackets: [
    { from: 0,       to: 61200,   rate: 0.0800, K: 0 },
    { from: 61200,   to: 154259,  rate: 0.1000, K: 1224 },
    { from: 154259,  to: 185111,  rate: 0.1200, K: 4309 },
    { from: 185111,  to: 246813,  rate: 0.1300, K: 6160 },
    { from: 246813,  to: 370220,  rate: 0.1400, K: 8628 },
    { from: 370220,  to: null,    rate: 0.1500, K: 12331 },
  ],
  ab_lowest_rate: 0.0800,
  ab_basic_personal_amount: 22769.0,   // TCP default if TD1AB not filed
  // Alberta family employment tax credit threshold (K5P)
  ab_k5p_threshold: 4896.0,
  ab_k5p_rate: 0.25,
  // Alberta has NO: V1, V2, S, LCP, K3P, K4P (all 0)
  source: 'CRA T4127 122nd edition (Jan 1, 2026)',
};

// ------------------------------------------------------------
// Edition registry — add new editions here AND in the DB.
// The engine picks the edition whose effective_from <= payDate
// and (effective_to is null OR effective_to >= payDate).
// ------------------------------------------------------------
export const SEED_EDITIONS = [RATES_2026_H1];

// Pay-period frequencies (P = number of pay periods per year)
export const PAY_PERIODS = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
