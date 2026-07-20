import assert from 'node:assert/strict';
import { canTransition } from '../lib/donations.js';

assert.equal(canTransition('submitted', 'evidence_review'), true, 'submitted to evidence_review');
assert.equal(canTransition('submitted', 'listed'), false, 'cannot jump to listed');
assert.equal(canTransition('inspected', 'sellable'), true, 'inspected to sellable');
assert.equal(canTransition('inspected', 'submitted'), false, 'inspected cannot revert to submitted');
assert.equal(canTransition('sellable', 'listed'), true, 'sellable to listed');
assert.equal(canTransition('reject', 'listed'), false, 'reject is terminal');

console.log('donations tests passed');
