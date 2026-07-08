// ============================================================
// PAYROLL ENGINE TEST SUITE
//
// Cross-checks lib/payroll.js against CRA T4127 (122nd edition,
// Jan 1 2026) formulas, hand-computed from the official source:
//   https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html
//
// *** BEFORE THIS ENGINE TOUCHES A REAL PAYCHEQUE: ***
//   1. Run this suite:  node supabase/migrations/.../payroll.test.js
//      (or wire into the project's test runner)
//   2. ALSO cross-check the sample paycheques below against CRA's
//      Payroll Deductions Online Calculator (PDOC) at
//      canada.ca/pdoc — enter the same gross/claim/province/pay-
//      period and confirm each deduction matches to the cent.
//   3. PDOC is the final authority. If PDOC and this suite disagree,
//      trust PDOC and fix the engine.
//
// All expected values below were computed directly from the T4127
// Option 1 formulas (Steps 1-6, Chapters 6-7) for Alberta, 2026.
// ============================================================

import {
  calcCPP, calcCPP2, calcEI, splitOvertime, calcShiftGross,
  calculateDeductionsPure, AB_MIN_WAGE,
} from '../../lib/payroll.js';
import { RATES_2026_H1, PAY_PERIODS } from '../../lib/payrollRates.js';

const rates = RATES_2026_H1;
let pass = 0, fail = 0;
const failures = [];

function approxEq(a, b, eps = 0.005) {
  return Math.abs(a - b) <= eps;
}
function check(name, actual, expected) {
  if (approxEq(actual, expected)) {
    pass++;
    // console.log(`  ✓ ${name}: ${actual}`);
  } else {
    fail++;
    failures.push({ name, actual, expected });
    console.log(`  ✗ ${name}: got ${actual}, expected ${expected}`);
  }
}

// ============================================================
// 1. CPP — Chapter 6
//    C = lesser of (max×PM/12 − D) and (0.0595 × (PI − 3500/P))
// ============================================================
console.log('\n=== CPP (Chapter 6) ===');

// Biweekly, PI = $1248 (wages $1200 + 4% vacation), first pay of year
// C = min(4230.45, 0.0595 × (1248 − 3500/26))
// 3500/26 = 134.61538
// 1248 − 134.61538 = 1113.38462
// 0.0595 × 1113.38462 = 66.24638 → 66.25
check('CPP biweekly $1248 PI', calcCPP({ PI: 1248, P: 26, rates }), 66.25);

// Weekly, PI = $600
// 3500/52 = 67.30769; 600 − 67.30769 = 532.69231; ×0.0595 = 31.69519 → 31.70
check('CPP weekly $600 PI', calcCPP({ PI: 600, P: 52, rates }), 31.70);

// YTD cap reached: ytdCPP = 4200, max 4230.45 → only 30.45 left
// gross = 0.0595 × (1248 − 134.615) = 66.246; cap = 4230.45 − 4200 = 30.45
check('CPP near cap (ytd 4200)', calcCPP({ PI: 1248, P: 26, ytdCPP: 4200, rates }), 30.45);

// YTD exceeds cap → 0
check('CPP over cap', calcCPP({ PI: 1248, P: 26, ytdCPP: 4230.45, rates }), 0);

// ============================================================
// 2. CPP2 — Chapter 6 (second additional)
//    Only kicks in once pensionable earnings exceed YMPE ($74,600)
// ============================================================
console.log('\n=== CPP2 (Chapter 6) ===');

// Below YMPE → 0
check('CPP2 below YMPE', calcCPP2({ PI: 1248, PIYTD: 30000, P: 26, rates }), 0);

// PIYTD = 74000, PI = 2000 → earnings in CPP2 band = 74000+2000−74600 = 1400; ×0.04 = 56
check('CPP2 in band', calcCPP2({ PI: 2000, PIYTD: 74000, P: 26, rates }), 56.00);

// At YAMPE ceiling: PIYTD=84000, PI=2000 → 84000+2000−85000=1000 in band, but
// W = max(84000, 74600)=84000; (84000+2000−84000)×0.04 = 2000×0.04=80; cap 416−ytd
// ytdCPP2=0 so cap=416; min(416, 80)=80
check('CPP2 near YAMPE', calcCPP2({ PI: 2000, PIYTD: 84000, P: 26, rates }), 80.00);

// ============================================================
// 3. EI — Chapter 7
//    EI = lesser of (1123.07 − D1) and (0.0163 × IE)
// ============================================================
console.log('\n=== EI (Chapter 7) ===');

// IE = $1248 → 0.0163 × 1248 = 20.3424 → 20.34
check('EI $1248', calcEI({ IE: 1248, rates }), 20.34);

// IE = $600 → 0.0163 × 600 = 9.78 → 9.78
check('EI $600', calcEI({ IE: 600, rates }), 9.78);

// Near cap: ytdEI = 1100, max 1123.07 → 23.07 left; gross 0.0163×1248=20.34 < 23.07
check('EI near cap', calcEI({ IE: 1248, ytdEI: 1100, rates }), 20.34);

// Over cap: ytdEI = 1123.07 → 0
check('EI over cap', calcEI({ IE: 1248, ytdEI: 1123.07, rates }), 0);

// ============================================================
// 4. Overtime split (Alberta: >8/day OR >44/week, greater wins)
// ============================================================
console.log('\n=== Overtime split ===');

// 8 hrs, 0 prior this week → no OT
check('OT 8h day', splitOvertime(8, 0).overtimeHours, 0);

// 10 hrs, 0 prior → 2 daily OT
check('OT 10h day (daily)', splitOvertime(10, 0).overtimeHours, 2);

// 8 hrs, 40 prior this week → total 48, weekly OT = 48−44 = 4; daily OT = 0; greater = 4
check('OT 8h day 40h week (weekly)', splitOvertime(8, 40).overtimeHours, 4);

// 10 hrs, 40 prior → total 50; daily OT=2; weekly OT = 50−44=6, attributable = 10−max(0,44−40)=10−4=6; greater=6
check('OT 10h day 40h week (both)', splitOvertime(10, 40).overtimeHours, 6);

// 5 hrs, 44 prior (already over) → entire 5 hrs is weekly OT; daily OT=0; weekly=5
check('OT 5h day already over 44', splitOvertime(5, 44).overtimeHours, 5);

// ============================================================
// 5. Shift gross (with 1.5× OT and 3-hr minimum)
// ============================================================
console.log('\n=== Shift gross ===');

// 8h at $15, no prior → 8×15 = 120
const s1 = calcShiftGross({ dailyHours: 8, weeklyHoursBefore: 0, rate: 15 });
check('gross 8h reg', s1.gross, 120);
check('gross 8h reg hours', s1.regularHours, 8);

// 10h at $15 → 8 reg + 2 OT; 8×15 + 2×22.50 = 120 + 45 = 165
const s2 = calcShiftGross({ dailyHours: 10, weeklyHoursBefore: 0, rate: 15 });
check('gross 10h (2 OT)', s2.gross, 165);
check('gross 10h OT hours', s2.overtimeHours, 2);

// 2h shift (cut short) → 3-hr minimum: 3 × 15 = 45 (worked pay = 2×15=30, min wins)
const s3 = calcShiftGross({ dailyHours: 2, weeklyHoursBefore: 0, rate: 15, reported: true });
check('gross 2h (3hr min)', s3.gross, 45);

// ============================================================
// 6. FULL PAYCHEQUE — biweekly, Alberta, $15/hr × 80h, 2026
//    Cross-check each line against PDOC.
//
//    Inputs: wages = $1200 (80h × $15), vacation 4% = $48,
//            gross subject to deductions = $1248,
//            P = 26 (biweekly), TC = $16,452 (federal BPA default),
//            TCP = $22,769 (AB BPA default), YTD all 0.
//
//    Hand-computed from T4127 Option 1:
//      CPP  = 66.25
//      EI   = 20.34
//      F5   = 66.25 × (0.01/0.0595) = 11.1345 (per period)
//      A    = 26 × (1248 − 11.1345) = 26 × 1236.8655 = 32158.51
//      Fed: R=0.14, K=0
//        K1 = 0.14 × 16452 = 2303.28
//        baseCPPann = min(26×66.25×(0.0495/0.0595), 3519.45)
//                   = min(26×66.25×0.831933, 3519.45) = min(1433.02, 3519.45) = 1433.02
//        EIann = min(26×20.34, 1123.07) = min(528.84, 1123.07) = 528.84
//        K2 = 0.14×1433.02 + 0.14×528.84 = 200.62 + 74.04 = 274.66
//        K4 = min(0.14×32158.51, 0.14×1501) = min(4502.19, 210.14) = 210.14
//        T3 = 0.14×32158.51 − 0 − 2303.28 − 274.66 − 210.14
//           = 4502.19 − 2788.08 = 1714.11
//        T1 = 1714.11
//      AB: V=0.08, KP=0
//        K1P = 0.08 × 22769 = 1821.52
//        K2P = 0.08×1433.02 + 0.08×528.84 = 114.64 + 42.31 = 156.95
//        K5P = 0 (K1P+K2P = 1978.47 < 4896)
//        T4 = 0.08×32158.51 − 0 − 1821.52 − 156.95 − 0 = 2572.68 − 1978.47 = 594.21
//        T2 = 594.21
//      T = (1714.11 + 594.21)/26 = 2308.32/26 = 88.78
//      vacation = 48.00
//      total deductions = 66.25 + 20.34 + 88.78 = 175.37
//      net = 1248 − 175.37 = 1072.63
// ============================================================
console.log('\n=== Full paycheque (biweekly, AB, $15×80h, 2026) ===');

const pc = calculateDeductionsPure({
  rates,
  grossForPeriod: 1200,   // wages
  P: PAY_PERIODS.biweekly,
  TC: 16452,              // federal BPA default
  TCP: 22769,             // AB BPA default
});

check('gross (wages+vacation)', pc.gross, 1248.00);
check('wages', pc.wages, 1200.00);
check('vacation pay 4%', pc.vacationPay, 48.00);
check('CPP', pc.cpp, 66.25);
check('EI', pc.ei, 20.34);
check('income tax (fed+AB)', pc.fedTax, 88.78);
check('total deductions', pc.totalDeductions, 175.37);
check('net pay', pc.netPay, 1072.63);

// ============================================================
// 7. FULL PAYCHEQUE — weekly, Alberta, $15/hr × 40h, 2026
//    wages = $600, vacation 4% = $24, gross = $624, P = 52
//
//    CPP = 0.0595 × (624 − 3500/52) = 0.0595 × (624 − 67.3077) = 0.0595 × 556.6923 = 33.123 → 33.12
//    EI  = 0.0163 × 624 = 10.1712 → 10.17
//    F5  = 33.12 × 0.168067 = 5.5666
//    A   = 52 × (624 − 5.5666) = 52 × 618.4334 = 32158.54
//      (note: annualized gross ≈ same as biweekly case since 52×624 = 32448 vs 26×1248=32448)
//    Fed: R=0.14
//      K1 = 2303.28
//      baseCPPann = min(52×33.12×0.831933, 3519.45) = min(52×27.555, 3519.45) = min(1432.86, 3519.45) = 1432.86
//      EIann = min(52×10.17, 1123.07) = min(528.84, 1123.07) = 528.84
//      K2 = 0.14×1432.86 + 0.14×528.84 = 200.60 + 74.04 = 274.64
//      K4 = min(0.14×32158.54, 210.14) = 210.14
//      T3 = 0.14×32158.54 − 2303.28 − 274.64 − 210.14 = 4502.20 − 2788.06 = 1714.14
//    AB:
//      K1P = 1821.52
//      K2P = 0.08×1432.86 + 0.08×528.84 = 114.63 + 42.31 = 156.94
//      T4 = 0.08×32158.54 − 1821.52 − 156.94 = 2572.68 − 1978.46 = 594.22
//    T = (1714.14 + 594.22)/52 = 2308.36/52 = 44.39
//    net = 624 − (33.12 + 10.17 + 44.39) = 624 − 87.68 = 536.32
// ============================================================
console.log('\n=== Full paycheque (weekly, AB, $15×40h, 2026) ===');

const pcw = calculateDeductionsPure({
  rates,
  grossForPeriod: 600,
  P: PAY_PERIODS.weekly,
  TC: 16452,
  TCP: 22769,
});

check('weekly gross', pcw.gross, 624.00);
check('weekly CPP', pcw.cpp, 33.12);
check('weekly EI', pcw.ei, 10.17);
check('weekly income tax', pcw.fedTax, 44.39);
check('weekly net pay', pcw.netPay, 536.32);

// ============================================================
// 8. High-earner scenario — biweekly $5000/wages, 2026
//    Tests bracket progression + BPA phase-out + K5P activation.
//    wages = $5000, vacation 4% = $200, gross = $5200, P = 26
//    CPP = 0.0595 × (5200 − 134.615) = 0.0595 × 5065.385 = 301.39 (well under cap)
//    EI  = 0.0163 × 5200 = 84.76
//    F5  = 301.39 × 0.168067 = 50.656
//    A   = 26 × (5200 − 50.656) = 26 × 5149.344 = 133882.94
//    BPAF: A > 181440? No (133883 < 181440) → BPAF = 16452 (full)
//    Fed bracket: A in (117045, 181440] → R=0.26, K=10241
//      T3 = 0.26×133882.94 − 10241 − K1 − K2 − K4
//      K1 = 0.14×16452 = 2303.28
//      baseCPPann = min(26×301.39×0.831933, 3519.45) = min(26×250.737, 3519.45) = min(6519.16, 3519.45) = 3519.45 (capped)
//      EIann = min(26×84.76, 1123.07) = min(2203.76, 1123.07) = 1123.07 (capped)
//      K2 = 0.14×3519.45 + 0.14×1123.07 = 492.72 + 157.23 = 649.95
//      K4 = min(0.14×133882.94, 210.14) = 210.14
//      T3 = 34809.56 − 10241 − 2303.28 − 649.95 − 210.14 = 21405.19
//    AB bracket: A in (61200, 154259] → V=0.10, KP=1224
//      K1P = 1821.52
//      K2P = 0.08×3519.45 + 0.08×1123.07 = 281.56 + 89.85 = 371.41
//      K5P = ((1821.52 + 371.41) − 4896)×0.25 = (2192.93 − 4896)×0.25 = negative → 0
//      T4 = 0.10×133882.94 − 1224 − 1821.52 − 371.41 − 0 = 13388.29 − 3416.93 = 9971.36
//    T = (21405.19 + 9971.36)/26 = 31376.55/26 = 1206.79
//    net = 5200 − (301.39 + 84.76 + 1206.79) = 5200 − 1592.94 = 3607.06
// ============================================================
console.log('\n=== Full paycheque (high earner, biweekly $5000, 2026) ===');

const pch = calculateDeductionsPure({
  rates,
  grossForPeriod: 5000,
  P: PAY_PERIODS.biweekly,
  TC: 16452,
  TCP: 22769,
});

check('high gross', pch.gross, 5200.00);
check('high CPP', pch.cpp, 301.39);
check('high EI', pch.ei, 84.76);
check('high income tax', pch.fedTax, 1206.79);
check('high net pay', pch.netPay, 3607.06);

// ============================================================
// RESULT
// ============================================================
console.log(`\n========================================`);
console.log(`  PASS: ${pass}   FAIL: ${fail}`);
console.log(`========================================`);
if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  ${f.name}: got ${f.actual}, expected ${f.expected}`));
  process.exit(1);
} else {
  console.log('\nAll payroll calculations match T4127 hand-computed values.');
  console.log('NEXT STEP: verify the three sample paycheques above against CRA PDOC');
  console.log('(canada.ca/pdoc) before going live with real payouts.');
  process.exit(0);
}
