import assert from 'node:assert/strict';
import { tenantFromHost, isRehaulHost, shouldBlockAdminOnRehaul, isAdminPath } from '../lib/rehaul.js';

assert.equal(tenantFromHost('rehaul.junkhaul.ca'), 'rehaul', 'rehaul host resolves');
assert.equal(tenantFromHost('www.junkhaul.ca'), 'junkhaul', 'www host resolves');
assert.equal(tenantFromHost('localhost:3000'), 'junkhaul', 'localhost defaults to junkhaul');
assert.equal(isRehaulHost('rehaul.junkhaul.ca'), true, 'rehaul host detected');
assert.equal(isRehaulHost('www.junkhaul.ca'), false, 'junkhaul host not rehaul');

assert.equal(isAdminPath('/admin'), true, 'admin path');
assert.equal(isAdminPath('/api/admin/bookings'), true, 'api admin path');
assert.equal(isAdminPath('/rehaul'), false, 'rehaul path not admin');

assert.equal(shouldBlockAdminOnRehaul('rehaul.junkhaul.ca', '/admin'), true, 'block admin on rehaul');
assert.equal(shouldBlockAdminOnRehaul('www.junkhaul.ca', '/admin'), false, 'allow admin on junkhaul');
assert.equal(shouldBlockAdminOnRehaul('rehaul.junkhaul.ca', '/rehaul'), false, 'rehaul pages allowed');

// Tenant resolution with fake client.
const fakeClient = {
  _store: { tenants: [{ id: 't1', slug: 'rehaul', host_pattern: 'rehaul.junkhaul.ca' }] },
  from(table) {
    const rows = this._store[table] || [];
    let result = rows;
    const chain = {
      select() { return chain; },
      eq(col, val) {
        result = result.filter((r) => r[col] === val);
        return chain;
      },
      maybeSingle() { return Promise.resolve({ data: result[0] || null, error: null }); },
      single() { return Promise.resolve({ data: result[0] || null, error: null }); },
    };
    return chain;
  },
};

const { getTenantBySlug } = await import('../lib/rehaul.js');
const tenant = await getTenantBySlug('rehaul', fakeClient);
assert.equal(tenant.slug, 'rehaul', 'tenant fetched');

console.log('rehaul tests passed');
