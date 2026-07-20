import assert from 'node:assert/strict';

// Audit payload redaction test
const payload = { price: 100, password: 'secret123', api_token: 'abc' };
const redact = (p) => {
  const clone = JSON.parse(JSON.stringify(p));
  const redactKeys = ['password', 'secret', 'token', 'ssn', 'sin', 'credit_card', 'cvv'];
  for (const key of Object.keys(clone)) {
    if (redactKeys.some((r) => key.toLowerCase().includes(r))) clone[key] = '[REDACTED]';
  }
  return clone;
};
const out = redact(payload);
assert.equal(out.password, '[REDACTED]');
assert.equal(out.api_token, '[REDACTED]');
assert.equal(out.price, 100);

console.log('phase 5 tests passed');
