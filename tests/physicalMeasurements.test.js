import assert from 'node:assert/strict';
import { getDeviceCalibrationStatus } from '../lib/physicalMeasurements.js';

const today = new Date();
const past = new Date(today); past.setDate(today.getDate() - 5);
const soon = new Date(today); soon.setDate(today.getDate() + 3);
const future = new Date(today); future.setDate(today.getDate() + 30);

const expired = await getDeviceCalibrationStatus({ calibration_due_date: past.toISOString().split('T')[0] });
assert.equal(expired.status, 'expired', 'past due date is expired');

const warning = await getDeviceCalibrationStatus({ calibration_due_date: soon.toISOString().split('T')[0] });
assert.equal(warning.status, 'warning', 'within 7 days is warning');

const ok = await getDeviceCalibrationStatus({ calibration_due_date: future.toISOString().split('T')[0] });
assert.equal(ok.status, 'ok', 'future date is ok');

const unknown = await getDeviceCalibrationStatus({});
assert.equal(unknown.status, 'unknown', 'no due date is unknown');

console.log('physicalMeasurements tests passed');
