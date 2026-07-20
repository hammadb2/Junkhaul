import assert from 'node:assert/strict';
import { hashIdempotencyKey, checkIdempotency, validateSessionToken, issueSessionToken } from '../lib/crewSync.js';

// Hash should be deterministic and 64 hex chars (sha256).
const h1 = hashIdempotencyKey('same-key');
const h2 = hashIdempotencyKey('same-key');
assert.equal(h1, h2, 'idempotency hash is deterministic');
assert.match(h1, /^[a-f0-9]{64}$/, 'hash is 64 hex chars');
assert.notEqual(hashIdempotencyKey('key-a'), hashIdempotencyKey('key-b'), 'different keys produce different hashes');

// Fake supabase client for idempotency check.
const fakeClient = {
  _store: new Map(),
  from(table) {
    const store = this._store;
    return {
      select() { return this; },
      eq(col, val) {
        this.match = [table, col, val];
        return this;
      },
      maybeSingle() {
        const key = this.match?.[2];
        return Promise.resolve({ data: store.get(`${table}:${key}`) || null, error: null });
      },
      insert(rec) {
        const id = `${table}:${rec.token_hash || rec.key || rec.id || Date.now()}`;
        store.set(id, rec);
        return { select: () => ({ single: () => Promise.resolve({ data: rec, error: null }) }) };
      },
      update() { return { eq: () => Promise.resolve({ data: null, error: null }) }; },
    };
  },
};

const first = await checkIdempotency({ key: 'k1', employeeId: 'e1', actionType: 'loaded_item', payload: { x: 1 }, client: fakeClient });
assert.equal(first.isDuplicate, false, 'first idempotency check is not duplicate');

const second = await checkIdempotency({ key: 'k1', employeeId: 'e1', actionType: 'loaded_item', payload: { x: 1 }, client: fakeClient });
assert.equal(second.isDuplicate, true, 'second check with same key is duplicate');

// Session token issue and validate with fake.
const { token, record } = await issueSessionToken({ employeeId: 'e1', deviceId: 'd1', scope: ['crew:read'], expiresInHours: 1, client: fakeClient });
assert.ok(token.length > 20, 'token issued');
assert.deepEqual(record.scope, ['crew:read'], 'scope stored');

const valid = await validateSessionToken(token, 'crew:read', fakeClient);
assert.equal(valid.valid, true, 'valid token passes');

const missing = await validateSessionToken('bad-token', null, fakeClient);
assert.equal(missing.valid, false, 'bad token invalid');

console.log('crewSync tests passed');
