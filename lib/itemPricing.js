// ============================================================
// ITEMIZED PRICING — Calgary-specific dump/processing rates.
//
// Based on actual Calgary landfill fees + labour + truck costs:
//   - East Calgary Landfill: $120/tonne (min $25/load)
//   - Spyhill Landfill: $120/tonne (min $25/load)
//   - Mattress/box spring: $15 each (special handling fee at dump)
//   - Freon appliances: $40 each (certified disposal)
//   - Tires: $4-15 each (depends on size, we don't take them)
//   - E-waste: free at Eco-Centre but labour to transport
//
// Each item has a base price that covers:
//   - Dump fee (weight-based)
//   - Labour (2 people, ~$30/hr per person)
//   - Truck cost (U-Haul $40.99/day + $1.99/km)
//   - Profit margin (~40%)
// ============================================================

// ============================================================
// HARD REJECTION RULES — enforced in code, not just in the AI prompt.
//
// "Separates what the AI sees from what we charge" (see photo-quote's
// header comment) applies here too: the model can mislabel or drift,
// so these two checks are deterministic and can't be talked around by
// a prompt change or a model swap.
//
//   1. Whole vehicles / vehicle shells — landfills do not accept intact
//      vehicles (fluids, tires, frame) and require a licensed auto
//      wrecker, not a junk-removal landfill run. Categorically excluded,
//      no review changes that.
//   2. Weight tiers for a single item (Pricing Engine Phase 6 — ultra-
//      heavy items are CALCULATED, not a flat fee, and not an automatic
//      refusal):
//        <= MAX_TWO_PERSON_LIFT_KG (100kg): standard 2-person handling,
//          priced normally.
//        MAX_TWO_PERSON_LIFT_KG < weight <= ULTRA_HEAVY_REVIEW_KG
//          (100-200kg, e.g. a piano, a large safe): still included and
//          priced, but flagged as needing a dolly/ramp/extra care — a
//          calculated handling-time addition, not a refusal.
//        > ULTRA_HEAVY_REVIEW_KG (200kg, e.g. a grand piano, a full
//          safe, an engine block, a filled hot tub): likely needs 3+
//          crew members. Excluded from automatic pricing and flagged
//          for manual review so staff can decide to accept it (arranging
//          extra crew/equipment and pricing accordingly) or confirm it
//          genuinely can't be done — never a silent flat fee, and never
//          an automatic hard refusal with no path forward.
// ============================================================
export const MAX_TWO_PERSON_LIFT_KG = 100; // ~220 lbs — standard 2-mover safe-lift threshold
export const ULTRA_HEAVY_REVIEW_KG = 200; // ~440 lbs — likely needs 3+ crew, forces manual review
// Extra crew minutes for the 100-200kg "needs equipment" tier — dolly/ramp
// setup and slower, more careful maneuvering. ESTIMATE pending real job-
// timing data, matching the same documented-estimate pattern as
// labor_rate_versions.stairs_minutes_per_flight.
export const HEAVY_ITEM_EXTRA_MINUTES = 20;

// ============================================================
// PROHIBITED MATERIALS — Calgary disposal knowledge base (Pricing
// Engine Phase 7), enforced in code rather than left to the AI prompt
// alone, same philosophy as the vehicle/weight checks above.
//
// These are materials this business genuinely cannot take in ANY
// channel — not just "not to a standard landfill" (electronics, scrap
// metal, and donatable furniture are NOT on this list; those are
// different-channel-but-takeable items, which is what the routing logic
// in a later phase is for). A PROHIBITED item here is never included in
// a job's pricing, full stop, regardless of weight or hazard_flag.
//
// Sourced from well-established Calgary/Alberta municipal solid waste
// policy (whole tires need a tire-recycling depot, propane/pressurized
// cylinders and vehicle batteries need hazardous-waste drop-off,
// asbestos requires certified abatement handling, liquid chemicals/fuel
// need household hazardous-waste drop-off). Treat as a documented
// baseline, correctable by an admin once the business confirms current
// facility policy — not a substitute for that confirmation.
// ============================================================
const PROHIBITED_MATERIAL_KEYWORDS = {
  tires: ['tire', 'tyre'],
  propane_or_pressurized: ['propane tank', 'propane cylinder', 'pressurized cylinder', 'oxygen tank', 'gas cylinder'],
  vehicle_battery: ['car battery', 'vehicle battery', 'lead-acid battery', 'lead acid battery'],
  asbestos: ['asbestos'],
  liquid_chemical: ['paint can', 'motor oil', 'pesticide', 'herbicide', 'gasoline', 'propane bottle'],
};

const PROHIBITED_REASON = {
  tires: 'Calgary landfills don’t accept loose tires — these need a tire-recycling depot, not a standard junk pickup.',
  propane_or_pressurized: 'Propane tanks and other pressurized cylinders can’t go to a standard landfill — they need a hazardous-waste drop-off.',
  vehicle_battery: 'Vehicle/lead-acid batteries need a hazardous-waste or auto-parts drop-off, not a standard landfill run.',
  asbestos: 'Asbestos-suspect material needs certified abatement handling, not a standard junk-removal pickup.',
  liquid_chemical: 'Liquid paint, chemicals, and fuel need a household hazardous-waste drop-off, not a standard landfill run.',
};

function matchProhibitedMaterial(lower) {
  for (const [key, keywords] of Object.entries(PROHIBITED_MATERIAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }
  return null;
}

const VEHICLE_KEYWORDS = [
  'car', 'sedan', 'suv', 'pickup', 'pickup truck', 'minivan', 'van',
  'motorcycle', 'motorbike', 'moped', 'scooter (motor)', 'dirt bike',
  'atv', 'quad', 'snowmobile', 'jet ski', 'jetski',
  'boat', 'canoe (motor)', 'trailer', 'camper', 'rv', 'recreational vehicle',
  'golf cart', 'forklift', 'tractor', 'riding mower (full size tractor)',
];

// Checked as whole-word/phrase matches against the lowercased item name so
// generic nouns that happen to contain these substrings ("carpet", "carton",
// "vanity") never false-positive.
const VEHICLE_REGEX = new RegExp(
  `\\b(${VEHICLE_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

// Real household items whose name contains a whole vehicle keyword as a
// false positive — checked before VEHICLE_REGEX so these never get rejected
// (as a vehicle) and instead correctly reach the prohibited-material check
// below (a car tire/battery is prohibited for a DIFFERENT reason than
// "we don't haul whole vehicles").
const VEHICLE_FALSE_POSITIVES = /\b(car seat|carseat|boat shoe|boat neck|trailer hitch|car tire|car tyre|car battery)\b/i;

export function checkItemEligibility(name, estimatedWeightKg) {
  const lower = (name || '').toLowerCase();
  if (VEHICLE_REGEX.test(lower) && !VEHICLE_FALSE_POSITIVES.test(lower)) {
    return {
      rejected: true,
      ultra_heavy: false,
      needs_equipment: false,
      reason: `${name || 'This vehicle'} can't be included — we're a junk removal crew, not a licensed auto wrecker. Landfills don't accept intact vehicles and a 2-person crew can't load one into the truck. A scrap/auto-recycling service can help.`,
    };
  }
  const prohibited = matchProhibitedMaterial(lower);
  if (prohibited) {
    return {
      rejected: true,
      ultra_heavy: false,
      needs_equipment: false,
      prohibited_material: prohibited,
      reason: `${name || 'This item'} can't be included. ${PROHIBITED_REASON[prohibited]}`,
    };
  }
  const weight = Number(estimatedWeightKg) || 0;
  if (weight > ULTRA_HEAVY_REVIEW_KG) {
    return {
      rejected: true,
      ultra_heavy: true,
      needs_equipment: false,
      reason: `${name || 'This item'} (~${Math.round(weight)}kg) likely needs 3+ crew members to move safely. This isn't an automatic refusal — it goes to a quick manual review so we can arrange the right crew and equipment, or confirm it genuinely can't be done as a standard job.`,
    };
  }
  if (weight > MAX_TWO_PERSON_LIFT_KG) {
    return {
      rejected: false,
      ultra_heavy: false,
      needs_equipment: true,
      extra_labor_minutes: HEAVY_ITEM_EXTRA_MINUTES,
      reason: `${name || 'This item'} (~${Math.round(weight)}kg) needs a dolly/ramp and extra care to move safely — included, with additional handling time factored in.`,
    };
  }
  return { rejected: false, ultra_heavy: false, needs_equipment: false, reason: null };
}

export const ITEM_PRICING = {
  // Furniture
  sofa: { name: 'Sofa / Couch', price: 55, category: 'furniture', donatable: true, avg_kg: 45 },
  loveseat: { name: 'Loveseat', price: 40, category: 'furniture', donatable: true, avg_kg: 30 },
  sectionals: { name: 'Sectional Sofa', price: 85, category: 'furniture', donatable: true, avg_kg: 80 },
  armchair: { name: 'Armchair', price: 35, category: 'furniture', donatable: true, avg_kg: 25 },
  recliner: { name: 'Recliner', price: 35, category: 'furniture', donatable: true, avg_kg: 30 },
  coffee_table: { name: 'Coffee Table', price: 25, category: 'furniture', donatable: true, avg_kg: 15 },
  dining_table: { name: 'Dining Table', price: 45, category: 'furniture', donatable: true, avg_kg: 35 },
  dining_chair: { name: 'Dining Chair', price: 15, category: 'furniture', donatable: true, avg_kg: 8 },
  desk: { name: 'Desk', price: 35, category: 'furniture', donatable: true, avg_kg: 25 },
  bookshelf: { name: 'Bookshelf', price: 30, category: 'furniture', donatable: true, avg_kg: 20 },
  dresser: { name: 'Dresser / Chest of Drawers', price: 40, category: 'furniture', donatable: true, avg_kg: 35 },
  nightstand: { name: 'Nightstand', price: 20, category: 'furniture', donatable: true, avg_kg: 12 },
  wardrobe: { name: 'Wardrobe / Armoire', price: 50, category: 'furniture', donatable: true, avg_kg: 40 },
  ottoman: { name: 'Ottoman / Footstool', price: 20, category: 'furniture', donatable: true, avg_kg: 10 },
  futon: { name: 'Futon', price: 35, category: 'furniture', donatable: true, avg_kg: 25 },

  // Beds / Mattresses (special dump handling fee)
  mattress: { name: 'Mattress', price: 35, category: 'mattress', donatable: true, avg_kg: 25, note: '$15 dump handling fee included' },
  box_spring: { name: 'Box Spring', price: 30, category: 'mattress', donatable: true, avg_kg: 20, note: '$15 dump handling fee included' },
  bed_frame: { name: 'Bed Frame', price: 30, category: 'furniture', donatable: true, avg_kg: 20 },
  bunk_bed: { name: 'Bunk Bed', price: 55, category: 'furniture', donatable: true, avg_kg: 45 },
  headboard: { name: 'Headboard', price: 25, category: 'furniture', donatable: true, avg_kg: 15 },

  // Appliances — Freon (certified disposal required)
  fridge: { name: 'Refrigerator', price: 65, category: 'freon', donatable: false, avg_kg: 70, note: 'Freon certified disposal' },
  freezer: { name: 'Freezer', price: 65, category: 'freon', donatable: false, avg_kg: 60, note: 'Freon certified disposal' },
  chest_freezer: { name: 'Chest Freezer', price: 70, category: 'freon', donatable: false, avg_kg: 75, note: 'Freon certified disposal' },
  air_conditioner: { name: 'Air Conditioner', price: 50, category: 'freon', donatable: false, avg_kg: 35, note: 'Freon certified disposal' },
  water_cooler: { name: 'Water Cooler', price: 45, category: 'freon', donatable: false, avg_kg: 20, note: 'Freon certified disposal' },
  dehumidifier: { name: 'Dehumidifier', price: 45, category: 'freon', donatable: false, avg_kg: 20, note: 'Freon certified disposal' },

  // Appliances — Non-freon
  washer: { name: 'Washing Machine', price: 45, category: 'appliance', donatable: true, avg_kg: 50 },
  dryer: { name: 'Dryer', price: 45, category: 'appliance', donatable: true, avg_kg: 50 },
  stove: { name: 'Stove / Oven', price: 45, category: 'appliance', donatable: true, avg_kg: 50 },
  dishwasher: { name: 'Dishwasher', price: 40, category: 'appliance', donatable: true, avg_kg: 40 },
  microwave: { name: 'Microwave', price: 20, category: 'appliance', donatable: true, avg_kg: 15 },
  water_heater: { name: 'Water Heater / Tank', price: 45, category: 'appliance', donatable: false, avg_kg: 45 },
  furnace: { name: 'Furnace', price: 65, category: 'appliance', donatable: false, avg_kg: 80 },

  // E-waste
  tv_small: { name: 'TV (under 40")', price: 25, category: 'ewaste', donatable: true, avg_kg: 15 },
  tv_large: { name: 'TV (40"+)', price: 40, category: 'ewaste', donatable: true, avg_kg: 30 },
  computer: { name: 'Desktop Computer', price: 20, category: 'ewaste', donatable: true, avg_kg: 10 },
  monitor: { name: 'Monitor', price: 20, category: 'ewaste', donatable: true, avg_kg: 8 },
  printer: { name: 'Printer', price: 20, category: 'ewaste', donatable: true, avg_kg: 12 },
  laptop: { name: 'Laptop', price: 15, category: 'ewaste', donatable: true, avg_kg: 3 },

  // Outdoor / Garden
  lawn_mower: { name: 'Lawn Mower', price: 40, category: 'outdoor', donatable: true, avg_kg: 30 },
  bbq: { name: 'BBQ / Grill', price: 35, category: 'outdoor', donatable: false, avg_kg: 25 },
  patio_table: { name: 'Patio Table', price: 35, category: 'outdoor', donatable: true, avg_kg: 20 },
  patio_chair: { name: 'Patio Chair', price: 15, category: 'outdoor', donatable: true, avg_kg: 8 },
  umbrella: { name: 'Patio Umbrella', price: 20, category: 'outdoor', donatable: true, avg_kg: 8 },
  bicycle: { name: 'Bicycle', price: 25, category: 'outdoor', donatable: true, avg_kg: 15 },
  trampoline: { name: 'Trampoline', price: 55, category: 'outdoor', donatable: false, avg_kg: 50 },
  swing_set: { name: 'Swing Set', price: 55, category: 'outdoor', donatable: false, avg_kg: 45 },
  shed: { name: 'Garden Shed (dismantled)', price: 85, category: 'outdoor', donatable: false, avg_kg: 80 },
  fence_panels: { name: 'Fence Panels', price: 30, category: 'outdoor', donatable: false, avg_kg: 25 },

  // Construction / Renovation
  drywall: { name: 'Drywall / Gypsum', price: 45, category: 'construction', donatable: false, avg_kg: 40 },
  tiles: { name: 'Tiles / Flooring', price: 40, category: 'construction', donatable: false, avg_kg: 35 },
  carpet: { name: 'Carpet / Underlay', price: 35, category: 'construction', donatable: false, avg_kg: 25 },
  lumber: { name: 'Lumber / Wood', price: 30, category: 'construction', donatable: true, avg_kg: 25 },
  cabinets: { name: 'Kitchen Cabinets', price: 50, category: 'construction', donatable: true, avg_kg: 40 },
  vanity: { name: 'Bathroom Vanity', price: 40, category: 'construction', donatable: true, avg_kg: 30 },
  toilet: { name: 'Toilet', price: 30, category: 'construction', donatable: false, avg_kg: 25 },
  sink: { name: 'Sink', price: 25, category: 'construction', donatable: true, avg_kg: 15 },
  bathtub: { name: 'Bathtub', price: 50, category: 'construction', donatable: false, avg_kg: 40 },
  countertop: { name: 'Countertop', price: 40, category: 'construction', donatable: false, avg_kg: 30 },
  door: { name: 'Door', price: 25, category: 'construction', donatable: true, avg_kg: 20 },
  window: { name: 'Window', price: 30, category: 'construction', donatable: false, avg_kg: 25 },

  // Boxes / Bags / Misc
  boxes_small: { name: 'Boxes / Bags (small load)', price: 20, category: 'misc', donatable: true, avg_kg: 15 },
  boxes_medium: { name: 'Boxes / Bags (medium load)', price: 35, category: 'misc', donatable: true, avg_kg: 30 },
  boxes_large: { name: 'Boxes / Bags (large load)', price: 50, category: 'misc', donatable: true, avg_kg: 50 },
  garbage_bags: { name: 'Garbage Bags (10+)', price: 25, category: 'misc', donatable: false, avg_kg: 20 },
  clothing: { name: 'Clothing / Textiles', price: 20, category: 'misc', donatable: true, avg_kg: 15 },
  toys: { name: 'Toys / Kids Items', price: 20, category: 'misc', donatable: true, avg_kg: 15 },
  exercise_equipment: { name: 'Exercise Equipment', price: 40, category: 'misc', donatable: true, avg_kg: 35 },
  treadmill: { name: 'Treadmill', price: 55, category: 'misc', donatable: true, avg_kg: 60 },
  piano: { name: 'Piano / Organ', price: 120, category: 'misc', donatable: true, avg_kg: 150, note: 'Heavy item — may need 3+ people' },
  safe: { name: 'Safe (large)', price: 65, category: 'misc', donatable: false, avg_kg: 80, note: 'Heavy item' },
  car_parts: { name: 'Car Parts / Tires', price: 0, category: 'misc', donatable: false, avg_kg: 0, note: 'We cannot take tires or car parts' },

  // General
  other_large: { name: 'Other Large Item', price: 35, category: 'misc', donatable: false, avg_kg: 30 },
  other_medium: { name: 'Other Medium Item', price: 25, category: 'misc', donatable: false, avg_kg: 15 },
  other_small: { name: 'Other Small Item', price: 15, category: 'misc', donatable: false, avg_kg: 8 },
};

// ============================================================
// Match an AI-detected item name to our pricing catalog.
// Uses fuzzy matching on keywords.
// ============================================================
const KEYWORD_MAP = {
  // furniture
  'couch': 'sofa', 'sofa': 'sofa', 'sectional': 'sectionals', 'loveseat': 'loveseat',
  'armchair': 'armchair', 'chair': 'dining_chair', 'recliner': 'recliner',
  'coffee table': 'coffee_table', 'table': 'dining_table', 'dining table': 'dining_table',
  'desk': 'desk', 'bookshelf': 'bookshelf', 'bookcase': 'bookshelf', 'shelf': 'bookshelf',
  'dresser': 'dresser', 'chest of drawers': 'dresser', 'drawers': 'dresser',
  'nightstand': 'nightstand', 'night stand': 'nightstand', 'bedside': 'nightstand',
  'wardrobe': 'wardrobe', 'armoire': 'wardrobe', 'closet': 'wardrobe',
  'ottoman': 'ottoman', 'footstool': 'ottoman', 'futon': 'futon',
  // beds
  'mattress': 'mattress', 'box spring': 'box_spring', 'boxspring': 'box_spring',
  'bed frame': 'bed_frame', 'bedframe': 'bed_frame', 'frame': 'bed_frame',
  'bunk bed': 'bunk_bed', 'bunkbed': 'bunk_bed', 'headboard': 'headboard', 'head board': 'headboard',
  // freon
  'fridge': 'fridge', 'refrigerator': 'fridge', 'freezer': 'freezer', 'chest freezer': 'chest_freezer',
  'air conditioner': 'air_conditioner', 'ac unit': 'air_conditioner', 'ac': 'air_conditioner',
  'water cooler': 'water_cooler', 'dehumidifier': 'dehumidifier',
  // appliances
  'washer': 'washer', 'washing machine': 'washer', 'washing': 'washer',
  'dryer': 'dryer', 'stove': 'stove', 'oven': 'stove', 'range': 'stove',
  'dishwasher': 'dishwasher', 'microwave': 'microwave',
  'water heater': 'water_heater', 'hot water tank': 'water_heater', 'furnace': 'furnace',
  // ewaste
  'tv': 'tv_small', 'television': 'tv_small', 'television large': 'tv_large', 'big tv': 'tv_large',
  'computer': 'computer', 'desktop': 'computer', 'pc': 'computer',
  'monitor': 'monitor', 'display': 'monitor', 'screen': 'monitor',
  'printer': 'printer', 'laptop': 'laptop',
  // outdoor
  'lawn mower': 'lawn_mower', 'mower': 'lawn_mower', 'bbq': 'bbq', 'grill': 'bbq', 'barbecue': 'bbq',
  'patio table': 'patio_table', 'patio chair': 'patio_chair', 'umbrella': 'umbrella',
  'bicycle': 'bicycle', 'bike': 'bicycle', 'trampoline': 'trampoline',
  'swing set': 'swing_set', 'swingset': 'swing_set', 'shed': 'shed', 'fence': 'fence_panels',
  // construction
  'drywall': 'drywall', 'gypsum': 'drywall', 'tile': 'tiles', 'tiles': 'tiles', 'flooring': 'tiles',
  'carpet': 'carpet', 'rug': 'carpet', 'lumber': 'lumber', 'wood': 'lumber', '2x4': 'lumber',
  'cabinet': 'cabinets', 'cabinets': 'cabinets', 'vanity': 'vanity',
  'toilet': 'toilet', 'sink': 'sink', 'bathtub': 'bathtub', 'tub': 'bathtub',
  'countertop': 'countertop', 'counter': 'countertop', 'door': 'door', 'window': 'window',
  // misc
  'box': 'boxes_small', 'boxes': 'boxes_small', 'bag': 'garbage_bags', 'bags': 'garbage_bags',
  'garbage': 'garbage_bags', 'trash': 'garbage_bags',
  'clothing': 'clothing', 'clothes': 'clothing', 'textile': 'clothing',
  'toy': 'toys', 'toys': 'toys', 'kids': 'toys',
  'exercise': 'exercise_equipment', 'treadmill': 'treadmill', 'elliptical': 'exercise_equipment',
  'piano': 'piano', 'organ': 'piano', 'safe': 'safe',
  'tire': 'car_parts', 'tires': 'car_parts', 'wheel': 'car_parts', 'car part': 'car_parts',
};

export const matchItemToCatalog = (itemName) => {
  const lower = (itemName || '').toLowerCase().trim();

  // Direct keyword match
  for (const [keyword, key] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return ITEM_PRICING[key] ? { key, ...ITEM_PRICING[key], is_fallback: false } : null;
    }
  }

  // Size-based fallback — use the AI's original name, not a generic label
  if (/small|tiny|little/.test(lower)) {
    return { key: 'other_small', ...ITEM_PRICING.other_small, name: itemName || 'Unidentified small item', is_fallback: true };
  }
  if (/large|big|heavy|huge/.test(lower)) {
    return { key: 'other_large', ...ITEM_PRICING.other_large, name: itemName || 'Unidentified large item', is_fallback: true };
  }

  // Ultimate fallback — use AI's original name so two unrelated items
  // never render with identical placeholder text
  return { key: 'other_medium', ...ITEM_PRICING.other_medium, name: itemName || 'Unidentified item', is_fallback: true };
};

// ============================================================
// Build itemized quote from AI-detected items
// ============================================================
export const buildItemizedQuote = (items_detected, { stairs = 0, same_day = false } = {}) => {
  if (!items_detected || items_detected.length === 0) {
    return { items: [], subtotal: 0, stairs_fee: 0, same_day_fee: 0, total: 0, is_minimum: false, minimum_applied: 0, estimated_dump_fee: 0, rejected_items: [], ultra_heavy_items: [], heavy_item_extra_minutes: 0 };
  }

  const MINIMUM_CHARGE = 99;
  const STAIRS_PER_FLIGHT = 25;
  const SAME_DAY_FEE = 50;
  // Extra crew minutes per heavy item folded into the flat catalog price
  // as a small calculated add-on for THIS itemized preview — the real
  // charged price additionally threads the raw minutes into the cost
  // engine's on-site time (see create-booking's heavy_item_extra_minutes).
  const HEAVY_ITEM_RATE_PER_MINUTE = (20 * 2) / 60; // $20/hr x 2 crew

  // Price each item
  const items = items_detected.map((item) => {
    const catalogMatch = matchItemToCatalog(item.name);
    const avgKg = catalogMatch?.avg_kg || item.estimated_weight_kg || 20;
    const eligibility = checkItemEligibility(item.name, item.estimated_weight_kg || catalogMatch?.avg_kg);
    const isFreon = item.is_freon || catalogMatch?.category === 'freon';
    const isHazmat = item.is_hazmat || false || eligibility.rejected;
    const quantity = item.quantity || 1;
    const heavyHandlingFee = eligibility.needs_equipment
      ? Math.round(eligibility.extra_labor_minutes * HEAVY_ITEM_RATE_PER_MINUTE * quantity)
      : 0;
    const unitPrice = isHazmat ? 0 : (catalogMatch?.price || 25) + (heavyHandlingFee > 0 ? heavyHandlingFee / quantity : 0);
    const lineTotal = Math.round(unitPrice * quantity);
    const donatable = catalogMatch?.donatable ?? true;

    return {
      name: catalogMatch?.is_fallback ? (item.name || catalogMatch?.name) : (catalogMatch?.name || item.name),
      original_name: item.name,
      key: catalogMatch?.key || 'other_medium',
      ultra_heavy: eligibility.ultra_heavy || false,
      needs_equipment: eligibility.needs_equipment || false,
      extra_labor_minutes: eligibility.needs_equipment ? eligibility.extra_labor_minutes * quantity : 0,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      category: catalogMatch?.category || 'misc',
      is_freon: isFreon,
      is_hazmat: isHazmat,
      donatable,
      avg_kg: avgKg,
      note: eligibility.rejected ? eligibility.reason : (catalogMatch?.note || null),
      rejected: eligibility.rejected,
      // Default: everything goes to dump. This drives PRICING
      // (dumpItems below) and stays exactly as before — a customer can
      // still toggle an individual item to 'donate' in the booking UI,
      // which is what actually makes it free, not a category default.
      disposal: eligibility.rejected ? 'not_accepted' : 'dump',
      // Real disposal destination, for display/transparency only
      // (Pricing Engine Phase 8) — never used to decide what's priced,
      // only where an accepted item is actually routed:
      //  - not_accepted: vehicles/prohibited materials/ultra-heavy
      //  - hazmat_review: AI-flagged hazardous, needs a human look
      //  - electronics_recycling: Alberta e-waste program (Eco-Centre),
      //    not the landfill — this business's own documented practice
      //    (see this file's header comment). Still charged normally
      //    (transport/labour isn't free even though disposal is) — see
      //    landfill_weight_kg below, which is what actually changes:
      //    e-waste weight is excluded from the landfill tonnage the
      //    per-tonne fee is based on, since it never reaches the landfill.
      //  - dump: actually landfilled.
      disposal_channel: eligibility.rejected
        ? 'not_accepted'
        : isHazmat
          ? 'hazmat_review'
          : catalogMatch?.category === 'ewaste'
            ? 'electronics_recycling'
            : 'dump',
    };
  });

  // Sum up dump items only (donated items are free — no charge; rejected
  // items — vehicles, too-heavy-for-2-people — are never charged either)
  const dumpItems = items.filter((i) => i.disposal === 'dump' && !i.is_hazmat);
  const subtotal = dumpItems.reduce((s, i) => s + i.line_total, 0);

  const stairs_fee = Math.max(0, stairs) * STAIRS_PER_FLIGHT;
  const same_day_fee = same_day ? SAME_DAY_FEE : 0;

  let total = subtotal + stairs_fee + same_day_fee;
  let is_minimum = false;
  let minimum_applied = 0;

  if (total > 0 && total < MINIMUM_CHARGE) {
    is_minimum = true;
    minimum_applied = MINIMUM_CHARGE - total;
    total = MINIMUM_CHARGE;
  }

  // Weight-based landfill dump fee — informational breakdown only (the
  // per-item catalog prices above already have this baked in at the
  // $120/tonne rate referenced in this file's header comment). Surfaced
  // separately so admin/customer can see it's accounted for, not double-
  // charged on top of the flat per-item prices.
  const acceptedWeightKg = dumpItems.reduce((s, i) => s + i.avg_kg * i.quantity, 0);
  // Pricing Engine Phase 8 — only the ACTUALLY-landfilled portion of the
  // accepted weight counts toward the per-tonne fee. E-waste still gets
  // physically hauled (counts for truck sizing / acceptedWeightKg above)
  // but goes to the e-waste program, not the landfill, so it shouldn't
  // inflate the landfill tonnage this cost is based on.
  const landfillWeightKg = dumpItems
    .filter((i) => i.disposal_channel === 'dump')
    .reduce((s, i) => s + i.avg_kg * i.quantity, 0);
  const estimated_dump_fee = dumpItems.length === 0 ? 0 : Math.max(25, Math.round((landfillWeightKg / 1000) * 120));

  const rejected_items = items.filter((i) => i.rejected);
  // Distinct from a vehicle/hazmat rejection: these need a human decision
  // (accept with extra crew, or confirm refusal), not an automatic
  // exclusion with no path forward. See checkItemEligibility.
  const ultra_heavy_items = items.filter((i) => i.ultra_heavy);
  const heavy_item_extra_minutes = items.reduce((s, i) => s + (i.extra_labor_minutes || 0), 0);

  return {
    items,
    subtotal,
    stairs_fee,
    same_day_fee,
    total,
    is_minimum,
    minimum_applied,
    minimum_charge: MINIMUM_CHARGE,
    deposit: 50,
    balance_due: total - 50,
    estimated_weight_kg: acceptedWeightKg,
    landfill_weight_kg: landfillWeightKg,
    estimated_dump_fee,
    rejected_items,
    ultra_heavy_items,
    heavy_item_extra_minutes,
  };
};

// ============================================================
// Recalculate quote when user changes disposal (dump/donate)
// ============================================================
export const recalcWithDisposal = (items, { stairs = 0, same_day = false } = {}) => {
  const MINIMUM_CHARGE = 99;
  const STAIRS_PER_FLIGHT = 25;
  const SAME_DAY_FEE = 50;

  const dumpItems = items.filter((i) => i.disposal === 'dump' && !i.is_hazmat);
  const subtotal = dumpItems.reduce((s, i) => s + i.line_total, 0);

  const stairs_fee = Math.max(0, stairs) * STAIRS_PER_FLIGHT;
  const same_day_fee = same_day ? SAME_DAY_FEE : 0;

  let total = subtotal + stairs_fee + same_day_fee;
  let is_minimum = false;
  let minimum_applied = 0;

  if (total > 0 && total < MINIMUM_CHARGE) {
    is_minimum = true;
    minimum_applied = MINIMUM_CHARGE - total;
    total = MINIMUM_CHARGE;
  }

  const acceptedWeightKg = dumpItems.reduce((s, i) => s + (i.avg_kg || 0) * i.quantity, 0);
  // Fall back to counting everything if older client state doesn't carry
  // disposal_channel yet — matches buildItemizedQuote's Phase 8 logic.
  const landfillWeightKg = dumpItems
    .filter((i) => i.disposal_channel === undefined || i.disposal_channel === 'dump')
    .reduce((s, i) => s + (i.avg_kg || 0) * i.quantity, 0);
  const estimated_dump_fee = dumpItems.length === 0 ? 0 : Math.max(25, Math.round((landfillWeightKg / 1000) * 120));
  const rejected_items = items.filter((i) => i.rejected);

  return {
    items,
    subtotal,
    stairs_fee,
    same_day_fee,
    total,
    is_minimum,
    minimum_applied,
    minimum_charge: MINIMUM_CHARGE,
    estimated_weight_kg: acceptedWeightKg,
    landfill_weight_kg: landfillWeightKg,
    estimated_dump_fee,
    rejected_items,
    deposit: 50,
    balance_due: total - 50,
  };
};
