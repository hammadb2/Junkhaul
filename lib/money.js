// ============================================================
// MONEY — integer-cent arithmetic.
//
// All persisted money in the cost ledger is stored and computed in cents
// (or basis points for percentages) to avoid binary floating-point drift.
// The few `fromCents` helpers are only for display/API serialization.
// ============================================================

export const CENTS_PER_DOLLAR = 100;

export function toCents(value) {
  if (value === null || value === undefined) return 0;
  if (Number.isInteger(value) && Math.abs(value) >= 100) {
    // Likely already cents if >= 1 dollar; callers should pass dollars for decimals.
    // We still scale explicitly to avoid ambiguity.
  }
  if (Number.isInteger(value)) return value * CENTS_PER_DOLLAR;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * CENTS_PER_DOLLAR);
}

export function fromCents(cents) {
  return Number(cents) / CENTS_PER_DOLLAR;
}

export function centsToDollarsString(cents, decimals = 2) {
  return (Number(cents) / CENTS_PER_DOLLAR).toFixed(decimals);
}

export function addCents(a, b) {
  return Number(a) + Number(b);
}

export function sumCents(values) {
  return values.reduce((s, v) => s + Number(v || 0), 0);
}

export function multiplyCents(cents, factor) {
  return Math.round(Number(cents) * Number(factor));
}

export function divideCents(cents, divisor) {
  if (Number(divisor) === 0) return 0;
  return Math.round(Number(cents) / Number(divisor));
}

export function percentageOfCents(cents, percent) {
  return Math.round((Number(cents) * Number(percent)) / 100);
}

export function roundCents(cents) {
  return Math.round(Number(cents));
}
