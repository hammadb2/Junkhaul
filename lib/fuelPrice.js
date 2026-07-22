// ============================================================
// FUEL PRICE — live fetch with a mandatory conservative fallback.
//
// Source: Natural Resources Canada's daily city fuel price survey
// (free, no API key, no signup — official Government of Canada data).
// https://www2.nrcan-rncan.gc.ca/eneene/sources/pripri/prices_byfuel_e.cfm
//
// NRCan reports one blended average per city per day (not per-station),
// so there is no genuinely free, no-signup, real-time per-station feed
// for Calgary to pick a true "highest of many stations" price from —
// checked live against the commercial APIs (OilPriceAPI, Zyla) and none
// offer that without a paid/keyed plan. The admin-configurable
// `fuel_safety_buffer_percent` (see costConfig.js) applies on top of
// this value specifically to cover that gap conservatively, matching
// the same intent (never underquote fuel).
//
// This module is intentionally isolated: if NRCan ever changes its page
// structure, only this file needs to change — every caller just gets
// { price_per_litre, source, fetched_at } or the conservative fallback.
// ============================================================

const NRCAN_URL =
  'https://www2.nrcan-rncan.gc.ca/eneene/sources/pripri/prices_byfuel_e.cfm?locationName=Calgary&productName=Regular%20Gasoline';

// Sanity bounds in cents/litre — anything outside this range is treated
// as a parse failure, not a real price. Wide enough to survive years of
// normal price movement without needing a code change.
const MIN_CENTS_PER_LITRE = 80;
const MAX_CENTS_PER_LITRE = 350;

function extractCalgaryRegularPrice(html) {
  // <th ... id="Regular-Gasoline" ...>Regular Gasoline</th> ... <td
  // headers="Regular-Gasoline todayDate centLitre">174.1</td> — verified
  // live against the real page; the `headers` attribute value is the
  // stable anchor (the surrounding markup/styling can change without
  // breaking this).
  const match = html.match(
    /headers="Regular-Gasoline\s+todayDate\s+centLitre"[^>]*>\s*([\d.]+)\s*</i
  );
  if (!match) return null;
  const centsPerLitre = parseFloat(match[1]);
  if (!Number.isFinite(centsPerLitre)) return null;
  if (centsPerLitre < MIN_CENTS_PER_LITRE || centsPerLitre > MAX_CENTS_PER_LITRE) return null;
  return centsPerLitre / 100;
}

// Fetch the live Calgary Regular 87 price. Returns null (never throws)
// on any failure — network error, unexpected page structure, or an
// out-of-range parsed value. Callers MUST have a fallback; this
// function's job is only to try, not to guarantee a price.
export async function fetchLiveFuelPrice({ timeoutMs = 8000 } = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(NRCAN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JunkHaulPricingEngine/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const pricePerLitre = extractCalgaryRegularPrice(html);
    if (!pricePerLitre) return null;
    return {
      price_per_litre: pricePerLitre,
      source: 'Natural Resources Canada — daily Calgary Regular Gasoline retail price survey (nrcan-rncan.gc.ca)',
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('fetchLiveFuelPrice failed:', err.message);
    return null;
  }
}
