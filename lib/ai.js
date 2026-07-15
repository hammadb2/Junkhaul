// ============================================================
// PHOTO / DESCRIPTION AI — Gemini 2.0 Flash (excellent vision).
// Falls back to Groq Llama-4-Scout if Gemini is unavailable.
// ============================================================

import { sendSMS } from './sms';
import { supabaseAdmin } from './supabase';

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Owner/internal alert number. Defaults to the business line; override via env.
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+15873250751';

// ------------------------------------------------------------
// Gemini vision call — sends photos + text prompt, returns text.
// Gemini 2.0 Flash is fast (~1-2s) and far more accurate at
// image recognition than Llama-4-Scout.
// ------------------------------------------------------------
async function geminiVisionCompletion(photos_base64, textPrompt, maxTokens = 800) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const parts = [
    ...photos_base64.map((photo) => ({
      inline_data: {
        mime_type: 'image/jpeg',
        data: photo,
      },
    })),
    { text: textPrompt },
  ];

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// ------------------------------------------------------------
// Groq text-only call (for description analysis, no photos).
// ------------------------------------------------------------
async function groqChatCompletion(messages, maxTokens = 800) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content;
}

// ------------------------------------------------------------
// Items we CANNOT take. Two groups:
//   1. Hazmat / dangerous goods — excluded from load + price.
//   2. Food / perishables — excluded from load + price, with a
//      special "empty the appliance first" message when a
//      fridge/freezer/cooler/pantry/cabinet is still stocked.
// Freon appliances are NOT excluded — they are surcharged ($40 each).
// ------------------------------------------------------------
const REJECTED_ITEMS = `Items we CANNOT take (flag has_hazmat=true, mark the item is_hazmat=true, exclude from load/price estimate, and tell the customer to remove it before pickup):

HAZARDOUS / DANGEROUS GOODS:
- Asbestos-containing materials (old vinyl/asphalt floor tiles, popcorn ceilings, vermiculite attic insulation, asbestos cement siding/pipe, old boiler insulation)
- Paint, solvents, stains, varnishes, shellac, and household chemicals — UNLESS clearly empty and fully dried out
- Gasoline, motor oil, diesel, kerosene, heating oil, and other fuels
- Propane tanks and any other pressurized gas cylinders (CO2, helium, acetylene, oxygen)
- Pesticides, herbicides, fungicides, fertilizers, and lawn/garden chemicals
- Medical waste, used sharps, needles, syringes, lancets, and biohazard material
- Ammunition, firearms, fireworks, explosives, and flares
- Radioactive materials or anything requiring certified hazmat disposal
- Human or animal remains (including ashes/urnns)
- Wet paint cans (any with liquid paint inside) and aerosol cans (pressurized)
- Large quantities of liquid waste (drum/barrel of unknown liquid, bulk oil, etc.)
- Car batteries, tires (we don't take these either)

FOOD / PERISHABLES (municipal organics collection, not general junk removal):
- Perishable or spoiled food of any kind
- Open or partially used food containers / packaging
- Food waste in general (compostable or not)
- Liquids in food containers (beverages, sauces, soups, oils, etc.)

IMPORTANT FOOD NUANCE — empty vs stocked appliances:
- An EMPTY fridge, freezer, cooler, pantry, or cabinet is FINE — we take the appliance. Do NOT flag it.
- A fridge / freezer / cooler that is STILL STOCKED with food: do NOT mark the appliance is_hazmat (the appliance itself is takeable and stays priced), BUT set has_hazmat=true and put a clear hazmat_description like: "Refrigerator still contains food — please empty it first before we can take it." List the appliance in freon_items as normal.
- A pantry / cabinet / shelf visibly full of packaged food in the photo: same — set has_hazmat=true with hazmat_description like "Pantry still contains food — please remove food items first before we can take it." Do not mark the cabinet/shelf itself as a hazmat item.`;

// ------------------------------------------------------------
// Privacy / silence rules. The model must NEVER describe, log,
// reference, or comment on these — not in notes, not in
// items_detected, not in any field — even though it can see them.
// ------------------------------------------------------------
const PRIVACY_RULES = `PRIVACY — NEVER DESCRIBE, LOG, OR REFERENCE any of the following, in ANY output field (not notes, not items_detected, not hazmat_description, nowhere). These are not "items we won't take" and must NOT be flagged. Act as if they are not relevant to the job, because they are not:

- Personal identifying documents visible in the background: mail, envelopes, bank/credit card statements, bills, IDs, passports, anything with an account number, address label, or signature. Never transcribe or repeat any name, address, account number, or document content.
- People's faces or identities: anyone visible in frame, family photos on walls, framed portraits, reflections in mirrors/windows/screens. Never identify, count, or describe people.
- Medications, medical equipment, mobility aids (canes, walkers, wheelchairs, oxygen equipment). Never mention these.
- Anything that reads as commentary on someone's living conditions, cleanliness, or financial situation. No "cluttered", "hoarding", "messy", "run-down", "appears unoccupied", "low-income", or any "this looks like X" language about how someone lives. Describe only the junk itself.
- Religious, cultural, or personal items (books, icons, altars, ceremonial objects). No commentary.
- Weapons present in the home but NOT part of the junk being removed (e.g. a legally stored firearm or hunting bow visible on a garage rack). The job is the junk, not the household. Do not mention them. NOTE: ammunition/firearms/explosives that ARE part of the junk to be removed ARE flagged as hazmat above — that is the only exception.
- Anything sexual or intimate accidentally in frame: if a photo is unusable for this reason, set photo_unusable=true and return ONLY the photo_unusable field as true with every other field null/empty and no descriptive text of any kind. Never describe why.

Your output must be ONLY about the junk/load-relevant contents. If in doubt, omit.`;

// ------------------------------------------------------------
// Safety alert — the ONE narrow exception to silence. Internal
// only, never shown to the customer. Fires for a serious safety
// hazard visible in the photo, not a policy exclusion.
// ------------------------------------------------------------
const SAFETY_ALERT_RULES = `SAFETY ALERT (internal only — never shown to the customer): If the photo clearly shows a SERIOUS, ACTIVE safety hazard — a person in immediate physical danger, an active fire, a major active water flood, signs of a gas leak, severe structural collapse risk, visible extensive mold / water damage, a pest infestation, or drug paraphernalia — set safety_alert=true and write a short factual safety_alert_summary (one or two sentences, no commentary, no identifying info about people). This is routed privately to the operator only and is stripped from the customer-facing response. Do NOT mention it in notes or any customer-visible field. If no such hazard is present, safety_alert=false and safety_alert_summary=null.`;

const ESTIMATOR_RULES = `15-foot U-Haul dimensions: 15ft long x 7.5ft wide x 7ft tall = ~785 cubic feet.
Load sizes (for 2 people):
- single_item: 1-2 large items only (couch, mattress, fridge, single appliance) — max 150kg
- quarter: fills ~1/4 of truck, a few items and boxes — max 300kg
- half: fills ~1/2 of truck of misc household junk — max 500kg
- full: fills whole truck, garage/estate cleanout — max 700kg

Flag for review if:
- Weight likely exceeds 85% of the weight limit for selected size
- Any single item likely weighs over 80kg (needs 3+ people or equipment)
- Estate or whole-property cleanout requiring multiple truckloads
- Items outside safely (car engine blocks, concrete, heavy machinery)

${REJECTED_ITEMS}

Freon appliances (fridge, freezer, AC, water cooler, dehumidifier) are NOT rejected — they are takeable with a $40 certified-disposal surcharge each. Count them in freon_count/freon_items. Only flag a freon appliance as hazmat if it still contains food (see FOOD NUANCE above).`;

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

// JSON schema block shared by photo + description analysis.
const SCHEMA_BLOCK = `{
  "load_size": "single_item|quarter|half|full",
  "estimated_weight_kg": number,
  "has_freon": boolean,
  "freon_count": number,
  "freon_items": ["list of freon appliances seen, e.g. fridge, freezer, AC unit"],
  "has_hazmat": boolean,
  "hazmat_description": "string or null — customer-facing reason; for a stocked fridge/pantry use the 'please empty first' wording",
  "hazmat_items": ["list of rejected items if any"],
  "stairs_visible": boolean,
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null",
  "photo_unusable": boolean,
  "safety_alert": boolean,
  "safety_alert_summary": "string or null — internal only, never customer-facing",
  "items_detected": [
    {"name": "item name", "quantity": 1, "estimated_weight_kg": 30, "is_freon": false, "is_hazmat": false}
  ],
  "notes": "brief summary of the JUNK ONLY for the customer to review"
}`;

// photos_base64: array of raw base64 strings (no data: prefix)
export const analysePhotos = async (photos_base64) => {
  const prompt = `You are a junk removal estimator for a 15-foot U-Haul truck operated by 2 people.

Analyse these photos and return ONLY valid JSON with no other text:
${SCHEMA_BLOCK}

IMPORTANT: List EVERY junk item you can identify in items_detected. The customer needs to see this list to confirm or correct it. Count freon appliances carefully (fridges, freezers, AC units, water coolers, dehumidifiers) since each one is a $40 charge.

CRITICAL ACCURACY RULES:
- You are looking at photos of JUNK/ITEMS that need to be hauled away. Identify ONLY the junk items.
- Do NOT identify people, humans, body parts, or living beings as items. If a person is visible in the photo, IGNORE them entirely. Never list a person as an item.
- Do NOT hallucinate items that are not clearly visible. If you are not sure what something is, say so with confidence "low" rather than guessing.
- Do NOT confuse common household objects with appliances. A couch is not a refrigerator. A box is not a freezer. A person is not an appliance.
- Only list items as freon appliances if you can clearly see they are a fridge, freezer, AC unit, water cooler, or dehumidifier. Do not guess.
- If the photo shows a person but no junk, set photo_unusable=true and return ONLY {"photo_unusable": true}.
- If the photo is unclear, blurry, or you cannot identify the items with confidence, set confidence to "low" and note what you can see.

${ESTIMATOR_RULES}

${PRIVACY_RULES}

${SAFETY_ALERT_RULES}

If photo_unusable is true, return ONLY {"photo_unusable": true} with every other field null/empty/false and NO descriptive text.`;

  // Try Gemini first (much better vision), fall back to Groq
  try {
    const content = await geminiVisionCompletion(photos_base64, prompt, 800);
    return parseJson(content);
  } catch (geminiErr) {
    console.error('Gemini analysePhotos failed, falling back to Groq:', geminiErr.message);
    try {
      const content = await groqChatCompletion(
        [
          {
            role: 'user',
            content: [
              ...photos_base64.map((photo) => ({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${photo}` },
              })),
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        800
      );
      return parseJson(content);
    } catch (groqErr) {
      console.error('Groq analysePhotos error:', groqErr.message);
      throw new Error(`Photo analysis failed: ${groqErr.message || 'unknown error'}`);
    }
  }
};

// ============================================================
// PHOTO DIFF ANALYSIS
//
// When a customer uploads a photo that is similar (but not identical)
// to a previous upload — detected via perceptual hash — we send BOTH
// the old and new photos to the vision model and ask it to identify
// ONLY what has changed. Prices for unchanged items are then locked
// to their originally quoted amounts; only genuinely new items are
// priced fresh, and removed items are dropped from the quote.
//
//   newPhotos_base64     — array of raw base64 strings (current upload)
//   oldPhotos_base64     — array of raw base64 strings (previous upload)
//   previousAnalysis     — the analysis object stored for the previous upload
// ============================================================
export const analysePhotoDiff = async (newPhotos_base64, oldPhotos_base64, previousAnalysis) => {
  const previousItems = previousAnalysis?.items_detected || [];
  const previousItemsStr = JSON.stringify(previousItems, null, 2);

  const prompt = `You are comparing two sets of photos of junk for removal. The FIRST set is the customer's previous upload, and the SECOND set is their new upload.

The previous analysis found these items:
${previousItemsStr}

Compare the new photos against the previous ones. Identify ONLY what has changed:
- Items that are NEW (added to the pile since last photo)
- Items that are GONE (removed from the pile since last photo)
- Items that are UNCHANGED (still present — keep their original pricing)

Return ONLY valid JSON:
{
  "added_items": [{"name": "item name", "quantity": 1, "estimated_weight_kg": 20, "is_freon": false, "is_hazmat": false}],
  "removed_items": [{"name": "item name", "quantity": 1}],
  "unchanged_items": [{"name": "item name", "quantity": 1, "estimated_weight_kg": 30, "is_freon": false, "is_hazmat": false}],
  "load_size": "single_item|quarter|half|full",
  "estimated_weight_kg": number,
  "has_hazmat": boolean,
  "hazmat_description": "string or null",
  "has_freon": boolean,
  "freon_count": number,
  "freon_items": ["list of freon appliances currently present"],
  "stairs_visible": boolean,
  "confidence": "high|medium|low",
  "flag_for_review": boolean,
  "flag_reason": "string or null",
  "photo_unusable": boolean,
  "safety_alert": boolean,
  "safety_alert_summary": "string or null — internal only, never customer-facing",
  "notes": "brief summary of what changed"
}

IMPORTANT:
- Items that are still present in the new photos should be listed in unchanged_items with their ORIGINAL name and weight from the previous analysis. Do NOT re-estimate their weight.
- Only estimate weights for genuinely NEW items in added_items.
- The load_size and estimated_weight_kg should reflect the TOTAL current state (unchanged + added - removed).
- If nothing changed, return empty arrays for added and removed.
- Count freon appliances carefully across the CURRENT state (unchanged + added).
- Do NOT identify people, humans, body parts, or living beings as items. IGNORE any people visible in photos.

${ESTIMATOR_RULES}

${PRIVACY_RULES}

${SAFETY_ALERT_RULES}

If photo_unusable is true, return ONLY {"photo_unusable": true} with every other field null/empty/false and NO descriptive text.`;

  // Combine old + new photos for Gemini (it takes a single array of parts)
  const allPhotos = [...oldPhotos_base64, ...newPhotos_base64];

  try {
    const content = await geminiVisionCompletion(allPhotos, prompt, 800);
    return parseJson(content);
  } catch (geminiErr) {
    console.error('Gemini analysePhotoDiff failed, falling back to Groq:', geminiErr.message);
    try {
      const content = await groqChatCompletion(
        [
          {
            role: 'user',
            content: [
              ...oldPhotos_base64.map((photo) => ({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${photo}` },
              })),
              ...newPhotos_base64.map((photo) => ({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${photo}` },
              })),
              { type: 'text', text: prompt },
            ],
          },
        ],
        800
      );
      return parseJson(content);
    } catch (groqErr) {
      console.error('Groq analysePhotoDiff error:', groqErr.message);
      throw new Error(`Photo diff analysis failed: ${groqErr.message || 'unknown error'}`);
    }
  }
};

export const analyseDescription = async (description) => {
  try {
    const content = await groqChatCompletion(
      [
        {
          role: 'user',
          content: `You are a junk removal estimator. Customer described their junk as: "${description}"

Return ONLY valid JSON with no other text:
${SCHEMA_BLOCK}

Pricing reference:
- single_item: $99 (1 couch, 1 mattress, 1 fridge, 1-2 large items max)
- quarter: $160 (a few items and some boxes)
- half: $240 (half a truck of misc household junk)
- full: $380 (garage cleanout, estate cleanout, full truck)

Freon appliances (fridge, freezer, AC, water cooler, dehumidifier): $40 EACH.
Stairs: $25 per flight.

Weight limits (2 people, 15ft U-Haul):
- single_item: max 150kg
- quarter: max 300kg
- half: max 500kg
- full: max 700kg

Flag if weight exceeds 85% of limit or any rejected item is mentioned.

${REJECTED_ITEMS}

${PRIVACY_RULES}

${SAFETY_ALERT_RULES}

List EVERY item the customer mentioned in items_detected. Count freon appliances carefully. Set photo_unusable=false for a text description (it only applies to photos).`,
        },
      ],
      700
    );

    return parseJson(content);
  } catch (err) {
    console.error('Groq analyseDescription error:', err.message);
    throw new Error(`Description analysis failed: ${err.message || 'unknown error'}`);
  }
};

// ============================================================
// SAFETY ALERT + PRIVACY HANDLING (shared by /api/analyze and
// the SMS/WhatsApp photo-quote webhooks).
//
// The safety alert is INTERNAL ONLY. It is never included in
// any customer-facing response. It is sent via SMS to the
// operator and logged in the safety_alerts table.
// ============================================================

// Fields that must never reach the customer's browser / SMS body.
const INTERNAL_FIELDS = ['safety_alert', 'safety_alert_summary'];

// Remove internal-only fields before returning analysis to any
// customer-facing channel (HTTP response, SMS, WhatsApp).
export const stripInternalFields = (analysis) => {
  if (!analysis || typeof analysis !== 'object') return analysis;
  const cleaned = { ...analysis };
  for (const f of INTERNAL_FIELDS) delete cleaned[f];
  return cleaned;
};

// If the analysis raised a safety alert, notify the operator
// (SMS) and log it internally. Returns true if an alert was
// fired. Best-effort: never throws into the caller's flow.
//
// context: { source, booking_id?, lead_phone?, photo_urls? }
export const handleSafetyAlert = async (analysis, context = {}) => {
  try {
    if (!analysis || !analysis.safety_alert) return false;

    const summary = (analysis.safety_alert_summary || 'Safety hazard detected in customer photo.').toString().slice(0, 300);
    const where = context.source ? `[${context.source}] ` : '';
    const bookingPart = context.booking_id ? ` Booking ${context.booking_id}.` : '';
    const phonePart = context.lead_phone ? ` Lead phone ${context.lead_phone}.` : '';
    const smsBody = `${where}SAFETY ALERT (auto, from photo scan): ${summary}${bookingPart}${phonePart} — review immediately.`;

    // 1) SMS the operator directly.
    try {
      await sendSMS(ADMIN_PHONE, smsBody, context.booking_id || null, 'safety_alert');
    } catch (smsErr) {
      console.error('Safety alert SMS failed:', smsErr.message);
    }

    // 2) Internal DB log (admin-only, never customer-facing).
    try {
      await supabaseAdmin.from('safety_alerts').insert({
        summary,
        source: context.source || null,
        booking_id: context.booking_id || null,
        lead_phone: context.lead_phone || null,
        photo_urls: Array.isArray(context.photo_urls) ? context.photo_urls : null,
        sms_sent: true,
      });
    } catch (dbErr) {
      // Table may not exist yet on environments that haven't run the migration.
      console.error('Safety alert DB log failed:', dbErr.message);
    }

    return true;
  } catch (err) {
    console.error('handleSafetyAlert error:', err.message);
    return false;
  }
};
