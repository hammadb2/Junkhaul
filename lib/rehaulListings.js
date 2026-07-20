// ============================================================
// rehaulListings.js
//
// Rehaul listing studio, media workflow, defects, and pricing.
// ============================================================

import { supabaseAdmin } from './supabase.js';

export function slugify(title) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
}

export function priceFromCost({ costCents, marginFloorPercent = 20, minPriceCents = 0 }) {
  const floorPrice = Math.max(minPriceCents, Math.ceil(costCents / (1 - marginFloorPercent / 100)));
  return floorPrice;
}

export async function createListing({
  tenantId,
  inventoryItemId,
  title,
  description,
  category,
  room,
  style,
  listedPriceCents,
  conditionSummary,
  provenance,
  media = [],
  defects = [],
  marginFloorPercent = 20,
  createdBy,
  client = supabaseAdmin,
}) {
  const { data: item } = await client.from('inventory_items')
    .select('*')
    .eq('id', inventoryItemId)
    .single();
  if (!item) throw new Error('Inventory item not found');
  if (item.status !== 'ready') throw new Error('Item must be in ready status to list');

  const minPriceCents = priceFromCost({ costCents: item.total_cost_basis_cents, marginFloorPercent });
  if (listedPriceCents < minPriceCents) {
    throw new Error(`Listed price ${listedPriceCents} is below margin floor ${minPriceCents}`);
  }

  const slug = slugify(title);
  const snapshot = {
    inventory_item_id: inventoryItemId,
    sku: item.sku,
    cost_basis_cents: item.total_cost_basis_cents,
    listed_price_cents: listedPriceCents,
    min_price_cents: minPriceCents,
    margin_floor_percent: marginFloorPercent,
    condition_grade: item.condition_grade,
    created_at: new Date().toISOString(),
  };

  const { data: listing, error } = await client.from('rehaul_listings').insert({
    tenant_id: tenantId,
    inventory_item_id: inventoryItemId,
    title,
    slug,
    description,
    category,
    room,
    style,
    listed_price_cents: listedPriceCents,
    cost_basis_cents: item.total_cost_basis_cents,
    min_price_cents: minPriceCents,
    margin_floor_percent: marginFloorPercent,
    condition_grade: item.condition_grade,
    condition_summary: conditionSummary,
    provenance,
    status: 'draft',
    publication_snapshot: snapshot,
  }).select().single();
  if (error) throw error;

  if (media.length) {
    const rows = media.map((m, i) => ({
      tenant_id: tenantId,
      inventory_item_id,
      type: m.type || 'photo',
      url: m.url,
      alt_text: m.alt_text || `${title} view ${i + 1}`,
      ordering: i,
      is_primary: i === 0,
      moderation_status: m.moderation_status || 'pending',
    }));
    const { error: mError } = await client.from('rehaul_media').insert(rows);
    if (mError) throw mError;
  }

  if (defects.length) {
    const rows = defects.map((d) => ({ listing_id: listing.id, ...d }));
    const { error: dError } = await client.from('rehaul_listing_defects').insert(rows);
    if (dError) throw dError;
  }

  return { listing, minPriceCents };
}

export async function publishListing({ listingId, publishedBy, client = supabaseAdmin }) {
  const { data: listing } = await client.from('rehaul_listings')
    .select('*, rehaul_media(*), rehaul_listing_defects(*)')
    .eq('id', listingId)
    .single();
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'draft' && listing.status !== 'pending_review') {
    throw new Error('Listing must be in draft or pending review before publish');
  }

  if (!listing.rehaul_media || listing.rehaul_media.length === 0) {
    throw new Error('Listing must have media before publish');
  }

  const snapshot = {
    ...listing.publication_snapshot,
    published_at: new Date().toISOString(),
    published_by: publishedBy,
    media_count: listing.rehaul_media.length,
    defect_count: (listing.rehaul_listing_defects || []).length,
  };

  const { data, error } = await client.from('rehaul_listings').update({
    status: 'published',
    published_at: new Date().toISOString(),
    published_by: publishedBy,
    publication_snapshot: snapshot,
  }).eq('id', listingId).select().single();
  if (error) throw error;

  await client.from('rehaul_price_snapshots').insert({
    listing_id: listingId,
    listed_price_cents: listing.listed_price_cents,
    min_price_cents: listing.min_price_cents,
    cost_basis_cents: listing.cost_basis_cents,
    margin_percent: ((listing.listed_price_cents - listing.cost_basis_cents) / listing.listed_price_cents) * 100,
    reason: 'publish',
    created_by: publishedBy,
  });

  await client.from('inventory_items').update({ status: 'ready', listed_at: new Date().toISOString() }).eq('id', listing.inventory_item_id);
  return data;
}

export async function getPublishedListings({ tenantId, category, room, client = supabaseAdmin }) {
  let q = client.from('rehaul_listings')
    .select('*, rehaul_media(*), rehaul_listing_defects(*)')
    .eq('tenant_id', tenantId)
    .eq('status', 'published');
  if (category) q = q.eq('category', category);
  if (room) q = q.eq('room', room);
  const { data, error } = await q.order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
