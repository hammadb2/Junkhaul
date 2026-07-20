// ============================================================
// UNIT CONVERSIONS — deterministic, tested boundary helpers.
// All conversions are explicit; callers must choose the unit they want.
// ============================================================

export const MILES_PER_KM = 0.6213711922;
export const KM_PER_MILE = 1.609344;
export const LITRES_PER_US_GALLON = 3.785411784;
export const KG_PER_TONNE = 1000;
export const TONNES_PER_KG = 0.001;

export const milesToKm = (miles) => Number(miles) * KM_PER_MILE;
export const kmToMiles = (km) => Number(km) * MILES_PER_KM;

export const usGallonsToLitres = (gal) => Number(gal) * LITRES_PER_US_GALLON;
export const litresToUsGallons = (l) => Number(l) / LITRES_PER_US_GALLON;

export const tonnesToKg = (tonnes) => Number(tonnes) * KG_PER_TONNE;
export const kgToTonnes = (kg) => Number(kg) * TONNES_PER_KG;

export const roundCurrency = (value, decimals = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
};

export const roundToNearest = (value, step) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return NaN;
  return Math.round(n / step) * step;
};

export const fuelCostPerKm = ({ lPer100km, pricePerLitre }) => {
  // e.g. 45 L/100km * $1.75/L / 100 = $0.7875/km
  return roundCurrency((Number(lPer100km) * Number(pricePerLitre)) / 100, 4);
};

// Price = cost / (1 - margin), NOT cost * (1 + margin).
export const priceFromMargin = ({ cost, marginPercent }) => {
  const margin = Number(marginPercent) / 100;
  if (margin >= 1) throw new Error('marginPercent must be < 100');
  return roundCurrency(Number(cost) / (1 - margin), 2);
};
