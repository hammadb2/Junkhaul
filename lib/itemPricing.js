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
      return ITEM_PRICING[key] ? { key, ...ITEM_PRICING[key] } : null;
    }
  }

  // Size-based fallback
  if (/small|tiny|little/.test(lower)) {
    return { key: 'other_small', ...ITEM_PRICING.other_small };
  }
  if (/large|big|heavy|huge/.test(lower)) {
    return { key: 'other_large', ...ITEM_PRICING.other_large };
  }

  return { key: 'other_medium', ...ITEM_PRICING.other_medium };
};

// ============================================================
// Build itemized quote from AI-detected items
// ============================================================
export const buildItemizedQuote = (items_detected, { stairs = 0, same_day = false } = {}) => {
  if (!items_detected || items_detected.length === 0) {
    return { items: [], subtotal: 0, stairs_fee: 0, same_day_fee: 0, total: 0, is_minimum: false, minimum_applied: 0 };
  }

  const MINIMUM_CHARGE = 99;
  const STAIRS_PER_FLIGHT = 25;
  const SAME_DAY_FEE = 50;

  // Price each item
  const items = items_detected.map((item) => {
    const catalogMatch = matchItemToCatalog(item.name);
    const isFreon = item.is_freon || catalogMatch?.category === 'freon';
    const isHazmat = item.is_hazmat || false;
    const quantity = item.quantity || 1;
    const unitPrice = isHazmat ? 0 : (catalogMatch?.price || 25);
    const lineTotal = unitPrice * quantity;

    return {
      name: catalogMatch?.name || item.name,
      original_name: item.name,
      key: catalogMatch?.key || 'other_medium',
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      category: catalogMatch?.category || 'misc',
      is_freon: isFreon,
      is_hazmat: isHazmat,
      donatable: catalogMatch?.donatable ?? true,
      avg_kg: catalogMatch?.avg_kg || item.estimated_weight_kg || 20,
      note: catalogMatch?.note || null,
      // Default: everything goes to dump
      disposal: 'dump',
    };
  });

  // Sum up dump items only (donated items are free — no charge)
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
  };
};
