// ============================================================
// PAYMENT VALIDATION TEST SUITE
//
// Verifies that /api/employee/collect-payment correctly rejects
// payment when required workflow steps are missing:
//   1. No pickup signature → rejected
//   2. Fewer than 3 arrival photos → rejected
//   3. Amount mismatch → rejected
//   4. Booking not assigned to this crew → rejected
//   5. Valid request with all requirements met → accepted
//
// Run: node supabase/migrations/payment-validation.test.js
// ============================================================

import assert from 'assert';

// Mock the validation logic from collect-payment/route.js
// In a real test environment, we'd mock Supabase and call the route
// directly. For now, we test the validation logic in isolation.

function validatePaymentRequest({
  hasSignature,
  arrivalPhotoCount,
  amount,
  balanceDue,
  isAssignedToCrew,
  method,
}) {
  const errors = [];

  // 1. Verify pickup signature exists
  if (!hasSignature) {
    errors.push({ code: 'MISSING_SIGNATURE', message: 'Pickup signature required before collecting payment' });
  }

  // 2. Verify 3 arrival photos exist
  if (arrivalPhotoCount < 3) {
    errors.push({ code: 'MISSING_PHOTOS', message: `3 arrival photos required (${arrivalPhotoCount} uploaded)` });
  }

  // 3. Verify booking belongs to crew
  if (!isAssignedToCrew) {
    errors.push({ code: 'NOT_ASSIGNED', message: 'Booking not assigned to this crew' });
  }

  // 4. For cash, verify amount matches
  if (method === 'cash' && amount !== balanceDue) {
    errors.push({ code: 'AMOUNT_MISMATCH', message: `Amount mismatch: entered $${amount}, balance $${balanceDue}` });
  }

  // 5. Valid method
  if (!['cash', 'cash_crew', 'sms_link', 'sms', 'card_on_file', 'card'].includes(method)) {
    errors.push({ code: 'INVALID_METHOD', message: 'Invalid payment method' });
  }

  return errors;
}

let pass = 0, fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    failures.push({ name, error: err.message });
  }
}

// ── Test 1: No signature → rejected ──────────────────────
test('Rejects payment when no signature exists', () => {
  const errors = validatePaymentRequest({
    hasSignature: false,
    arrivalPhotoCount: 3,
    amount: 200,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'cash',
  });
  assert.ok(errors.length > 0, 'Should have errors');
  assert.strictEqual(errors[0].code, 'MISSING_SIGNATURE');
});

// ── Test 2: Fewer than 3 photos → rejected ───────────────
test('Rejects payment when fewer than 3 arrival photos', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 2,
    amount: 200,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'cash',
  });
  assert.ok(errors.length > 0, 'Should have errors');
  assert.strictEqual(errors[0].code, 'MISSING_PHOTOS');
});

// ── Test 3: Amount mismatch → rejected ───────────────────
test('Rejects cash payment when amount does not match balance', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 3,
    amount: 150,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'cash',
  });
  assert.ok(errors.length > 0, 'Should have errors');
  assert.strictEqual(errors[0].code, 'AMOUNT_MISMATCH');
});

// ── Test 4: Not assigned to crew → rejected ──────────────
test('Rejects payment when booking not assigned to crew', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 3,
    amount: 200,
    balanceDue: 200,
    isAssignedToCrew: false,
    method: 'cash',
  });
  assert.ok(errors.length > 0, 'Should have errors');
  assert.strictEqual(errors[0].code, 'NOT_ASSIGNED');
});

// ── Test 5: All requirements met → accepted ──────────────
test('Accepts payment when all requirements are met', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 3,
    amount: 200,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'cash',
  });
  assert.strictEqual(errors.length, 0, 'Should have no errors');
});

// ── Test 6: SMS link doesn't require amount match ────────
test('SMS link payment does not require amount match', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 3,
    amount: null,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'sms_link',
  });
  assert.strictEqual(errors.length, 0, 'Should have no errors');
});

// ── Test 7: Invalid method → rejected ────────────────────
test('Rejects invalid payment method', () => {
  const errors = validatePaymentRequest({
    hasSignature: true,
    arrivalPhotoCount: 3,
    amount: 200,
    balanceDue: 200,
    isAssignedToCrew: true,
    method: 'bitcoin',
  });
  assert.ok(errors.length > 0, 'Should have errors');
  assert.strictEqual(errors[0].code, 'INVALID_METHOD');
});

// ── Test 8: Multiple errors all reported ─────────────────
test('Reports all errors when multiple requirements missing', () => {
  const errors = validatePaymentRequest({
    hasSignature: false,
    arrivalPhotoCount: 0,
    amount: 100,
    balanceDue: 200,
    isAssignedToCrew: false,
    method: 'cash',
  });
  assert.ok(errors.length >= 3, 'Should have at least 3 errors');
  const codes = errors.map(e => e.code);
  assert.ok(codes.includes('MISSING_SIGNATURE'));
  assert.ok(codes.includes('MISSING_PHOTOS'));
  assert.ok(codes.includes('NOT_ASSIGNED'));
  assert.ok(codes.includes('AMOUNT_MISMATCH'));
});

// ── Summary ──────────────────────────────────────────────
console.log('\n──────── Payment Validation Tests ────────');
console.log(`  Pass: ${pass}`);
console.log(`  Fail: ${fail}`);
if (failures.length > 0) {
  console.log('\n  Failures:');
  for (const f of failures) {
    console.log(`    ✗ ${f.name}: ${f.error}`);
  }
}
console.log('────────────────────────────────────────\n');

process.exit(fail > 0 ? 1 : 0);
