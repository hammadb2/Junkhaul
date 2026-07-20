// ============================================================
// rehaulInventory.js
//
// Rehaul inventory, SKU/barcode, warehouse location, preparation and cost basis.
// ============================================================

import { supabaseAdmin } from './supabase.js';

const VALID_STATES = new Set([
  'quarantine','preparation','ready','reserved','sold','picked','out_for_delivery',
  'delivered','returned_by_exception','recycled','disposed','lost_damaged'
]);

export function generateSku({ category, donationItemId, inventoryIndex = 0 }) {
  const cat = (category || 'UNK').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const suffix = String(inventoryIndex).padStart(4, '0');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${cat}-${date}-${donationItemId?.slice(0, 8) || 'NEW'}-${suffix}`;
}

export async function createInventoryItem({
  tenantId,
  donationItemId,
  category,
  title,
  description,
  conditionGrade,
  dimensions,
  weightKg,
  locationId,
  costs = {},
  defects = [],
  client = supabaseAdmin,
}) {
  const { count } = await client.from('inventory_items').select('*', { count: 'exact', head: true });
  const sku = generateSku({ category, donationItemId, inventoryIndex: (count || 0) + 1 });

  const { data: item, error } = await client.from('inventory_items').insert({
    tenant_id: tenantId,
    donation_item_id: donationItemId,
    sku,
    title,
    description,
    category,
    condition_grade: conditionGrade,
    dimensions,
    weight_kg: weightKg,
    location_id: locationId,
    status: 'quarantine',
    acquisition_cost_cents: costs.acquisition || 0,
    cleaning_cost_cents: costs.cleaning || 0,
    repair_cost_cents: costs.repair || 0,
    parts_cost_cents: costs.parts || 0,
    photography_cost_cents: costs.photography || 0,
    storage_cost_cents: costs.storage || 0,
    delivery_cost_cents: costs.delivery || 0,
  }).select().single();
  if (error) throw error;

  if (defects.length) {
    const rows = defects.map((d) => ({ inventory_item_id: item.id, ...d }));
    const { error: dError } = await client.from('inventory_defects').insert(rows);
    if (dError) throw dError;
  }

  return item;
}

export async function transitionInventoryStatus({ itemId, toStatus, actorId, reason, client = supabaseAdmin }) {
  if (!VALID_STATES.has(toStatus)) throw new Error('Invalid inventory status');
  const { data: item } = await client.from('inventory_items').select('*').eq('id', itemId).single();
  if (!item) throw new Error('Item not found');

  const { data, error } = await client.from('inventory_items')
    .update({ status: toStatus })
    .eq('id', itemId)
    .select().single();
  if (error) throw error;

  await client.from('inventory_movements').insert({
    inventory_item_id: itemId,
    to_location_id: item.location_id,
    reason: `status:${item.status}->${toStatus} ${reason || ''}`.trim(),
    actor_id: actorId,
  });

  return data;
}

export async function moveInventory({ itemId, toLocationId, actorId, reason, client = supabaseAdmin }) {
  const { data: item } = await client.from('inventory_items').select('location_id').eq('id', itemId).single();
  if (!item) throw new Error('Item not found');

  const { error } = await client.from('inventory_items').update({ location_id: toLocationId }).eq('id', itemId);
  if (error) throw error;

  await client.from('inventory_movements').insert({
    inventory_item_id: itemId,
    from_location_id: item.location_id,
    to_location_id: toLocationId,
    reason,
    actor_id: actorId,
  });

  return { success: true };
}

export async function reserveInventory({ itemId, referenceType, referenceId, client = supabaseAdmin }) {
  const { data: item } = await client.from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .eq('status', 'ready')
    .single();
  if (!item) throw new Error('Item not available for reservation');

  const { data, error } = await client.from('inventory_items')
    .update({ status: 'reserved' })
    .eq('id', itemId)
    .select().single();
  if (error) throw error;
  return data;
}

export async function releaseReservation({ itemId, client = supabaseAdmin }) {
  const { data, error } = await client.from('inventory_items')
    .update({ status: 'ready' })
    .eq('id', itemId)
    .eq('status', 'reserved')
    .select().single();
  if (error) throw error;
  if (!data) throw new Error('Reservation not found or already released');
  return data;
}
