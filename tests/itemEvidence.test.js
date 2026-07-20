import assert from 'node:assert/strict';
import { buildCapturePrompt, detectPhotoIssues, matchCatalogItem } from '../lib/itemEvidence.js';

// matchCatalogItem maps fuzzy names to catalog keys.
assert.equal(matchCatalogItem('large sectional sofa'), 'sectionals', 'sectional keyword matched');
assert.equal(matchCatalogItem('old washer and dryer'), 'washer', 'washer keyword matched');
assert.equal(matchCatalogItem('boxes of books'), 'boxes_small', 'boxes keyword matched');
assert.equal(matchCatalogItem('xyz unknown thing'), null, 'unknown item returns null');

// buildCapturePrompt returns the missing stages with instructions.
const full = buildCapturePrompt(null, []);
assert.ok(full.length > 0, 'full prompt list returned');
assert.ok(full.some((p) => p.stage === 'full_item'), 'full_item stage present');

const remaining = buildCapturePrompt(null, ['full_item', 'context']);
assert.ok(!remaining.some((p) => p.stage === 'full_item'), 'completed stages omitted');
assert.ok(remaining.some((p) => p.stage === 'label'), 'label stage still requested');

// detectPhotoIssues flags blur, glare and darkness.
const issues = detectPhotoIssues({ blur_score: 0.2, glare_score: 0.8, darkness_score: 0.3 });
assert.equal(issues.length, 2, 'blur and glare issues flagged');
assert.ok(issues.some((i) => i.type === 'blur'), 'blur issue present');
assert.ok(issues.some((i) => i.type === 'glare'), 'glare issue present');

console.log('itemEvidence tests passed');
