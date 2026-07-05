import Groq from 'groq-sdk';

// ============================================================
// PHOTO / DESCRIPTION AI — Groq (Llama 4 Scout, vision-capable).
// Drop-in replacement for the original Anthropic Claude spec.
// ============================================================
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
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
  "has_hazmat": boolean,
  "hazmat_description": "string or null",
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null",
  "notes": "string"
}

${ESTIMATOR_RULES}`,
          },
        ],
      },
    ],
  });

  return parseJson(response.choices[0]?.message?.content);
};

export const analyseDescription = async (description) => {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
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
  "has_hazmat": boolean,
  "hazmat_description": "string or null",
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null"
}

Pricing reference:
- single_item: $99 (1 couch, 1 mattress, 1 fridge, 1-2 large items max)
- quarter: $160 (a few items and some boxes)
- half: $240 (half a truck of misc household junk)
- full: $380 (garage cleanout, estate cleanout, full truck)

Weight limits (2 people, 15ft U-Haul):
- single_item: max 150kg
- quarter: max 300kg
- half: max 500kg
- full: max 700kg

Flag if weight exceeds 85% of limit or hazmat items mentioned.
Hazmat: paint, chemicals, propane, gas, asbestos, medical waste, car batteries, tires`,
      },
    ],
  });

  return parseJson(response.choices[0]?.message?.content);
};
