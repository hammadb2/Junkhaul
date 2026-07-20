import assert from 'node:assert/strict';
import { inRange } from '../lib/aiQuality.js';

assert.equal(inRange(15, 10, 20), true, 'actual inside range');
assert.equal(inRange(25, 10, 20), false, 'actual above range');
assert.equal(inRange(null, 10, 20), true, 'null actual treated as in range');
assert.equal(inRange(5, 10, 20), false, 'actual below range');

console.log('aiQuality tests passed');
