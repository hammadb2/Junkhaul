import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const dbUrl = process.env.TEST_SUPABASE_DB_URL || process.env.TEST_DATABASE_URL;
const supabaseUrl = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const testEnvironment = process.env.TEST_ENVIRONMENT;
const testProjectRef = process.env.TEST_PROJECT_REF;
const approvedProjectRef = process.env.APPROVED_TEST_PROJECT_REF;
const allowReset = process.env.ALLOW_TEST_DATABASE_RESET === 'true';
const allowRemote = process.env.ALLOW_REMOTE_TEST_DATABASE === 'true';
const allowApprovedProjectCredentials = process.env.ALLOW_APPROVED_PROJECT_CREDENTIALS === 'true';

function notRun(message) {
  console.error(JSON.stringify({
    ok: false,
    status: 'NOT_RUN',
    reason: message,
    required_env: [
      'TEST_ENVIRONMENT=staging|local',
      'TEST_PROJECT_REF and APPROVED_TEST_PROJECT_REF with matching non-production project ref',
      'TEST_SUPABASE_URL',
      'TEST_SUPABASE_SERVICE_ROLE_KEY',
      'TEST_DATABASE_URL or TEST_SUPABASE_DB_URL',
      'ALLOW_TEST_DATABASE_RESET=true',
      'ALLOW_REMOTE_TEST_DATABASE=true for remote disposable Supabase only',
    ],
  }, null, 2));
  process.exit(2);
}

if (!dbUrl && !supabaseUrl && !serviceKey) {
  notRun('No staging/local Supabase integration environment was provided.');
}

// Same production-identifier deny list as tests/integration/foundation.integration.js.
// Rehaul commerce tests inject failing triggers and race conditions directly against
// the connected database — running this against production would be destructive.
const denyFragments = [
  'mvsopvphpuucrbuqsfky',
  'aws-0-us-east-1.pooler.supabase.com',
  'supabase.com/dashboard/project/mvsopvphpuucrbuqsfky',
];
for (const value of [dbUrl, supabaseUrl, testProjectRef, approvedProjectRef].filter(Boolean)) {
  if (!allowApprovedProjectCredentials && denyFragments.some((fragment) => String(value).includes(fragment))) {
    throw new Error('Refusing to run integration tests against known production Supabase identifiers.');
  }
}

assert.ok(['staging', 'local'].includes(testEnvironment), 'TEST_ENVIRONMENT must be staging or local.');
assert.ok(testProjectRef && approvedProjectRef && testProjectRef === approvedProjectRef, 'TEST_PROJECT_REF must match APPROVED_TEST_PROJECT_REF.');
assert.equal(allowReset, true, 'ALLOW_TEST_DATABASE_RESET=true is required for integration tests.');
assert.ok(dbUrl, 'TEST_DATABASE_URL or TEST_SUPABASE_DB_URL is required.');
assert.ok(supabaseUrl, 'TEST_SUPABASE_URL is required.');
assert.ok(serviceKey, 'TEST_SUPABASE_SERVICE_ROLE_KEY is required.');
if (/supabase\.(co|com)/i.test(dbUrl + supabaseUrl) && !allowRemote) {
  throw new Error('Remote Supabase integration tests require ALLOW_REMOTE_TEST_DATABASE=true and a disposable/staging project.');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function psql(args, input = null) {
  const result = spawnSync('psql', [dbUrl, ...args], {
    input,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`psql failed (${args.join(' ')}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

const runId = `rehaul_it_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
const tenantId = crypto.randomUUID();
const inventoryItemA = crypto.randomUUID();
const listingA = crypto.randomUUID();
const cartA = crypto.randomUUID();
const cartB = crypto.randomUUID();
const inventoryItemC = crypto.randomUUID();
const listingC = crypto.randomUUID();
const cartC = crypto.randomUUID();

async function cleanup() {
  try { psql(['-v', 'ON_ERROR_STOP=1', '-c', 'DROP TRIGGER IF EXISTS test_fail_order_audit ON audit_events; DROP FUNCTION IF EXISTS test_inject_audit_failure();']); } catch {}
  try { await supabase.from('tenants').delete().eq('id', tenantId); } catch {}
}

await cleanup();

try {
  psql(['-v', 'ON_ERROR_STOP=1'], `
    INSERT INTO tenants (id, slug, name, host_pattern, canonical_domain, brand_name)
    VALUES ('${tenantId}', '${runId}', '${runId} test tenant', '${runId}.local', '${runId}.local', 'Rehaul');

    INSERT INTO inventory_items (id, tenant_id, sku, title, status)
    VALUES ('${inventoryItemA}', '${tenantId}', '${runId}-A', 'Race Test Item', 'ready');
    INSERT INTO rehaul_listings (id, tenant_id, inventory_item_id, title, slug, listed_price_cents, status)
    VALUES ('${listingA}', '${tenantId}', '${inventoryItemA}', 'Race Test Item', '${runId}-a', 24900, 'published');
    INSERT INTO rehaul_carts (id, tenant_id, status) VALUES
      ('${cartA}', '${tenantId}', 'active'),
      ('${cartB}', '${tenantId}', 'active');

    INSERT INTO inventory_items (id, tenant_id, sku, title, status)
    VALUES ('${inventoryItemC}', '${tenantId}', '${runId}-C', 'Atomicity Test Item', 'ready');
    INSERT INTO rehaul_listings (id, tenant_id, inventory_item_id, title, slug, listed_price_cents, status)
    VALUES ('${listingC}', '${tenantId}', '${inventoryItemC}', 'Atomicity Test Item', '${runId}-c', 18900, 'published');
    INSERT INTO rehaul_carts (id, tenant_id, status) VALUES ('${cartC}', '${tenantId}', 'active');
  `);

  // --- Test 1: two simultaneous customers race for the same inventory item.
  // Exactly one must succeed; the loser must be cleanly rejected, and the database
  // must end up with exactly one active reservation, not zero and not two.
  const [resultA, resultB] = await Promise.all([
    supabase.rpc('rehaul_reserve_listing_in_cart', { p_cart_id: cartA, p_listing_id: listingA }),
    supabase.rpc('rehaul_reserve_listing_in_cart', { p_cart_id: cartB, p_listing_id: listingA }),
  ]);
  assert.equal(resultA.error, null, `Reservation A RPC errored: ${resultA.error?.message}`);
  assert.equal(resultB.error, null, `Reservation B RPC errored: ${resultB.error?.message}`);
  const outcomes = [resultA.data, resultB.data];
  const winners = outcomes.filter((o) => o.ok === true);
  const losers = outcomes.filter((o) => o.ok === false);
  assert.equal(winners.length, 1, `Expected exactly one winner, got ${winners.length}: ${JSON.stringify(outcomes)}`);
  assert.equal(losers.length, 1, `Expected exactly one loser, got ${losers.length}: ${JSON.stringify(outcomes)}`);

  const activeReservations = psql(['-Atc', `select count(*) from rehaul_inventory_reservations where inventory_item_id = '${inventoryItemA}' and released_at is null`]).trim();
  assert.equal(activeReservations, '1', `Expected exactly one active reservation after concurrent race, found ${activeReservations}.`);
  const cartItemCount = psql(['-Atc', `select count(*) from rehaul_cart_items where listing_id = '${listingA}'`]).trim();
  assert.equal(cartItemCount, '1', `Expected exactly one cart_item row after concurrent race, found ${cartItemCount}.`);
  const inventoryStatus = psql(['-Atc', `select status from inventory_items where id = '${inventoryItemA}'`]).trim();
  assert.equal(inventoryStatus, 'reserved', 'Winning reservation must flip inventory to reserved.');

  // Idempotent re-call by the winning cart (e.g. a double-clicked Add to Cart) must not
  // create a duplicate reservation and must return the same reservation id.
  const winnerCartId = resultA.data.ok ? cartA : cartB;
  const idempotentRetry = await supabase.rpc('rehaul_reserve_listing_in_cart', { p_cart_id: winnerCartId, p_listing_id: listingA });
  assert.equal(idempotentRetry.error, null);
  assert.equal(idempotentRetry.data.ok, true);
  assert.equal(idempotentRetry.data.idempotent, true, 'Re-reserving from the same cart must be reported as idempotent.');
  const reservationCountAfterRetry = psql(['-Atc', `select count(*) from rehaul_inventory_reservations where inventory_item_id = '${inventoryItemA}'`]).trim();
  assert.equal(reservationCountAfterRetry, '1', 'Idempotent retry must not create a second reservation row.');

  // --- Test 2: failure injection during order creation must leave zero partial records.
  // Reserve legitimately through the real RPC first, exactly like a real checkout would.
  const reserveForOrder = await supabase.rpc('rehaul_reserve_listing_in_cart', { p_cart_id: cartC, p_listing_id: listingC });
  assert.equal(reserveForOrder.error, null);
  assert.equal(reserveForOrder.data.ok, true, 'Setup reservation for atomicity test must succeed.');

  // Inject a hard failure at the very last step of rehaul_create_order_from_cart
  // (the audit_events insert), which runs only after the order row, order_items row,
  // and reservation conversion have already happened inside the function body. If
  // Postgres's implicit transaction wrapping is broken, this failure would still leave
  // the order/order_items/reservation-conversion committed as partial state.
  psql(['-v', 'ON_ERROR_STOP=1'], `
    CREATE OR REPLACE FUNCTION test_inject_audit_failure() RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.event_type = 'rehaul.order.created' THEN
        RAISE EXCEPTION 'INJECTED_FAILURE: simulated audit-write failure after order/items/reservation already staged';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER test_fail_order_audit
      BEFORE INSERT ON audit_events
      FOR EACH ROW EXECUTE FUNCTION test_inject_audit_failure();
  `);

  const failedOrder = await supabase.rpc('rehaul_create_order_from_cart', {
    p_cart_id: cartC,
    p_delivery_address: { line1: '123 Test St' },
    p_delivery_fee_cents: 5000,
    p_tax_cents: 0,
    p_tax_rate: 0,
    p_tax_config_version_id: null,
    p_tax_evidence_snapshot: {},
    p_final_sale_version: 'v1',
  });
  assert.notEqual(failedOrder.error, null, 'Order creation must fail when the injected audit-write failure fires.');
  assert.match(failedOrder.error.message, /INJECTED_FAILURE/, `Expected the injected failure to surface, got: ${failedOrder.error?.message}`);

  psql(['-v', 'ON_ERROR_STOP=1', '-c', 'DROP TRIGGER IF EXISTS test_fail_order_audit ON audit_events; DROP FUNCTION IF EXISTS test_inject_audit_failure();']);

  const ordersAfterFailure = psql(['-Atc', `select count(*) from rehaul_orders where cart_id = '${cartC}'`]).trim();
  assert.equal(ordersAfterFailure, '0', `Failed order creation must leave zero rehaul_orders rows, found ${ordersAfterFailure}.`);
  const orderItemsAfterFailure = psql(['-Atc', `select count(*) from rehaul_order_items oi join rehaul_orders o on o.id = oi.order_id where o.cart_id = '${cartC}'`]).trim();
  assert.equal(orderItemsAfterFailure, '0', 'Failed order creation must leave zero rehaul_order_items rows.');
  const cartStatusAfterFailure = psql(['-Atc', `select status from rehaul_carts where id = '${cartC}'`]).trim();
  assert.equal(cartStatusAfterFailure, 'active', 'Failed order creation must not convert the cart.');
  const reservationAfterFailure = psql(['-Atc', `select cart_id, order_id, (released_at is null) as active from rehaul_inventory_reservations where inventory_item_id = '${inventoryItemC}'`]).trim();
  const [resCartId, resOrderId, resActive] = reservationAfterFailure.split('|');
  assert.equal(resCartId, cartC, 'Failed order creation must leave the reservation attached to the cart, not converted.');
  assert.equal(resOrderId, '', 'Failed order creation must not attach the reservation to any order.');
  assert.equal(resActive, 't', 'Failed order creation must leave the reservation active (not released).');
  const inventoryStatusAfterFailure = psql(['-Atc', `select status from inventory_items where id = '${inventoryItemC}'`]).trim();
  assert.equal(inventoryStatusAfterFailure, 'reserved', 'Failed order creation must not change inventory status.');
  const auditEventsAfterFailure = psql(['-Atc', `select count(*) from audit_events where event_type = 'rehaul.order.created' and after_state->>'order_id' in (select id::text from rehaul_orders where cart_id = '${cartC}')`]).trim();
  assert.equal(auditEventsAfterFailure, '0', 'Failed order creation must not leave an order.created audit event.');

  console.log(JSON.stringify({
    ok: true,
    status: 'PASSED',
    test_environment: testEnvironment,
    test_project_ref: testProjectRef,
    workflows: {
      concurrent_reservation_exactly_one_winner: 'PASSED',
      reservation_idempotent_retry: 'PASSED',
      order_creation_atomic_on_injected_failure: 'PASSED',
    },
  }, null, 2));
} finally {
  await cleanup();
}
