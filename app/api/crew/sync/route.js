import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import {
  checkIdempotency,
  setIdempotencyResponse,
  recordOfflineAction,
  updateOfflineActionStatus,
  recordSyncConflict,
} from '@/lib/crewSync';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// POST /api/crew/sync
// Replay a batch of offline actions with idempotency keys.
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const actions = body.actions || [];
  const clientRouteVersion = body.route_version;
  const results = [];

  for (const action of actions) {
    const idempotencyKey = action.idempotency_key || `${employee.id}:${action.type}:${Date.now()}`;
    let offlineActionId = action.offline_action_id;
    if (!offlineActionId) {
      const rec = await recordOfflineAction({ employeeId: employee.id, idempotencyKey, actionType: action.type, payload: action.payload });
      offlineActionId = rec.id;
    }

    const idem = await checkIdempotency({ key: idempotencyKey, employeeId: employee.id, actionType: action.type, payload: action.payload });
    if (idem.isDuplicate) {
      await updateOfflineActionStatus({ actionId: offlineActionId, status: 'synced', serverResponse: idem.response });
      results.push({ idempotency_key: idempotencyKey, status: 'synced', duplicate: true, response: idem.response });
      continue;
    }

    // Route version conflict detection.
    if (clientRouteVersion && action.route_plan_id) {
      const { data: plan } = await supabaseAdmin.from('route_plans').select('route_version').eq('id', action.route_plan_id).maybeSingle();
      if (plan && plan.route_version > clientRouteVersion) {
        await recordSyncConflict({ employeeId: employee.id, offlineActionId, actionType: action.type, clientVersion: clientRouteVersion, serverVersion: plan.route_version, payload: action.payload });
        await updateOfflineActionStatus({ actionId: offlineActionId, status: 'conflict' });
        results.push({ idempotency_key: idempotencyKey, status: 'conflict', server_version: plan.route_version });
        continue;
      }
    }

    try {
      const result = await processAction(action.type, action.payload, employee);
      await setIdempotencyResponse({ key: idempotencyKey, response: result });
      await updateOfflineActionStatus({ actionId: offlineActionId, status: 'synced', serverResponse: result });
      results.push({ idempotency_key: idempotencyKey, status: 'synced', response: result });
    } catch (err) {
      await updateOfflineActionStatus({ actionId: offlineActionId, status: 'pending', lastError: err.message });
      results.push({ idempotency_key: idempotencyKey, status: 'pending', error: err.message });
    }
  }

  return NextResponse.json({ results });
}

async function processAction(type, payload, employee) {
  const p = { ...payload, employee_id: employee.id };
  switch (type) {
    case 'loaded_item': {
      const { data, error } = await supabaseAdmin.from('crew_loaded_items').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    case 'truck_inspection': {
      const { data, error } = await supabaseAdmin.from('truck_inspections').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    case 'fuel_receipt': {
      const { data, error } = await supabaseAdmin.from('fuel_receipts').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    case 'odometer_reading': {
      const { data, error } = await supabaseAdmin.from('odometer_readings').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    case 'barcode_scan': {
      const { data, error } = await supabaseAdmin.from('barcode_scans').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    case 'rental_return': {
      const { data, error } = await supabaseAdmin.from('rental_returns').insert(p).select().single();
      if (error) throw error;
      return data;
    }
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}
