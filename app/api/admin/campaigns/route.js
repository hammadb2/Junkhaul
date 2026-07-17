import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { recordAuditEvent } from '@/lib/auditEvents';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

const TABLES = {
  campaign: 'marketing_campaigns',
  batch: 'campaign_batches',
  tracking_code: 'campaign_tracking_codes',
};

function normalizeType(type) {
  return TABLES[type] ? type : null;
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function pick(input, allowed) {
  return Object.fromEntries(Object.entries(input || {}).filter(([key]) => allowed.includes(key)));
}

async function audit(context, { action, entityType, entityId, before = null, after = null, reason = null, metadata = {} }) {
  await recordAuditEvent({
    entity_type: entityType,
    entity_id: entityId,
    event_type: action,
    actor_type: 'employee',
    actor_id: context.employee.id,
    source: 'admin_campaigns',
    before,
    after,
    reason,
    metadata,
  });
}

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'campaigns.manage',
    action: 'campaigns.read',
    metadata: { route: '/api/admin/campaigns' },
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');
  const campaignId = searchParams.get('campaign_id');

  let campaignsQuery = supabaseAdmin.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
  if (active === 'true') campaignsQuery = campaignsQuery.eq('active', true);
  if (active === 'false') campaignsQuery = campaignsQuery.eq('active', false);
  const { data: campaigns, error: campaignsError } = await campaignsQuery;
  if (campaignsError) return NextResponse.json({ error: campaignsError.message }, { status: 500 });

  let batchesQuery = supabaseAdmin.from('campaign_batches').select('*').order('created_at', { ascending: false });
  let codesQuery = supabaseAdmin.from('campaign_tracking_codes').select('*').order('created_at', { ascending: false });
  if (campaignId) {
    batchesQuery = batchesQuery.eq('campaign_id', campaignId);
    codesQuery = codesQuery.eq('campaign_id', campaignId);
  }
  const [{ data: batches }, { data: trackingCodes }] = await Promise.all([batchesQuery, codesQuery]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';
  const codes = (trackingCodes || []).map((code) => ({
    ...code,
    preview_url: `${baseUrl.replace(/\/$/, '')}${code.destination_path || '/book'}?code=${encodeURIComponent(code.code)}`,
  }));

  return NextResponse.json({ campaigns: campaigns || [], batches: batches || [], tracking_codes: codes });
}

export async function POST(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'campaigns.manage',
    action: 'campaigns.create',
    metadata: { route: '/api/admin/campaigns' },
  });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const type = normalizeType(body.type);
  const reason = body.reason || null;
  if (!type) return NextResponse.json({ error: 'type must be campaign, batch, or tracking_code' }, { status: 422 });

  let row;
  if (type === 'campaign') {
    row = pick(body, ['name', 'channel', 'source', 'description', 'objective', 'status', 'planned_budget_cents', 'actual_cost_cents', 'offer', 'landing_page', 'starts_at', 'ends_at', 'active']);
    if (!row.name || !row.channel) return NextResponse.json({ error: 'name and channel are required' }, { status: 422 });
    row.source = row.source || row.channel;
  } else if (type === 'batch') {
    row = pick(body, ['campaign_id', 'name', 'creative', 'neighbourhood', 'distribution_zone', 'distributor', 'planned_quantity', 'actual_quantity', 'printing_cost_cents', 'distribution_cost_cents', 'distribution_date', 'destination_page', 'active']);
    if (!row.campaign_id || !row.name) return NextResponse.json({ error: 'campaign_id and name are required' }, { status: 422 });
  } else {
    row = pick(body, ['campaign_id', 'batch_id', 'code', 'qr_code', 'short_code', 'promo_code', 'destination_path', 'active', 'starts_at', 'ends_at', 'metadata']);
    row.code = normalizeCode(row.code);
    if (!row.campaign_id || !row.code) return NextResponse.json({ error: 'campaign_id and code are required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin.from(TABLES[type]).insert(row).select('*').single();
  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  await audit(auth.context, { action: `${type}.create`, entityType: type, entityId: data.id, after: data, reason });
  return NextResponse.json({ ok: true, [type]: data }, { status: 201 });
}

export async function PATCH(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'campaigns.manage',
    action: 'campaigns.update',
  });
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const type = normalizeType(body.type);
  const reason = body.reason || null;
  if (!type || !body.id) return NextResponse.json({ error: 'type and id are required' }, { status: 422 });

  const { data: before } = await supabaseAdmin.from(TABLES[type]).select('*').eq('id', body.id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  let update;
  if (type === 'campaign') {
    update = pick(body, ['name', 'channel', 'source', 'description', 'objective', 'status', 'planned_budget_cents', 'actual_cost_cents', 'offer', 'landing_page', 'starts_at', 'ends_at', 'active']);
  } else if (type === 'batch') {
    update = pick(body, ['name', 'creative', 'neighbourhood', 'distribution_zone', 'distributor', 'planned_quantity', 'actual_quantity', 'printing_cost_cents', 'distribution_cost_cents', 'distribution_date', 'destination_page', 'active']);
  } else {
    update = pick(body, ['qr_code', 'short_code', 'promo_code', 'destination_path', 'active', 'starts_at', 'ends_at', 'metadata', 'deactivation_reason']);
    if ('code' in body && normalizeCode(body.code) !== before.code) {
      return NextResponse.json({ error: 'Tracking codes cannot be reassigned or renamed; create a new code and deactivate the old one' }, { status: 409 });
    }
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from(TABLES[type]).update(update).eq('id', body.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(auth.context, { action: `${type}.update`, entityType: type, entityId: data.id, before, after: data, reason, metadata: { fields: Object.keys(update) } });
  return NextResponse.json({ ok: true, [type]: data });
}
