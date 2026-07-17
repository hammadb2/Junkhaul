export const DONATION_STATUSES = [
  'draft','submitted','analyzing','needs_more_photos','ai_approved','manual_review',
  'rejected','paid_quote_offered','route_waiting','route_matched','pickup_window_offered',
  'customer_confirmed','assigned','en_route','picked_up','delivered_to_storage',
  'delivered_to_partner','rejected_on_site','converted_to_paid','cancelled','expired',
];

export const DONATION_TRANSITIONS = {
  draft: ['submitted','cancelled'],
  submitted: ['analyzing','cancelled'],
  analyzing: ['needs_more_photos','ai_approved','manual_review','rejected','paid_quote_offered'],
  needs_more_photos: ['submitted','cancelled','expired'],
  ai_approved: ['route_waiting','manual_review','cancelled'],
  manual_review: ['route_waiting','rejected','paid_quote_offered','cancelled'],
  rejected: ['paid_quote_offered'],
  paid_quote_offered: ['converted_to_paid','expired','cancelled'],
  route_waiting: ['route_matched','expired','cancelled'],
  route_matched: ['pickup_window_offered','cancelled'],
  pickup_window_offered: ['customer_confirmed','expired','cancelled'],
  customer_confirmed: ['assigned','cancelled'],
  assigned: ['en_route','cancelled'],
  en_route: ['picked_up','rejected_on_site','cancelled'],
  picked_up: ['delivered_to_storage','delivered_to_partner'],
  delivered_to_storage: ['delivered_to_partner'],
  delivered_to_partner: [],
  rejected_on_site: ['converted_to_paid'],
  converted_to_paid: [],
  cancelled: [],
  expired: [],
};

export const REQUIRED_DONATION_PHOTO_TYPES = [
  'full_item_view',
  'condition_close_up',
  'damage_photo',
  'total_quantity_context',
];

export function validateDonationPhotos(photos = [], required = REQUIRED_DONATION_PHOTO_TYPES) {
  const present = new Set((photos || []).map((p) => p.photo_type || p.type));
  const missing = required.filter((type) => !present.has(type));
  return { ok: missing.length === 0, missing };
}

export function assertDonationTransition(from, to) {
  if (!DONATION_STATUSES.includes(from) || !DONATION_STATUSES.includes(to)) {
    throw new Error('Invalid donation status');
  }
  if (!(DONATION_TRANSITIONS[from] || []).includes(to)) {
    throw new Error(`Invalid donation transition: ${from} -> ${to}`);
  }
  return true;
}

export function analyzeDonationSubmission({ description = '', photos = [], confirmations = {} }) {
  const photoCheck = validateDonationPhotos(photos);
  if (!photoCheck.ok) {
    return {
      outcome: 'NEED_MORE_PHOTOS',
      confidence: 0.95,
      rejection_reasons: [],
      missing_photos: photoCheck.missing,
      structured_output: { photo_requirements_met: false },
    };
  }
  const text = description.toLowerCase();
  const badSignals = ['garbage','trash','mold','mould','pest','bed bug','chemical','paint','food waste','construction debris','broken glass'];
  const rejection = badSignals.filter((s) => text.includes(s));
  if (rejection.length || confirmations.confirmation_no_garbage === false || confirmations.confirmation_no_hazmat === false) {
    return {
      outcome: 'OFFER_PAID_JUNK_REMOVAL',
      confidence: 0.88,
      rejection_reasons: rejection.length ? rejection : ['customer confirmation failed'],
      structured_output: { donation_quality: false },
    };
  }
  if (!confirmations.confirmation_items_clean || !confirmations.confirmation_items_usable) {
    return {
      outcome: 'ADMIN_REVIEW',
      confidence: 0.66,
      rejection_reasons: ['clean/usable confirmation missing'],
      structured_output: { donation_quality: 'uncertain' },
    };
  }
  return {
    outcome: 'ADMIN_REVIEW',
    confidence: 0.74,
    rejection_reasons: [],
    structured_output: { donation_quality: true, route_fit_required: true },
  };
}
