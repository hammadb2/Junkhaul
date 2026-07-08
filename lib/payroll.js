// ============================================================
// PAYROLL ENGINE — implements CRA T4127 Payroll Deductions
// Formulas (Option 1) for Alberta employees.
//
// Source of truth: CRA T4127 "Payroll Deductions Formulas".
// Formulas implemented:
//   Step 1: annual taxable income (A)
//   Step 2: basic federal tax (T3)
//   Step 3: annual federal tax (T1)
//   Step 4: basic provincial tax (T4)  [Alberta]
//   Step 5: provincial tax deduction (T2) [Alberta]
//   Step 6: per-pay-period tax (T)
//   Chapter 6: CPP + CPP2 contributions
//   Chapter 7: EI premiums
//
// Every calculation here must match CRA's Payroll Deductions Online
// Calculator (PDOC) for a single pay period. See
//   supabase/migrations/.../payroll.test.js for the cross-check suite.
//
// Alberta-specific simplifications (all confirmed = 0 for AB in T4127):
//   V1 = 0, V2 = 0, S = 0, LCP = 0, K3P = 0, K4P = 0
// Federal simplifications for our use case:
//   LCF = 0 (no labour-sponsored funds), K3 = 0 (no authorized extra credits)
// ============================================================

import { SEED_EDITIONS, PAY_PERIODS } from './payrollRates.js';

// supabaseAdmin is lazy-imported inside the async functions that need it,
// so the pure deduction math (calcCPP/calcEI/calculateDeductionsPure/etc.)
// can be unit-tested without a DB connection.
async function getSupabase() {
  const mod = await import('./supabase.js');
  return mod.supabaseAdmin;
}

// ------------------------------------------------------------
// Rounding: T4127 rounds CPP/EI to nearest $0.01; tax to nearest
// $0.01 (we choose $0.01 precision, the tighter allowed option).
// ------------------------------------------------------------
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function roundHalfUp(n) {
  // CRA uses "round to nearest cent" (half up) for CPP/EI/tax.
  return Math.round(n * 100 + Number.EPSILON) / 100;
}

// ------------------------------------------------------------
// Load the active rate edition for a given pay date.
// Tries the payroll_rates DB table first; falls back to seed.
// ------------------------------------------------------------
export async function getRates(payDate) {
  const d = typeof payDate === 'string' ? payDate : payDate.toISOString().slice(0, 10);
  // Try DB
  try {
    const supabaseAdmin = await getSupabase();
    const { data } = await supabaseAdmin
      .from('payroll_rates')
      .select('*')
      .lte('effective_from', d)
      .or(`effective_to.is.null,effective_to.gte.${d}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return normalizeDbRates(data);
  } catch {
    // fall through to seed
  }
  // Fallback to seed: pick the seed edition covering the date
  const seed = SEED_EDITIONS.find(
    (r) => r.effective_from <= d && (!r.effective_to || r.effective_to >= d)
  ) || SEED_EDITIONS[SEED_EDITIONS.length - 1];
  return seed;
}

function normalizeDbRates(row) {
  // Re-hydrate DB row into the shape the engine expects.
  return {
    edition: row.edition,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    cpp_rate: Number(row.cpp_rate),
    cpp_basic_exemption: Number(row.cpp_basic_exemption),
    cpp_max_pensionable: Number(row.cpp_max_pensionable),
    cpp_max_contribution: Number(row.cpp_max_contribution),
    cpp_base_rate: 0.0495,
    cpp_base_max_contribution: 3519.45,
    cpp_first_additional_rate: 0.01,
    cpp_first_additional_max: 711.0,
    cpp2_rate: Number(row.cpp2_rate),
    cpp2_lower_ceiling: Number(row.cpp2_lower_ceiling),
    cpp2_upper_ceiling: Number(row.cpp2_upper_ceiling),
    cpp2_max_contribution: Number(row.cpp2_max_contribution),
    ei_rate: Number(row.ei_rate),
    ei_max_insurable: Number(row.ei_max_insurable),
    ei_max_premium: Number(row.ei_max_premium),
    fed_brackets: row.fed_brackets,
    fed_lowest_rate: Number(row.fed_basic_personal_amount) ? 0.14 : 0.14,
    fed_basic_personal_amount: Number(row.fed_basic_personal_amount),
    fed_bpa_min: 14829.0,
    fed_bpa_phaseout_start: 181440.0,
    fed_bpa_phaseout_end: 258482.0,
    cea: 1501.0,
    ab_brackets: row.ab_brackets,
    ab_lowest_rate: 0.08,
    ab_basic_personal_amount: Number(row.ab_basic_personal_amount),
    ab_k5p_threshold: 4896.0,
    ab_k5p_rate: 0.25,
    source: row.source || 'CRA T4127',
  };
}

// ------------------------------------------------------------
// Federal Basic Personal Amount (BPAF) — dynamic, phases out for
// high income. NI = A (we use annualized taxable income).
// ------------------------------------------------------------
function calcBPAF(A, rates) {
  if (A <= rates.fed_bpa_phaseout_start) return rates.fed_basic_personal_amount;
  if (A >= rates.fed_bpa_phaseout_end) return rates.fed_bpa_min;
  const reduction = ((A - rates.fed_bpa_phaseout_start) *
    (rates.fed_basic_personal_amount - rates.fed_bpa_min)) /
    (rates.fed_bpa_phaseout_end - rates.fed_bpa_phaseout_start);
  // Round 2nd decimal half up per T4127 note
  const v = rates.fed_basic_personal_amount - reduction;
  return Math.round(v * 100) / 100;
}

// ------------------------------------------------------------
// Find bracket (rate + K) for a given annualized income A.
// ------------------------------------------------------------
function bracketFor(brackets, A) {
  for (const b of brackets) {
    if (A > b.from && (b.to === null || A <= b.to)) return b;
  }
  // A exactly on a boundary: the > from logic handles it; fallback to last
  return brackets[brackets.length - 1];
}

// ============================================================
// CPP — Chapter 6 (employees receiving salary/wages)
//   C = lesser of:
//     (i)  cpp_max_contribution × (PM/12) − D        [D = YTD CPP]
//     (ii) cpp_rate × [PI − (basic_exemption / P)]
//   PI = pensionable income for the period
//   P  = pay periods per year
//   PM = number of months pensionable in the year (12 for full year)
// ============================================================
export function calcCPP({ PI, P, PM = 12, ytdCPP = 0, rates }) {
  const cap = rates.cpp_max_contribution * (PM / 12) - ytdCPP;
  const gross = rates.cpp_rate * (PI - rates.cpp_basic_exemption / P);
  let C = Math.min(cap, gross);
  if (C < 0) C = 0;
  return roundHalfUp(C);
}

// ============================================================
// CPP2 — Chapter 6 (second additional)
//   C2 = lesser of:
//     (i)  cpp2_max_contribution × (PM/12) − D2      [D2 = YTD CPP2]
//     (ii) (PIYTD + PI − W) × cpp2_rate
//   W = greater of (PIYTD, YMPE × (PM/12))
// ============================================================
export function calcCPP2({ PI, PIYTD, P, PM = 12, ytdCPP2 = 0, rates }) {
  const cap = rates.cpp2_max_contribution * (PM / 12) - ytdCPP2;
  const W = Math.max(PIYTD, rates.cpp2_lower_ceiling * (PM / 12));
  const gross = (PIYTD + PI - W) * rates.cpp2_rate;
  let C2 = Math.min(cap, gross);
  if (C2 < 0) C2 = 0;
  return roundHalfUp(C2);
}

// ============================================================
// EI — Chapter 7
//   EI = lesser of:
//     (i)  ei_max_premium − D1     [D1 = YTD EI]
//     (ii) ei_rate × IE            [IE = insurable earnings for period]
// ============================================================
export function calcEI({ IE, ytdEI = 0, rates }) {
  const cap = rates.ei_max_premium - ytdEI;
  const gross = rates.ei_rate * IE;
  let E = Math.min(cap, gross);
  if (E < 0) E = 0;
  return roundHalfUp(E);
}

// ============================================================
// F5 — CPP enhancement (first additional + CPP2) for the PERIOD.
// Per T4127: F5 = C × (0.0100/0.0595) + C2   (per-period, NOT annualized).
// The annualization happens in Step 1: A = P × (I − F5A).
// ============================================================
function calcF5({ C, C2, rates }) {
  return C * (rates.cpp_first_additional_rate / rates.cpp_rate) + C2;
}

// ============================================================
// Federal tax — Steps 1-3
//   A  = P × (I − F5)            [no other pretax deductions in our case]
//   T3 = (R × A) − K − K1 − K2 − K4     [K3=0, LCF=0]
//   T1 = T3                       [no LCF]
//   K1 = fed_lowest_rate × TC
//   K2 = fed_lowest_rate × (baseCPP_annualized, capped) + fed_lowest_rate × (EI_annualized, capped)
//   K4 = lesser of (fed_lowest_rate × A) or (fed_lowest_rate × CEA)
// ============================================================
function calcFederalTax({ I, C, C2, EI, P, PM = 12, TC, rates }) {
  const F5 = calcF5({ C, C2, rates }); // per-period enhancement
  const A = P * (I - F5);
  if (A <= 0) return { T1: 0, A };

  const b = bracketFor(rates.fed_brackets, A);
  const R = b.rate;
  const K = b.K;

  const K1 = rates.fed_lowest_rate * TC;
  const baseCPPannual = Math.min(
    P * C * (rates.cpp_base_rate / rates.cpp_rate),
    rates.cpp_base_max_contribution * (PM / 12)
  );
  const EIannual = Math.min(P * EI, rates.ei_max_premium);
  const K2 = rates.fed_lowest_rate * baseCPPannual + rates.fed_lowest_rate * EIannual;
  const K4 = Math.min(rates.fed_lowest_rate * A, rates.fed_lowest_rate * rates.cea);

  let T3 = R * A - K - K1 - K2 - K4;
  if (T3 < 0) T3 = 0;
  const T1 = T3; // no LCF
  return { T1, A };
}

// ============================================================
// Alberta tax — Steps 4-5
//   T4 = (V × A) − KP − K1P − K2P − K5P     [K3P=0, K4P=0]
//   T2 = T4 + V1 + V2 − S − (P × LCP)        [V1=V2=S=LCP=0 for AB]
//   K1P = ab_lowest_rate × TCP
//   K2P = ab_lowest_rate × (baseCPP_annualized, capped) + ab_lowest_rate × (EI_annualized, capped)
//   K5P = ((K1P + K2P) − ab_k5p_threshold) × ab_k5p_rate, if > 0 else 0
// ============================================================
function calcAlbertaTax({ A, C, EI, P, PM = 12, TCP, rates }) {
  if (A <= 0) return { T2: 0 };
  const b = bracketFor(rates.ab_brackets, A);
  const V = b.rate;
  const KP = b.K;

  const K1P = rates.ab_lowest_rate * TCP;
  const baseCPPannual = Math.min(
    P * C * (rates.cpp_base_rate / rates.cpp_rate),
    rates.cpp_base_max_contribution * (PM / 12)
  );
  const EIannual = Math.min(P * EI, rates.ei_max_premium);
  const K2P = rates.ab_lowest_rate * baseCPPannual + rates.ab_lowest_rate * EIannual;

  let K5P = (K1P + K2P - rates.ab_k5p_threshold) * rates.ab_k5p_rate;
  if (K5P < 0) K5P = 0;

  let T4 = V * A - KP - K1P - K2P - K5P;
  if (T4 < 0) T4 = 0;
  const T2 = T4; // V1=V2=S=LCP=0 for Alberta
  return { T2 };
}

// ============================================================
// Per-pay-period tax — Step 6
//   T = (T1 + T2) / P, rounded to nearest $0.01
// ============================================================

// ============================================================
// PAY RULES (Alberta Employment Standards)
//   - Base rate from employee.pay_rate (default $15/hr)
//   - Overtime: 1.5× regular rate for hours > 8 in a day OR > 44 in a week,
//     whichever gives the greater OT amount.
//   - 3-hour minimum: if a shift is cut short/cancelled after reporting,
//     pay at least 3 hours at minimum wage ($15/hr in AB as of 2024+).
// ============================================================
export const AB_MIN_WAGE = 15.0;

// Compute regular vs overtime hours for a single shift.
// `dailyHours` = hours worked this shift. `weeklyHoursExcludingThisShift`
// = hours already worked this week (Mon-Sun) outside this shift.
export function splitOvertime(dailyHours, weeklyHoursExcludingThisShift = 0) {
  // Daily OT: hours beyond 8 in the day
  const dailyOT = Math.max(0, dailyHours - 8);
  // Weekly OT from this shift: hours of this shift that push the week
  // above 44. If the week was already >= 44 before this shift, the entire
  // shift is weekly OT.
  const nonOTPart = Math.max(0, 44 - weeklyHoursExcludingThisShift);
  const weeklyOT = Math.max(0, dailyHours - nonOTPart);
  // Use whichever gives the greater OT amount (Alberta rule).
  const otHours = Math.max(dailyOT, weeklyOT);
  const regHours = dailyHours - otHours;
  return { regularHours: round2(regHours), overtimeHours: round2(otHours) };
}

// ============================================================
// Compute gross pay for a shift (with overtime + 3hr minimum).
//   gross = regularHours × rate + overtimeHours × rate × 1.5
//   If reported and worked < 3 hrs, pay max(workedPay, 3 × minWage).
// ============================================================
export function calcShiftGross({ dailyHours, weeklyHoursBefore = 0, rate, reported = true }) {
  const { regularHours, overtimeHours } = splitOvertime(dailyHours, weeklyHoursBefore);
  const regPay = regularHours * rate;
  const otPay = overtimeHours * rate * 1.5;
  let gross = regPay + otPay;
  // 3-hour minimum (only if employee reported for work)
  if (reported && dailyHours > 0 && dailyHours < 3) {
    const minPay = 3 * AB_MIN_WAGE;
    gross = Math.max(gross, minPay);
  }
  return {
    regularHours,
    overtimeHours,
    totalHours: round2(dailyHours),
    regularPay: round2(regPay),
    overtimePay: round2(otPay),
    gross: round2(gross),
  };
}

// ============================================================
// MAIN: calculate a single paycheque for one pay period.
//
// Inputs:
//   grossForPeriod  — total gross wages for the pay period (already
//                     includes overtime/3hr-min applied per shift)
//   pensionableForPeriod — pensionable earnings (== gross for us; no
//                     non-pensionable income)
//   insurableForPeriod   — insurable earnings (== gross for us)
//   P              — pay periods per year (26 biweekly, 52 weekly, etc.)
//   TC             — federal TD1 total claim (default = BPAF)
//   TCP            — Alberta TD1AB total claim (default = AB BPA)
//   ytdCPP, ytdCPP2, ytdEI — year-to-date contributions (for caps)
//   PIYTD          — year-to-date pensionable earnings (for CPP2)
//   payDate        — date paid (selects rate edition)
//   PM             — months pensionable this year (12 default)
//
// Returns a full deduction breakdown + net pay.
// ============================================================
export async function calculatePaycheque({
  grossForPeriod,
  pensionableForPeriod,
  insurableForPeriod,
  P = PAY_PERIODS.biweekly,
  TC,
  TCP,
  ytdCPP = 0,
  ytdCPP2 = 0,
  ytdEI = 0,
  PIYTD = 0,
  payDate = new Date(),
  PM = 12,
}) {
  const rates = await getRates(payDate);
  return calculateDeductionsPure({
    rates,
    grossForPeriod,
    pensionableForPeriod,
    insurableForPeriod,
    P, TC, TCP, ytdCPP, ytdCPP2, ytdEI, PIYTD, PM,
  });
}

// ============================================================
// PURE deduction math (no supabase) — unit-testable.
// Takes an explicit `rates` edition object. Implements the same
// T4127 Option 1 formulas as calculatePaycheque.
// ============================================================
export function calculateDeductionsPure({
  rates,
  grossForPeriod,
  pensionableForPeriod,
  insurableForPeriod,
  P = PAY_PERIODS.biweekly,
  TC,
  TCP,
  ytdCPP = 0,
  ytdCPP2 = 0,
  ytdEI = 0,
  PIYTD = 0,
  PM = 12,
}) {
  // Vacation pay is paid each period (Alberta practice when vacation is
  // paid on each cheque) and is part of gross subject to CPP/EI/tax.
  const vacationPay = roundHalfUp(grossForPeriod * 0.04);
  const totalGross = round2(grossForPeriod + vacationPay);

  // Pensionable + insurable earnings = wages + vacation pay
  const PI = pensionableForPeriod != null ? pensionableForPeriod + vacationPay : totalGross;
  const IE = insurableForPeriod != null ? insurableForPeriod + vacationPay : totalGross;
  const I = totalGross; // gross subject to tax

  // Default claims if not provided
  const tc = TC ?? rates.fed_basic_personal_amount;
  const tcp = TCP ?? rates.ab_basic_personal_amount;

  // CPP + CPP2 + EI
  const C = calcCPP({ PI, P, PM, ytdCPP, rates });
  const C2 = calcCPP2({ PI, PIYTD, P, PM, ytdCPP2, rates });
  const EI = calcEI({ IE, ytdEI, rates });

  // Federal tax
  const { T1, A } = calcFederalTax({ I, C, C2, EI, P, PM, TC: tc, rates });
  // Alberta tax (reuses A from federal step; T4127 uses the same A)
  const { T2 } = calcAlbertaTax({ A, C, EI, P, PM, TCP: tcp, rates });

  // Per-period tax
  const T = roundHalfUp((T1 + T2) / P);

  const totalDeductions = round2(C + C2 + EI + T);
  const netPay = round2(totalGross - totalDeductions);

  return {
    edition: rates.edition,
    gross: totalGross,              // wages + vacation pay
    wages: round2(grossForPeriod),  // wages only (regular + OT)
    vacationPay,
    cpp: C,
    cpp2: C2,
    ei: EI,
    fedTax: T,                      // combined fed+prov income tax withheld
    totalDeductions,
    netPay,
    _annual: { A: round2(A), T1: round2(T1), T2: round2(T2) },
    rates: { cpp_rate: rates.cpp_rate, ei_rate: rates.ei_rate, edition: rates.edition },
  };
}

// ============================================================
// Convenience: calculate a pay run for a set of employee timesheets.
// Each timesheet entry: { employee_id, gross, pensionable, insurable,
//   regularHours, overtimeHours, totalHours, weeklyHoursBefore }
// Returns per-employee stubs + run totals + CRA remittance.
// ============================================================
export async function calculatePayRun({ entries, periodStart, periodEnd, P = PAY_PERIODS.biweekly, payDate = new Date() }) {
  const supabaseAdmin = await getSupabase();
  const rates = await getRates(payDate);
  const stubs = [];
  let totalGross = 0, totalCPP = 0, totalCPP2 = 0, totalEI = 0,
    totalFedTax = 0, totalVacation = 0, totalNet = 0;

  for (const e of entries) {
    // Fetch employee + YTD figures
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', e.employee_id)
      .maybeSingle();
    if (!emp) continue;

    const ytd = await getYTD(emp.id, payDate);

    const result = await calculatePaycheque({
      grossForPeriod: e.gross,
      pensionableForPeriod: e.pensionable ?? e.gross,
      insurableForPeriod: e.insurable ?? e.gross,
      P,
      TC: emp.td1_federal_claim,
      TCP: emp.td1_ab_claim,
      ytdCPP: ytd.cpp,
      ytdCPP2: ytd.cpp2,
      ytdEI: ytd.ei,
      PIYTD: ytd.pensionable,
      payDate,
    });

    const stub = {
      employee_id: emp.id,
      regular_hours: e.regularHours,
      overtime_hours: e.overtimeHours,
      total_hours: e.totalHours,
      regular_pay: round2(e.regularHours * emp.pay_rate),
      overtime_pay: round2(e.overtimeHours * emp.pay_rate * 1.5),
      gross_pay: result.gross,
      vacation_pay: result.vacationPay,
      cpp: result.cpp,
      cpp2: result.cpp2,
      ei: result.ei,
      fed_tax: result.fedTax,   // combined fed+prov income tax withheld
      ab_tax: 0,                // combined into fed_tax for withholding; split available on T4
      total_deductions: result.totalDeductions,
      net_pay: result.netPay,
      ytd_gross: round2(ytd.gross + result.gross),
      ytd_cpp: round2(ytd.cpp + result.cpp),
      ytd_cpp2: round2(ytd.cpp2 + result.cpp2),
      ytd_ei: round2(ytd.ei + result.ei),
      ytd_insurable_earnings: round2(ytd.insurable + result.gross),
      ytd_pensionable_earnings: round2(ytd.pensionable + result.gross),
    };
    stubs.push(stub);

    totalGross = round2(totalGross + result.gross);
    totalCPP = round2(totalCPP + result.cpp);
    totalCPP2 = round2(totalCPP2 + result.cpp2);
    totalEI = round2(totalEI + result.ei);
    totalFedTax = round2(totalFedTax + result.fedTax);
    totalVacation = round2(totalVacation + result.vacationPay);
    totalNet = round2(totalNet + result.netPay);
  }

  const totalDeductions = round2(totalCPP + totalCPP2 + totalEI + totalFedTax);
  const craRemittance = round2(totalCPP + totalCPP2 + totalEI + totalFedTax);

  // Remittance due: 15th of the month following the period end
  const pe = new Date(periodEnd);
  const dueDate = new Date(pe.getFullYear(), pe.getMonth() + 1, 15);

  return {
    edition: rates.edition,
    period_start: periodStart,
    period_end: periodEnd,
    stubs,
    totals: {
      total_gross: totalGross,
      total_cpp: totalCPP,
      total_cpp2: totalCPP2,
      total_ei: totalEI,
      total_fed_tax: totalFedTax,
      total_vacation: totalVacation,
      total_net: totalNet,
      total_deductions: totalDeductions,
      total_cra_remittance: craRemittance,
      remittance_due_date: dueDate.toISOString().slice(0, 10),
    },
  };
}

// ------------------------------------------------------------
// YTD helper — sums prior pay stubs in the same calendar year.
// ------------------------------------------------------------
async function getYTD(employeeId, payDate) {
  const supabaseAdmin = await getSupabase();
  const year = new Date(payDate).getFullYear();
  const yearStart = `${year}-01-01`;
  const { data: stubs } = await supabaseAdmin
    .from('pay_stubs')
    .select('gross_pay, cpp, cpp2, ei, fed_tax, ytd_insurable_earnings, ytd_pensionable_earnings')
    .eq('employee_id', employeeId)
    .gte('created_at', yearStart);
  const s = stubs || [];
  return {
    gross: s.reduce((a, b) => a + Number(b.gross_pay || 0), 0),
    cpp: s.reduce((a, b) => a + Number(b.cpp || 0), 0),
    cpp2: s.reduce((a, b) => a + Number(b.cpp2 || 0), 0),
    ei: s.reduce((a, b) => a + Number(b.ei || 0), 0),
    insurable: s.reduce((a, b) => a + Number(b.ytd_insurable_earnings || 0), 0),
    pensionable: s.reduce((a, b) => a + Number(b.ytd_pensionable_earnings || 0), 0),
  };
}

export { PAY_PERIODS };
