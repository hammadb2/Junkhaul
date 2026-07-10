import Groq from 'groq-sdk';

// ============================================================
// PHOTO / DESCRIPTION AI — Groq (Llama 4 Scout, vision-capable).
// Drop-in replacement for the original Anthropic Claude spec.
// ============================================================
// Lazily initialised so importing this module never requires the API key
// (keeps `next build` working without env vars). Constructed on first access.
let _groq = null;
function getGroq() {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');
  _groq = new Groq({ apiKey });
  return _groq;
}

const groq = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getGroq();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const ESTIMATOR_RULES = `15-foot U-Haul dimensions: 15ft long x 7.5ft wide x 7ft tall = ~785 cubic feet.
Load sizes (for 2 people):
- single_item: 1-2 large items only (couch, mattress, fridge, single appliance) — max 150kg
- quarter: fills ~1/4 of truck, a few items and boxes — max 300kg
- half: fills ~1/2 of truck of misc household junk — max 500kg
- full: fills whole truck, garage/estate cleanout — max 700kg

Flag for review if:
- Weight likely exceeds 85% of the weight limit for selected size
- Any single item likely weighs over 80kg (needs 3+ people or equipment)
- Hazmat items visible: chemicals, paint cans, propane tanks, asbestos, gas containers
- Estate or whole-property cleanout requiring multiple truckloads
- Items outside safely (car engine blocks, concrete, heavy machinery)

Hazmat items we CANNOT take:
- Open paint cans, pool chemicals, pesticides, gasoline, motor oil
- Propane tanks, asbestos, medical waste, car batteries, tires`;

// Parse model output that may be wrapped in ```json fences or contain prose.
const parseJson = (text) => {
  if (!text) throw new Error('Empty AI response');
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
};

// photos_base64: array of raw base64 strings (no data: prefix)
export const analysePhotos = async (photos_base64) => {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            ...photos_base64.map((photo) => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${photo}` },
            })),
            {
              type: 'text',
              text: `You are a junk removal estimator for a 15-foot U-Haul truck operated by 2 people.

Analyse these photos and return ONLY valid JSON with no other text:
{
  "load_size": "single_item|quarter|half|full",
  "estimated_weight_kg": number,
  "has_freon": boolean,
  "freon_count": number,
  "freon_items": ["list of freon appliances seen, e.g. fridge, freezer, AC unit"],
  "has_hazmat": boolean,
  "hazmat_description": "string or null",
  "hazmat_items": ["list of hazmat items if any"],
  "stairs_visible": boolean,
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null",
  "items_detected": [
    {"name": "item name", "quantity": 1, "estimated_weight_kg": 30, "is_freon": false, "is_hazmat": false}
  ],
  "notes": "brief summary of what you see for the customer to review"
}

IMPORTANT: List EVERY item you can identify in items_detected. The customer needs to see this list to confirm or correct it. Count freon appliances carefully (fridges, freezers, AC units, water coolers) since each one is a $40 charge.

${ESTIMATOR_RULES}`,
            },
          ],
        },
      ],
    });

    return parseJson(response.choices[0]?.message?.content);
  } catch (err) {
    console.error('Groq analysePhotos error:', err.message, err.status, err.code);
    throw new Error(`Photo analysis failed: ${err.message || err.code || 'unknown error'}`);
  }
};

export const analyseDescription = async (description) => {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `You are a junk removal estimator. Customer described their junk as: "${description}"

Return ONLY valid JSON with no other text:
{
  "load_size": "single_item|quarter|half|full",
  "estimated_weight_kg": number,
  "has_freon": boolean,
  "freon_count": number,
  "freon_items": ["list of freon appliances mentioned"],
  "has_hazmat": boolean,
  "hazmat_description": "string or null",
  "hazmat_items": ["list of hazmat items if any"],
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null",
  "items_detected": [
    {"name": "item name", "quantity": 1, "estimated_weight_kg": 30, "is_freon": false, "is_hazmat": false}
  ],
  "notes": "brief summary for the customer to review"
}

Pricing reference:
- single_item: $99 (1 couch, 1 mattress, 1 fridge, 1-2 large items max)
- quarter: $160 (a few items and some boxes)
- half: $240 (half a truck of misc household junk)
- full: $380 (garage cleanout, estate cleanout, full truck)

Freon appliances (fridge, freezer, AC, water cooler): $40 EACH.
Stairs: $25 per flight.

Weight limits (2 people, 15ft U-Haul):
- single_item: max 150kg
- quarter: max 300kg
- half: max 500kg
- full: max 700kg

Flag if weight exceeds 85% of limit or hazmat items mentioned.
Hazmat: paint, chemicals, propane, gas, asbestos, medical waste, car batteries, tires

List EVERY item the customer mentioned in items_detected. Count freon appliances carefully.`,
        },
      ],
    });

    return parseJson(response.choices[0]?.message?.content);
  } catch (err) {
    console.error('Groq analyseDescription error:', err.message, err.status, err.code);
    throw new Error(`Description analysis failed: ${err.message || err.code || 'unknown error'}`);
  }
};
