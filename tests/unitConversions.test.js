import assert from 'node:assert/strict';
import {
  milesToKm,
  kmToMiles,
  usGallonsToLitres,
  litresToUsGallons,
  tonnesToKg,
  kgToTonnes,
  roundCurrency,
  roundToNearest,
  fuelCostPerKm,
  priceFromMargin,
  KM_PER_MILE,
} from '../lib/unitConversions.js';

assert.equal(roundCurrency(milesToKm(1), 6), KM_PER_MILE);
assert.equal(roundCurrency(kmToMiles(KM_PER_MILE), 6), 1);

assert.equal(roundCurrency(usGallonsToLitres(1), 6), 3.785412);
assert.equal(roundCurrency(litresToUsGallons(3.785411784), 6), 1);

assert.equal(tonnesToKg(1), 1000);
assert.equal(kgToTonnes(1500), 1.5);

assert.equal(roundCurrency(2.279, 2), 2.28);
assert.equal(roundCurrency(2.5, 0), 3);
assert.equal(roundToNearest(127, 5), 125);
assert.equal(roundToNearest(128, 5), 130);

// Regression: $2.40/mile ≈ $1.491/km
const perMile = 2.40;
const perKm = perMile / KM_PER_MILE;
assert.equal(roundCurrency(perKm, 3), 1.491, '$2.40/mile must resolve to approximately $1.491/km');

// Regression: 45 L/100 km × $1.75/L = $0.7875/km
assert.equal(fuelCostPerKm({ lPer100km: 45, pricePerLitre: 1.75 }), 0.7875, '45 L/100km at $1.75/L must be $0.7875/km');

// Target 20% margin: price = cost / (1 - 0.20), not cost * 1.20.
assert.equal(priceFromMargin({ cost: 100, marginPercent: 20 }), 125);
assert.equal(priceFromMargin({ cost: 200, marginPercent: 20 }), 250);

console.log('unitConversions tests passed');
