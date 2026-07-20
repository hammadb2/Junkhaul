import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { varianceCents, buildActualCost, feedApprovedHoursToPayroll } from '../lib/reconciliation.js';

assert.equal(varianceCents(100, 150), 50, 'variance is actual - estimated');
assert.equal(varianceCents(200, 150), -50, 'negative variance when actual lower');

// buildActualCost should override fuel and rental.
const estimatedCost = {
  breakdown: {
    rental: { total_cents: 10000 },
    fuel: { total_cents: 5000, litres: 10 },
    labor: { total_cents: 8000 },
    disposal: { total_cents: 3000 },
    overhead: { payment_fee_cents: 1000, supplies_cents: 500, total_cents: 1500 },
    total_cost_cents: 25500,
  },
  assumptions: { total_km: 50, total_minutes: 120 },
};

const actual = await buildActualCost({
  estimatedCost,
  actualDistanceKm: 70,
  actualDurationMinutes: 180,
  fuelLitres: 15,
  fuelCostCents: 6500,
  disposalActualCents: 3500,
  rentalInvoiceCents: 11000,
  laborCostCents: 9000,
  paymentFeeCents: 1200,
  suppliesCents: 600,
});

assert.equal(actual.breakdown.rental.total_cents, 11000, 'rental actual overridden');
assert.equal(actual.breakdown.fuel.total_cents, 6500, 'fuel actual overridden');
assert.equal(actual.breakdown.fuel.litres, 15, 'fuel litres updated');
assert.equal(actual.breakdown.labor.total_cents, 9000, 'labor actual overridden');
assert.equal(actual.breakdown.disposal.total_cents, 3500, 'disposal actual overridden');
assert.equal(actual.assumptions.total_km, 70, 'actual km recorded');

// Payroll feed must not allow duplicate locked timesheets.
const fakeClient = {
  _store: new Map(),
  from(table) {
    const store = this._store;
    return {
      select(cols) {
        this.cols = cols;
        return this;
      },
      eq(col, val) {
        this.filter = [col, val];
        return this;
      },
      order(col, { ascending } = {}) { return this; },
      limit(n) { return this; },
      maybeSingle() {
        const key = this.filter?.join(':');
        const rows = store.get(table) || [];
        const found = rows.find((r) => r[this.filter[0]] === this.filter[1]);
        return Promise.resolve({ data: found || null, error: null });
      },
      single() {
        const key = this.filter?.join(':');
        const rows = store.get(table) || [];
        const found = rows.find((r) => r[this.filter[0]] === this.filter[1]);
        return Promise.resolve({ data: found || null, error: found ? null : new Error('not found') });
      },
      update(vals) {
        return {
          eq: (col, val) => {
            const rows = store.get(table) || [];
            const row = rows.find((r) => r[col] === val);
            if (row) Object.assign(row, vals);
            return Promise.resolve({ data: row, error: null });
          },
        };
      },
      insert(rec) {
        const rows = store.get(table) || [];
        const created = Array.isArray(rec) ? rec.map((r) => ({ id: crypto.randomUUID(), ...r })) : [{ id: crypto.randomUUID(), ...rec }];
        store.set(table, rows.concat(created));
        return {
          select: () => Promise.resolve({ data: created, error: null }),
        };
      },
    };
  },
};

fakeClient._store.set('daily_reconciliations', [{ id: 'rec1', status: 'signed_off' }]);
fakeClient._store.set('route_reconciliation_payroll', [{ id: 'link1', timesheet_id: 'ts1', locked: true }]);
fakeClient._store.set('timesheets', [{ id: 'ts1' }]);

try {
  await feedApprovedHoursToPayroll({
    reconciliationId: 'rec1',
    timesheetApprovals: [{ timesheet_id: 'ts1', regular_hours: 8, overtime_hours: 0 }],
    managerId: 'm1',
    client: fakeClient,
  });
  assert.fail('should throw on locked timesheet');
} catch (err) {
  assert.match(err.message, /already locked/, 'duplicate locked timesheet rejected');
}

// New timesheet should be fed successfully.
fakeClient._store.set('timesheets', [{ id: 'ts2' }]);
const links = await feedApprovedHoursToPayroll({
  reconciliationId: 'rec1',
  timesheetApprovals: [{ timesheet_id: 'ts2', regular_hours: 7.5, overtime_hours: 0 }],
  managerId: 'm1',
  payRunId: 'pr1',
  client: fakeClient,
});
assert.equal(links.length, 1, 'new timesheet linked');
assert.equal(links[0].locked, true, 'payroll link locked');

console.log('reconciliation tests passed');
