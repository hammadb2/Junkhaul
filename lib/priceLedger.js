import { supabaseAdmin } from './supabase';
import { recordTimelineEvent } from './timeline';

export async function createPriceLedgerEntry({
  booking_id = null,
  lead_id = null,
  donation_request_id = null,
  ledger_type,
  pricing = {},
  actor_type = 'system',
  actor_id = null,
  reason,
  customer_notification_status = null,
}) {
  if (!ledger_type) throw new Error('ledger_type required');
  if (!reason) throw new Error('reason required');
  const total = Number(pricing.total ?? pricing.total_price);
  if (!Number.isFinite(total)) throw new Error('total required');

  const row = {
    booking_id,
    lead_id,
    donation_request_id,
    ledger_type,
    pricing_config_version: pricing.pricing_config_version || null,
    base_price: pricing.base_price || 0,
    same_day_fee: pricing.same_day_fee || 0,
    stair_fee: pricing.stair_fee ?? pricing.stairs_fee ?? 0,
    freon_fee: pricing.freon_fee || 0,
    travel_fee: pricing.travel_fee || 0,
    travel_kilometres: pricing.travel_kilometres ?? pricing.travel_km ?? 0,
    truck_size: pricing.truck_size || null,
    truck_fee: pricing.truck_fee || 0,
    surge: pricing.surge ?? pricing.surge_multiplier ?? 1,
    dynamic_multiplier: pricing.dynamic_multiplier || 1,
    discount: pricing.discount || 0,
    promotion: pricing.promotion || null,
    referral_credit: pricing.referral_credit || 0,
    deposit: pricing.deposit ?? pricing.deposit_amount ?? 0,
    balance: pricing.balance ?? pricing.balance_due ?? 0,
    total,
    cash: pricing.cash || 0,
    card: pricing.card || 0,
    tip: pricing.tip || 0,
    refund: pricing.refund || 0,
    actor_type,
    actor_id,
    reason,
    customer_notification_status,
  };

  const { data, error } = await supabaseAdmin.from('quote_price_ledger').insert(row).select().single();
  if (error) throw error;

  const entity_id = booking_id || lead_id || donation_request_id;
  const entity_type = booking_id ? 'booking' : lead_id ? 'lead' : 'donation_request';
  if (entity_id) {
    await recordTimelineEvent({
      entity_type,
      entity_id,
      event_type: 'price_ledger_entry',
      actor_type,
      actor_id,
      source: 'price_ledger',
      reason,
      metadata: { ledger_type, total },
    });
  }

  return data;
}
