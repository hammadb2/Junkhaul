// ============================================================
// physicalMeasurements.js
//
// Physical weighing, dimensioning and device calibration service.
//
// - Supports portable scales, platform scales, tape, laser and phone-app
//   measurements.
// - Stores corrections as new rows linked to originals (originals retained).
// - Compares physical measurements against AI predicted ranges and raises
//   quality events on misses.
// - Warns when a device is out of calibration.
// ============================================================

import { supabaseAdmin } from './supabase.js';

export async function createMeasurementDevice({ name, deviceId, deviceType, measurementType = [], tolerancePercent = 2, calibrationDueDate, client = supabaseAdmin }) {
  const { data, error } = await client.from('measurement_devices').insert({
    name,
    device_id: deviceId,
    device_type: deviceType,
    measurement_type: measurementType,
    tolerance_percent: tolerancePercent,
    calibration_due_date: calibrationDueDate,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function recordCalibration({ deviceId, calibratedAt, calibrationDueDate, performedBy, notes, certificateUrl, client = supabaseAdmin }) {
  const { data, error } = await client.from('calibration_records').insert({
    device_id: deviceId,
    calibrated_at: calibratedAt,
    calibration_due_date: calibrationDueDate,
    performed_by: performedBy,
    notes,
    certificate_url: certificateUrl,
  }).select().single();
  if (error) throw error;

  // Update the device calibration due date.
  await client.from('measurement_devices').update({ calibration_due_date: calibrationDueDate }).eq('id', deviceId);
  return data;
}

export async function getDeviceCalibrationStatus(deviceIdOrDeviceRow, client = supabaseAdmin) {
  const device = typeof deviceIdOrDeviceRow === 'object' ? deviceIdOrDeviceRow : null;
  if (!device) {
    const { data } = await client.from('measurement_devices').select('*').eq('id', deviceIdOrDeviceRow).single();
    if (!data) throw new Error('Device not found');
    return getDeviceCalibrationStatus(data, client);
  }
  const due = device.calibration_due_date ? new Date(device.calibration_due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = due ? Math.ceil((due - today) / (1000 * 60 * 60 * 24)) : null;
  const status = !due ? 'unknown' : daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'warning' : 'ok';
  return { status, daysUntil, dueDate: due?.toISOString() };
}

function aiRangeFor(observationId, client) {
  return client
    .from('item_estimates')
    .select('weight_min_kg, weight_max_kg')
    .eq('observation_id', observationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .then(({ data }) => data || null);
}

export async function recordPhysicalMeasurement({
  observationId,
  bookingId,
  deviceId,
  operatorId,
  measurementType,
  weightKg,
  lengthCm,
  widthCm,
  heightCm,
  units = 'metric',
  photoUrl,
  reason,
  client = supabaseAdmin,
}) {
  const { data: device } = await client.from('measurement_devices').select('*').eq('device_id', deviceId).single();
  if (!device) throw new Error(`Measurement device ${deviceId} not found`);

  const calStatus = await getDeviceCalibrationStatus(device, client);
  if (calStatus.status === 'expired') {
    throw new Error(`Device ${deviceId} calibration expired on ${calStatus.dueDate}`);
  }

  const tolerance = device.tolerance_percent || 0;

  const insert = {
    observation_id: observationId,
    booking_id: bookingId,
    device_id: deviceId,
    operator_id: operatorId,
    measured_at: new Date().toISOString(),
    measurement_type: measurementType,
    weight_kg: weightKg,
    length_cm: lengthCm,
    width_cm: widthCm,
    height_cm: heightCm,
    units,
    tolerance_percent: tolerance,
    photo_url: photoUrl,
    reason,
  };

  const { data: measurement, error } = await client.from('physical_measurements').insert(insert).select().single();
  if (error) throw error;

  // Compare against AI range and raise quality events.
  const events = [];
  const ai = observationId ? await aiRangeFor(observationId, client) : null;
  if (ai && weightKg !== null && weightKg !== undefined) {
    const min = Number(ai.weight_min_kg || 0);
    const max = Number(ai.weight_max_kg || Infinity);
    const tol = tolerance / 100;
    const tolMin = min * (1 - tol);
    const tolMax = max * (1 + tol);
    if (weightKg < tolMin) {
      events.push({
        measurement_id: measurement.id,
        observation_id: observationId,
        event_type: 'ai_underestimate',
        severity: 'medium',
        ai_min_kg: min,
        ai_max_kg: max,
        physical_kg: weightKg,
        description: `Physical weight ${weightKg} kg is below AI range ${min}-${max} kg (with ±${tolerance}% tolerance).`,
      });
    } else if (weightKg > tolMax) {
      events.push({
        measurement_id: measurement.id,
        observation_id: observationId,
        event_type: 'ai_overestimate',
        severity: 'medium',
        ai_min_kg: min,
        ai_max_kg: max,
        physical_kg: weightKg,
        description: `Physical weight ${weightKg} kg is above AI range ${min}-${max} kg (with ±${tolerance}% tolerance).`,
      });
    }
  }

  if (calStatus.status === 'warning') {
    events.push({
      measurement_id: measurement.id,
      observation_id,
      event_type: 'out_of_calibration',
      severity: 'low',
      description: `Device ${deviceId} calibration expires in ${calStatus.daysUntil} days.`,
    });
  }

  if (events.length > 0) {
    await client.from('measurement_quality_events').insert(events);
  }

  return { measurement, events };
}

export async function correctMeasurement({
  measurementId,
  correctedBy,
  correctionReason,
  updates = {},
  client = supabaseAdmin,
}) {
  const { data: original } = await client.from('physical_measurements').select('*').eq('id', measurementId).single();
  if (!original) throw new Error('Measurement not found');

  const corrected = {
    ...original,
    id: undefined,
    original_measurement_id: original.id,
    corrected_by: correctedBy,
    corrected_at: new Date().toISOString(),
    correction_reason: correctionReason,
    is_correction: true,
    measured_at: new Date().toISOString(),
    ...updates,
  };
  delete corrected.id;

  const { data, error } = await client.from('physical_measurements').insert(corrected).select().single();
  if (error) throw error;

  // Re-run quality comparison on the corrected value without inserting a duplicate.
  const ai = data.observation_id ? await aiRangeFor(data.observation_id, client) : null;
  const { data: device } = await client.from('measurement_devices').select('*').eq('device_id', data.device_id).single();
  const newEvents = [];
  if (ai && device && data.weight_kg !== null && data.weight_kg !== undefined) {
    const min = Number(ai.weight_min_kg || 0);
    const max = Number(ai.weight_max_kg || Infinity);
    const tol = (device.tolerance_percent || 0) / 100;
    if (data.weight_kg < min * (1 - tol)) {
      newEvents.push({
        measurement_id: data.id,
        observation_id: data.observation_id,
        event_type: 'ai_underestimate',
        severity: 'medium',
        ai_min_kg: min,
        ai_max_kg: max,
        physical_kg: data.weight_kg,
        description: `Corrected physical weight ${data.weight_kg} kg is below AI range ${min}-${max} kg.`,
      });
    } else if (data.weight_kg > max * (1 + tol)) {
      newEvents.push({
        measurement_id: data.id,
        observation_id: data.observation_id,
        event_type: 'ai_overestimate',
        severity: 'medium',
        ai_min_kg: min,
        ai_max_kg: max,
        physical_kg: data.weight_kg,
        description: `Corrected physical weight ${data.weight_kg} kg is above AI range ${min}-${max} kg.`,
      });
    }
  }
  if (newEvents.length > 0) {
    await client.from('measurement_quality_events').insert(newEvents);
  }

  return { corrected: data, original, events: newEvents };
}

export async function getMeasurementsForBooking(bookingId, client = supabaseAdmin) {
  const { data, error } = await client
    .from('physical_measurements')
    .select('*, measurement_devices(name, device_type, tolerance_percent)')
    .eq('booking_id', bookingId)
    .order('measured_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCalibrationWarnings(client = supabaseAdmin) {
  const { data } = await client.from('measurement_devices').select('*').eq('is_active', true);
  const warnings = [];
  for (const device of data || []) {
    const status = await getDeviceCalibrationStatus(device, client);
    if (status.status === 'expired' || status.status === 'warning') {
      warnings.push({ device, ...status });
    }
  }
  return warnings;
}
