import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission, auditSensitiveAttempt } from '@/lib/staffAuth';
import {
  getCostConfig,
  getActiveVehicleProfiles,
  estimateJobCost,
  quotePriceFromCost,
  computeRentalCost,
  computeFuelCost,
  computeLaborCost,
  computeFacilityCost,
} from '@/lib/costConfig';
import { milesToKm } from '@/lib/unitConversions';

export const runtime = 'nodejs';

const VERSIONED_TABLES = new Set([
  'rental_rate_versions',
  'fuel_rate_versions',
  'labor_rate_versions',
  'facility_rate_versions',
  'overhead_rate_versions',
  'pricing_policy_versions',
]);

// vehicle_profiles is not a versioned table (no effective_from/to) — it's
// a flat fleet roster with an active flag, edited in place rather than
// superseded. Kept separate from VERSIONED_TABLES so the supersede/
// concurrency logic below never applies to it.
const VEHICLE_PROFILE_FIELDS = [
  'name', 'vehicle_class', 'volume_cuft', 'volume_yd3', 'legal_payload_kg',
  'operational_weight_limit_kg', 'fuel_baseline_l_per_100km',
  'interior_length_ft', 'interior_width_ft', 'interior_height_ft',
  'fuel_tank_capacity_l', 'ramp_details', 'planned_payload_percent',
  'clean_eligible', 'dirty_eligible', 'active', 'source',
];

const SCENARIO_DISTANCE_KM = 65.98;
const SCENARIO_ONSITE_MINUTES = {
  single_item: 20,
  quarter: 40,
  half: 60,
  full: 90,
};

// Re-authenticate the owner by comparing the supplied admin password with
// the environment variable. Uses timing-safe comparison when lengths match.
function verifyReauth(password) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '');
  const provided = Buffer.from(password || '');
  if (expected.length === 0 || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

function buildScope(table, record) {
  if (table === 'rental_rate_versions') {
    return {
      provider: record.provider,
      location: record.location,
      vehicle_profile_id: record.vehicle_profile_id,
    };
  }
  if (table === 'labor_rate_versions') {
    return { role_or_employee: record.role_or_employee };
  }
  if (table === 'facility_rate_versions') {
    return { facility: record.facility, waste_stream: record.waste_stream };
  }
  return {};
}

function normalizeRecord(table, record) {
  const now = new Date().toISOString();
  const copy = { ...record };
  if (!copy.effective_from) copy.effective_from = now;
  copy.status = 'active';

  if (table === 'rental_rate_versions' && copy.per_mile_rate && !copy.per_km_rate) {
    copy.per_km_rate = milesToKm(copy.per_mile_rate);
  }

  // Strip server-managed fields.
  delete copy.id;
  delete copy.created_at;
  delete copy.version;
  delete copy.audit_history;
  delete copy.effective_to;
  return copy;
}

// GET /api/admin/cost-config — returns current effective values and history.
// GET /api/admin/cost-config?preview=true&type=...&record={...} — impact preview.
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'cost_config.read',
    action: 'cost_config.read',
    metadata: { route: '/api/admin/cost-config' },
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    if (searchParams.get('preview') === 'true') {
      const table = searchParams.get('type');
      const raw = searchParams.get('record');
      if (!table || !raw || !VERSIONED_TABLES.has(table)) {
        return NextResponse.json({ error: 'type and record query params required' }, { status: 422 });
      }
      const record = JSON.parse(raw);
      const asOf = searchParams.get('asOf') || new Date().toISOString();
      const preview = await buildImpactPreview(record, table, asOf);
      return NextResponse.json({ preview });
    }

    const asOf = searchParams.get('asOf') || new Date().toISOString();
    const type = searchParams.get('type') || 'all';

    const [profiles, cfg, allVersions] = await Promise.all([
      getActiveVehicleProfiles(),
      getCostConfig({ asOf }),
      type === 'all'
        ? Promise.all(
            Array.from(VERSIONED_TABLES).map(async (table) => {
              const { data, error } = await supabaseAdmin
                .from(table)
                .select('*')
                .order('effective_from', { ascending: false });
              if (error) throw error;
              return [table, data || []];
            })
          ).then((rows) => Object.fromEntries(rows))
        : null,
    ]);

    const warnings = [];
    for (const table of VERSIONED_TABLES) {
      const versions = allVersions?.[table] || [];
      const active = versions.find((v) => v.status === 'active');
      if (!active) warnings.push(`${table}: no active version`);
      else if (active.effective_to !== null && active.effective_to < asOf) warnings.push(`${table}: active version has expired`);
      // Gaps and overlaps are prevented by exclusion constraints, but flag any draft rows.
      if (versions.some((v) => v.status === 'draft')) warnings.push(`${table}: draft version present`);
    }

    return NextResponse.json({
      asOf,
      profiles,
      current: cfg,
      versions: allVersions,
      warnings,
    });
  } catch (err) {
    console.error('cost-config GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/cost-config — create a new version, superseding the previous one.
export async function POST(req) {
  try {
    const body = await req.json();
    const { type: table, record, expectedReplacedId, reason, adminPassword } = body;

    const auth = await requireStaffPermission(req, {
      permission: 'cost_config.manage',
      ownerOnly: true,
      action: 'cost_config.create_version',
      reason,
      metadata: { table, expectedReplacedId },
    });
    if (!auth.ok) return auth.response;

    if (!table || !(VERSIONED_TABLES.has(table) || table === 'vehicle_profiles')) {
      return NextResponse.json({ error: 'Invalid or missing type' }, { status: 422 });
    }
    if (!record || typeof record !== 'object') {
      return NextResponse.json({ error: 'record object required' }, { status: 422 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 422 });
    }
    if (!adminPassword || !verifyReauth(adminPassword)) {
      return NextResponse.json({ error: 'Re-authentication required' }, { status: 401 });
    }

    if (table === 'vehicle_profiles') {
      return await saveVehicleProfile({ record, reason, auth });
    }

    const normalized = normalizeRecord(table, record);
    normalized.created_by = auth.context.employee.id;

    // Optimistic concurrency: the expected previous active row must still be active.
    if (expectedReplacedId) {
      const scope = buildScope(table, normalized);
      const current = await supabaseAdmin
        .from(table)
        .select('id, version, audit_history')
        .match(scope)
        .is('effective_to', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      if (current.error || !current.data || current.data.id !== expectedReplacedId) {
        return NextResponse.json({ error: 'Concurrent change detected; refresh and try again' }, { status: 409 });
      }
      const updated = await supabaseAdmin
        .from(table)
        .update({
          effective_to: normalized.effective_from,
          status: 'superseded',
          audit_history: [
            ...(current.data.audit_history || []),
            { event: 'superseded', replaced_by: 'pending', replaced_at: new Date().toISOString() },
          ],
        })
        .eq('id', expectedReplacedId)
        .is('effective_to', null)
        .select();
      if (!updated.data?.length) {
        return NextResponse.json({ error: 'Concurrent change detected; refresh and try again' }, { status: 409 });
      }
      normalized.version = (current.data.version || 1) + 1;
    }

    const { data, error } = await supabaseAdmin.from(table).insert(normalized).select().single();
    if (error) {
      if (error.message?.includes('overlap') || error.code === '23P01' || error.code === 'Exclusion') {
        return NextResponse.json({ error: 'Version overlaps an existing active period' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await auditSensitiveAttempt({
      context: auth.context,
      allowed: true,
      permission: 'cost_config.manage',
      entityType: table,
      entityId: data.id,
      action: 'cost_config.create_version',
      reason,
      after: data,
      metadata: { table, expectedReplacedId },
    });

    return NextResponse.json({ version: data });
  } catch (err) {
    console.error('cost-config POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Helper: update an existing fleet truck (record.id present) or add a new
// one. Not versioned — edited in place — but still requires the same
// reason + admin re-auth as versioned changes, and is audit-logged with a
// before/after snapshot so fleet-spec changes remain traceable.
async function saveVehicleProfile({ record, reason, auth }) {
  const { id, ...rest } = record;
  const payload = {};
  for (const key of VEHICLE_PROFILE_FIELDS) {
    if (rest[key] !== undefined) payload[key] = rest[key];
  }

  if (id) {
    const before = await supabaseAdmin.from('vehicle_profiles').select('*').eq('id', id).single();
    if (before.error || !before.data) {
      return NextResponse.json({ error: 'Vehicle profile not found' }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin.from('vehicle_profiles').update(payload).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auditSensitiveAttempt({
      context: auth.context,
      allowed: true,
      permission: 'cost_config.manage',
      entityType: 'vehicle_profiles',
      entityId: data.id,
      action: 'cost_config.update_vehicle_profile',
      reason,
      before: before.data,
      after: data,
      metadata: {},
    });
    return NextResponse.json({ profile: data });
  }

  const { data, error } = await supabaseAdmin.from('vehicle_profiles').insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auditSensitiveAttempt({
    context: auth.context,
    allowed: true,
    permission: 'cost_config.manage',
    entityType: 'vehicle_profiles',
    entityId: data.id,
    action: 'cost_config.create_vehicle_profile',
    reason,
    after: data,
    metadata: {},
  });
  return NextResponse.json({ profile: data });
}

// Helper: compute impact preview for a proposed record.
async function buildImpactPreview(proposedRecord, table, asOf) {
  const baseCfg = await getCostConfig({ asOf });
  const loadSizes = ['single_item', 'quarter', 'half', 'full'];
  const rows = [];

  for (const loadSize of loadSizes) {
    const estimate = await estimateJobCost({
      loadSize,
      distanceKm: SCENARIO_DISTANCE_KM,
      onSiteMinutes: SCENARIO_ONSITE_MINUTES[loadSize],
      asOf,
    });
    const price = quotePriceFromCost({ cost: estimate.cost, pricingPolicy: baseCfg.policy });

    // Build a cost with the proposed record substituted.
    let adjustedCost = estimate.cost;
    if (table === 'fuel_rate_versions') {
      const fuel = computeFuelCost({ fuelRate: proposedRecord, distanceKm: SCENARIO_DISTANCE_KM });
      adjustedCost = estimate.cost - estimate.breakdown.fuel + fuel;
    } else if (table === 'rental_rate_versions') {
      const rental = computeRentalCost({ rentalRate: proposedRecord, distanceKm: SCENARIO_DISTANCE_KM });
      adjustedCost = estimate.cost - estimate.breakdown.rental + rental;
    } else if (table === 'labor_rate_versions') {
      const hours = estimate.hours;
      const labor = computeLaborCost({ laborRate: proposedRecord, hours, people: 2 });
      adjustedCost = estimate.cost - estimate.breakdown.labor + labor;
    } else if (table === 'facility_rate_versions') {
      const facility = computeFacilityCost({ facilityRate: proposedRecord, loadSize });
      adjustedCost = estimate.cost - estimate.breakdown.facility + facility;
    } else if (table === 'overhead_rate_versions') {
      const overhead = computeOverheadAllocation({ overheadRate: proposedRecord, revenue: price, days: 1 });
      adjustedCost = estimate.cost - estimate.breakdown.overhead + overhead;
    } else if (table === 'pricing_policy_versions') {
      // pricing policy doesn't change cost, only price.
    }

    const adjustedPrice = quotePriceFromCost({ cost: adjustedCost, pricingPolicy: table === 'pricing_policy_versions' ? proposedRecord : baseCfg.policy });
    rows.push({
      loadSize,
      distanceKm: SCENARIO_DISTANCE_KM,
      onSiteMinutes: SCENARIO_ONSITE_MINUTES[loadSize],
      currentCost: estimate.cost,
      currentPrice: price,
      adjustedCost,
      adjustedPrice,
      change: roundCurrency(adjustedPrice - price, 2),
    });
  }

  return rows;
}

function roundCurrency(value, decimals = 2) {
  return Math.round(Number(value) * 10 ** decimals) / 10 ** decimals;
}
