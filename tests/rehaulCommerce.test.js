import assert from 'node:assert/strict';
import { priceFromCost } from '../lib/rehaulListings.js';
import { generateSku } from '../lib/rehaulInventory.js';

const sku = generateSku({ category: 'Chair', donationItemId: 'abc12345-abc1-1234-5678-abcdef123456', inventoryIndex: 1 });
assert.ok(sku.startsWith('CHA-'), 'SKU starts with category code');
assert.ok(sku.includes('abc12345'), 'SKU includes donation item prefix');

assert.equal(priceFromCost({ costCents: 10000, marginFloorPercent: 20 }), 12500, 'price floor 20% margin');
assert.equal(priceFromCost({ costCents: 10000, marginFloorPercent: 20, minPriceCents: 15000 }), 15000, 'min price overrides margin floor');

console.log('rehaul commerce tests passed');
