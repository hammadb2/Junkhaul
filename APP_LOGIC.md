# Every Piece of Logic in the App — Junk Haul Calgary

## PART 1: PRICING ENGINE (lib/pricing.js)

### Base Prices
- single_item: $99 (1-2 large items, max 150kg)
- quarter: $160 (few items + boxes, ~1/4 truck, max 300kg)
- half: $240 (half truck, max 500kg)
- full: $380 (full truck, garage cleanout, max 700kg)

### Add-ons
- Same-day rush: +$50
- Stairs: +$25 per flight
- Freon appliances (fridge, freezer, AC): +$40 EACH (per item, not flat)
- Deposit: always $50 regardless of job size

### Dynamic Pricing
- 7:00 AM slots get a 5% discount (0.95 multiplier) to fill hard-to-book early slots
- All other times: 1.0 (no surge pricing currently)
- Multiplier applies to base + stairs + freon, THEN same-day fee is added on top

### Price Calculation Flow
1. Look up base price for load_size
2. Add same_day fee if applicable
3. Add stairs_fee = stairs_count × $25
4. Add freon_fee = freon_count × $40 (if has_freon, min 1 item)
5. Apply dynamic multiplier to (base + stairs + freon)
6. Add same_day fee after multiplier
7. total = subtotal + same_day_fee
8. balance_due = total - $50 deposit

### Internal Cost Calculation (not shown to customer)
- Truck cost: U-Haul $40.99/day + $1.99/km
- KM estimated by quadrant: NE=15km, NW=25km, SE=30km, SW=35km
- Dump fees by load: single=$20, quarter=$40, half=$80, full=$140
- Profit = total_price - (truck_cost + dump_cost)
- Margin = profit / total_price × 100

### Weight Safety Check
- If estimated weight ≥ 100% of limit: HARD flag, "call customer before confirming"
- If estimated weight ≥ 85% of limit: SOFT flag, "note in booking"
- Limits: single=150kg, quarter=300kg, half=500kg, full=700kg

### Landfill Selection
- Sunday jobs → East Calgary Landfill (only one open Sundays)
- Saturday jobs → Spyhill Landfill
- Weekdays → East Calgary Landfill

---

## PART 2: AI PHOTO ANALYSIS (lib/ai.js)

### Model
- Groq API, model: meta-llama/llama-4-scout-17b-16e-instruct
- Temperature: 0.2 (low creativity, consistent estimates)
- Max tokens: 800 (photos) / 700 (descriptions)

### Photo Analysis (analysePhotos)
- Takes base64-encoded photos
- Sends to Groq with vision capability
- Returns JSON: load_size, estimated_weight_kg, has_freon, freon_count, freon_items, has_hazmat, hazmat_description, hazmat_items, stairs_visible, confidence, flag_for_review, flag_reason, photo_unusable, safety_alert, safety_alert_summary, items_detected (name, quantity, weight, is_freon, is_hazmat), notes
- Rules: 15ft U-Haul dimensions, weight limits per load size, expanded rejection list (see below), privacy/silence rules, safety-alert rules

### Items we CANNOT take (has_hazmat flow — flag, exclude from load/price, show customer a reason)
- Hazardous/dangerous goods: asbestos-containing materials (old tiles, popcorn ceiling, vermiculite insulation), paint/solvents/chemicals (unless clearly empty/dried), gasoline/motor oil/fuels, propane tanks & pressurized cylinders, pesticides/herbicides/lawn chemicals, medical waste/sharps/needles, ammunition/firearms/explosives, radioactive materials, human/animal remains, wet paint cans, aerosol cans, large quantities of liquid waste, car batteries, tires
- Food/perishables: spoiled/perishable food, open/partially used food containers, food waste (compostable or not), liquids in food containers
- Food nuance: an EMPTY fridge/freezer/cooler/pantry/cabinet is fine (not flagged). A STOCKED one sets has_hazmat=true with a "please empty it first" hazmat_description, but the appliance/cabinet itself stays priced (is_hazmat=false on the item). Freon appliances are NOT excluded — $40 surcharge each, only flagged if still stocked with food.

### Privacy / silence (built into the prompt — never describe, log, or reference)
The AI must never output anything about (in any field): personal identifying documents in the background (mail, statements, IDs, account numbers), people's faces/identities (family photos, reflections), medications/medical equipment/mobility aids, commentary on living conditions or finances, religious/cultural/personal items, household weapons not part of the junk, or sexual/intimate content. If a photo is unusable due to intimate content, it returns photo_unusable=true with no descriptive text, and the customer is shown a generic "photo unusable, please retake" message.

### Safety alert (narrow exception to silence — INTERNAL ONLY)
If the photo clearly shows a serious safety hazard (person in immediate danger, active fire, major flood, gas leak signs, severe structural collapse risk, extensive mold/water damage, pest infestation, drug paraphernalia), the AI sets safety_alert=true + safety_alert_summary. handleSafetyAlert() in lib/ai.js sends an SMS to the operator (ADMIN_PHONE, default +15873250751) and logs a row in the safety_alerts table. stripInternalFields() removes safety_alert/safety_alert_summary from every customer-facing response (web, SMS, WhatsApp). The customer never sees it.

### Description Analysis (analyseDescription)
- Same output but from text description instead of photos
- Includes pricing reference in the prompt so AI can estimate load size accurately
- Same rejection list, privacy, and safety-alert rules as photo analysis (photo_unusable is always false for text)

### JSON Parsing
- Strips ```json fences if present
- Extracts first { to last } to handle prose around JSON
- Throws on empty response

---

## PART 3: BOOKING CREATION (app/api/create-booking/route.js)

### Flow
1. Validate required fields: name, phone, address, load_size, job_date, job_time
2. Validate load_size is in allowed set
3. Check slot availability in schedule table (jobs_booked < max_jobs AND is_available)
4. Calculate price server-side (never trust client price)
5. Geocode address:
   - If frontend provided address_data with lat/lng, use that
   - Otherwise call geocodeAddress() (Nominatim/OSM)
   - Derive quadrant from lat/lng or address text
6. Check weight safety flag
7. Check for upgrade suggestion (AI estimated bigger load than selected)
8. Insert booking with status 'pending_payment'
9. Create Stripe $50 deposit PaymentIntent
10. Store stripe_payment_intent_id on booking
11. Return booking_id, booking_ref, client_secret for Stripe

### Upgrade Detection
- If ai_load_estimate exists and is bigger than selected load_size
- Sets upgrade_pending=true, suggested_load_size, suggested_price
- Customer gets an upgrade SMS after booking is confirmed

---

## PART 4: STRIPE PAYMENT (lib/stripe.js + app/api/stripe-webhook/route.js)

### Deposit Payment Creation
- $50.00 CAD (5000 cents)
- Statement descriptor: "JUNK HAUL CALGARY DEPOSIT"
- Automatic payment methods enabled (card, Apple Pay, Google Pay)
- No redirects (inline payment)
- Metadata: booking_id, customer_name, type=deposit

### Stripe Webhook Flow
1. Verify Stripe signature with webhook secret
2. On payment_intent.succeeded:
   - Look up booking by metadata.booking_id
   - Check if already deposit_paid (idempotency guard)
   - Update booking: deposit_paid=true, deposit_paid_at, stripe_charge_id, status='confirmed'
   - Call increment_slot RPC to reserve the time slot
   - Call handleBookingConfirmed() for all post-booking logic
3. On payment_intent.payment_failed:
   - Log warning (no customer notification at this stage)
4. Return 200 even on internal errors (prevent Stripe retry storms)

---

## PART 5: POST-BOOKING CONFIRMED HANDLER (lib/bookingActions.js)

### Triggered after deposit payment succeeds. Idempotent (guarded by confirmation_sms_sent).

### Steps:
1. Calculate no-show risk score
2. Mark confirmation_sms_sent=true
3. Send customer confirmation SMS (booking ref, date, time, address, total, balance)
4. Send operator alert SMS (includes flags: no photos, heavy load, freon, stairs, apartment, customer notes)
5. If customer has email: send branded HTML confirmation email (via Resend)
6. If flag_for_review: send heavy load alerts to BOTH operator and customer
7. If upgrade_pending: send upgrade request SMS with price difference

---

## PART 6: NO-SHOW PREDICTION (lib/noshow.js)

### Risk Score Calculation (0-100, higher = more likely to no-show)
- Lead time > 7 days: +35
- Lead time > 5 days: +25
- Lead time > 3 days: +15
- Lead time > 1 day: +5
- No photo submitted (photo_skipped): +20
- Source is phone or vapi: +10
- Already rescheduled once: +25
- Job time 07:30: +10
- Job time 09:00: +5
- Sunday job: +5
- Capped at 100

### Action taken based on score
- High risk → extra reminder SMS sent before pickup

---

## PART 7: CANCELLATION LOGIC (lib/cancellations.js)

### Policy Tiers
- **Operator cancels**: full $50 refund, priority rebook
- **> 24 hours before job**: full $50 refund
- **2-24 hours before job**: deposit kept (non-refundable)
- **< 2 hours before job**: deposit kept, note about 25% if truck en route
- **No-show**: deposit kept

### Cancellation Flow
1. Look up booking, verify not already cancelled/completed
2. Calculate hours until job
3. Determine policy tier
4. If refund applicable AND has Stripe payment: process Stripe refund
5. Update booking: status='cancelled', reason, cancelled_by, cancelled_at, refund_amount, refund_processed, refund_stripe_id
6. Free the time slot (decrement_slot RPC)
7. Send customer SMS (refund or non-refundable message)
8. Send operator alert SMS with cancellation details
9. Notify waitlist for the freed slot

---

## PART 8: RESCHEDULE LOGIC (lib/reschedule.js)

### Rules
- Maximum 2 reschedules per booking
- New slot must have availability (jobs_booked < max_jobs)
- Preserves original_job_date/time on first reschedule only

### Flow
1. Look up booking
2. Check reschedule_count < 2
3. Check new slot availability
4. Update booking: new date/time, reschedule_count+1, status='confirmed'
5. Free old slot (decrement_slot)
6. Fill new slot (increment_slot)
7. Send customer confirmation SMS with new details
8. Notify waitlist for the freed old slot

---

## PART 9: WAITLIST LOGIC (lib/waitlist.js)

### Add to Waitlist
1. Insert: name, phone, preferred_day_type, load_size, address
2. Send confirmation SMS

### Notify Waitlist (when a slot frees up)
1. Find oldest un-notified waitlist entry matching the day type (or 'either')
2. Must not be already converted, must not be expired
3. Mark as notified, set 30-minute response window
4. Send SMS: "a spot opened up, reply YES within 30 minutes"
5. Called by: cancelBooking() and rescheduleBooking()

---

## PART 10: SMS CONVERSATION ENGINE (app/api/sms-webhook/route.js)

### Deduplication
- Extract messageId from Quo payload
- Check messages table for existing provider_sid = messageId
- If found, return immediately (prevents duplicate replies from Quo retries)

### Inbound Message Logging
- Every inbound SMS is logged to messages table with provider_sid for dedup

### STOP/HELP (regulatory keywords)
- STOP/UNSUBSCRIBE → opt-out confirmation
- HELP → company info + opt-out instructions

### Photo Handling (MMS)
1. Download up to 3 photos as base64
2. Upload each to Supabase storage
3. Send immediate acknowledgment: "Got em! Let me take a look"
4. Run AI photo analysis
5. Calculate price from analysis
6. Build conversational quote (no dashes, no apostrophes)
7. Include: load size, total price, deposit/balance breakdown, freon charges, items detected, hazmat warning
8. Ask "Want to book a pickup?"
9. Store analysis as temp message for booking flow

### Conversation Stage Detection
Detects stage from last outbound message:
- **quote_given**: price mentioned ($ amount)
- **awaiting_address**: asked for pickup address
- **awaiting_name**: asked for customer name
- **awaiting_slot_choice**: showed available slots
- **deposit_sent**: sent deposit link
- **ongoing**: default

### Booking Flow via SMS
1. **quote_given + customer says yes** → ask for address
2. **awaiting_address + looks like address** → store temp_address, ask for name
3. **awaiting_name + valid name** → look up temp_address, get available slots, show up to 4 slots, store temp_name + temp_slots
4. **awaiting_slot_choice + number 1-4** → look up temp name/address/slots/photo_analysis, create booking, send deposit link, delete temp messages
5. **deposit_sent + says paid** → confirm "we got it, you're all set"
6. **deposit_sent + says no** → "no worries, link doesn't expire"

### Address Detection
- Length > 5, contains a digit, matches street suffixes (st, ave, rd, dr, blvd, cres, way, pl, ct, lane, ln, NE, NW, SE, SW, close, bay, manor)

### Yes/No/Paid Detection
- Yes: yes, yeah, yep, sure, book, lets do it, sounds good, do it, book it, perfect, ok, cool, yup, ya, etc.
- No: no, nope, nah, cant, later, maybe, not now, not yet, ill think about it
- Paid: paid, done, paid it, i paid, just paid, completed, finished, sent it, sent the money

### AI Reply (fallback for everything else)
- Uses Groq (Llama 4 Scout)
- System prompt: "You are Casey from Junk Haul Calgary, a real 20s guy texting from his personal phone"
- Personality: chameleon, mirrors customer's tone/slang/formality
- Rules: no dashes, no apostrophes, never say you're AI, under 160 chars, remember conversation, don't repeat
- Includes company info (prices, pickup days, deposit, cancellation policy)
- Includes current booking context if customer has one
- Includes conversation stage
- If AI fails: send fallback message + forward to operator phone

---

## PART 11: SMS SENDING (lib/sms.js)

### Quo API Integration
- POST to https://api.quo.com/v1/messages
- Auth: raw API key in Authorization header (no Bearer prefix)
- Body: { content, from, to[], userId }
- Logs every outbound message to messages table with provider_sid and provider_status
- On failure: logs with provider_status='failed', still throws error to caller

### Operator Alert
- Sends SMS to both HAMMAD_PHONE and BROTHER_PHONE (if set)

---

## PART 12: MESSAGE BUILDERS (lib/messages.js)

### MSG 1 — Booking Confirmation (to customer)
- Ref, date, time, address, total, deposit paid, balance due
- "We'll text you the morning of your pickup"

### MSG 2 — Operator Alert (to Hammad)
- Booking ref, date, time, address, name, phone, load size, price, source
- Extras: no photos, heavy load flag, freon, stairs, apartment, customer notes

### MSG 10 — Load Upgrade Request
- Shows current booking vs AI suggestion
- Price difference
- Reply YES to upgrade, NO to keep current

### MSG 11+12 — Heavy Load Alerts
- To operator: booking details + flag reason + "call customer before pickup"
- To customer: "your job looks big, Hammad will call you in 15 minutes"

### MSG 17 — Deposit Link
- Sent for phone/SMS bookings (no online payment yet)
- Includes payment URL, booking ref, 2-hour hold warning

### Email — Booking Confirmation
- Branded HTML with logo, orange accent color (#f97316)
- Sent via Resend API if customer provided email
- Full price breakdown, customer notes, contact info

---

## PART 13: GEOCODING (lib/geocode.js)

### Nominatim (OpenStreetMap) — free, no API key
- Query: "{address}, Calgary, AB, Canada"
- User-Agent: "JunkHaulCalgary/1.0 (https://junkhaul.ca)"
- Returns lat, lng

### Quadrant Derivation
- First checks address text for explicit NW/NE/SW/SE
- Falls back to lat/lng relative to Calgary centre (51.0486, -114.0626)
- North = lat >= centre, South = lat < centre
- East = lng >= centre, West = lng < centre

---

## PART 14: ROUTE OPTIMIZATION (lib/route.js)

### Three-tier approach (falls back gracefully):

**Tier 1: Mapbox Optimization API (up to 12 stops)**
- Round trip from U-Haul depot (2615 12 St NE)
- Format: depot;stop1;stop2;...;depot
- Returns optimized waypoint order
- Matches waypoints back to bookings by coordinates

**Tier 2: Mapbox Directions Matrix (> 12 stops or Tier 1 failed)**
- Gets duration matrix between all points
- Nearest-neighbour algorithm starting from depot
- Picks closest unvisited stop each iteration

**Tier 3: Haversine nearest-neighbour (no API)**
- Straight-line distance estimation
- Same nearest-neighbour algorithm
- 111km per degree of lat, adjusted for longitude by cos(lat)

### Geocoding fallback
- Any booking missing lat/lng gets geocoded via geocodeAddress()
- Ungeocodable bookings appended to end of route

---

## PART 15: VAPI PHONE CALL SYSTEM

### Assistant Request Routing (app/api/assistant-request/route.js)

**Two modes based on which number was called:**

**Greeter number (+14127149826):**
- Looks up customer by caller ID
- Checks last call — if it was an angry complaint, auto-routes to Morgan (manager)
- Otherwise routes directly to the right department agent (no greeter transfer)

**Department numbers:**
- Sales (+14127149201) → Casey
- Service (+14127149625) → Jordan
- Refunds (+14127149181) → Riley
- Manager (+14127149656) → Morgan

**Routing logic:**
1. Has refund request → Riley (refunds)
2. Has service request → Jordan (service)
3. Has booking with status pending_payment or confirmed → Jordan (service)
4. New caller or anything else → Casey (sales)

**Customer context variables passed to agent:**
- customer_first_name, customer_name, phone
- has_booking, booking_ref, booking_status, load_size, date, time, address, total, balance
- has_refund_request, has_service_request, service_request_type
- is_returning_customer, booking_count
- caller_context: full text summary including booking details, refund/service requests, previous 3 calls with dates/summaries/sentiments

### Vapi Tool Implementations (lib/vapiTools.js)

**17 tools the AI agents can call:**

1. **check_availability** — queries schedule table for open slots, grouped by date
2. **get_quote** — calculates price for a given load size + addons
3. **create_booking** — creates a booking (checks slot, calculates price, geocodes, inserts, sends deposit link via SMS)
4. **lookup_booking** — finds booking by ref or phone, returns details
5. **cancel_booking** — calls cancelBooking() with full policy logic
6. **reschedule_booking** — calls rescheduleBooking() with max-2 check
7. **add_to_waitlist** — calls addToWaitlist()
8. **issue_refund** — processes Stripe refund (full or partial), updates booking
9. **send_email** — sends branded HTML email via Resend
10. **escalate_to_human** — sends SMS to operator, logs to phone_calls
11. **notify_operator** — sends urgent SMS to operator
12. **get_calgary_info** — live weather (Open-Meteo), CBC Calgary news RSS, seasonal events, traffic info
13. **get_sports_info** — live NHL standings (Flames), Flames game schedule, Stampeders CFL info, CBC sports RSS
14. **get_job_photos** — looks up booking photos by phone or booking_id (for Morgan)
15. **get_booking_details** — full booking details lookup (for Morgan)
16. **escalate_to_owner** — logs escalation, sends SMS to operator (for Morgan)
17. **log_compensation** — logs compensation type (free removal, partial refund, full refund, return pickup) to compensation_log table (for Morgan)

### Vapi Webhook (app/api/vapi/route.js)

**Handles 4 message types:**

1. **handoff-destination-request**: determines which assistant to transfer to based on caller history
2. **tool-calls**: runs each tool in toolCallList, returns results array
3. **function-call** (legacy): runs single tool
4. **end-of-call-report**:
   - Logs call to phone_calls (vapi_call_id, caller_number, direction, duration, cost, transcript, outcome, agent_type)
   - Determines agent_type from assistant ID (Casey=sales, Jordan=service, Riley=refunds)
   - **Frustration detection**: call < 30s, or transcript contains frustration keywords ("forget it", "never mind", "useless", "waste of time", "can't hear", "transfer me", etc.), or "speak up" appears 2+ times
   - **Follow-up SMS on customer hangup**:
     - If frustrated: personalized apology SMS (different for sales/service/refunds)
     - If normal: follow-up SMS with booking link or service link
     - Skipped if: booking was completed on call, or call was a short greeter transfer

### Vapi Outbound (app/api/vapi-outbound/route.js)
- Creates outbound Vapi call to a customer
- Selects assistant based on agent_type (sales/service/refunds)
- Passes context as assistantOverrides
- Logs outbound call to phone_calls

### Quo Call Webhook (app/api/quo-calls/route.js)
- Receives Quo call events (ringing, completed)
- Logs completed calls to phone_calls table

---

## PART 16: LEAD CAPTURE (app/api/capture-lead/route.js)

### Actions:
1. **init**: upsert lead by session_id, send welcome SMS
2. **update**: update lead with photos, address, load_size, etc.
3. **price_reveal**: store AI price estimate, send SMS with quote + booking link (48hr validity)
4. **convert**: mark lead as converted to booking

---

## PART 17: PHOTO ANALYSIS ENDPOINT (app/api/analyze/route.js)

### Flow:
1. Accept photos (base64 array) or description text
2. Strip data: prefix from photos
3. Call analysePhotos() or analyseDescription()
4. Upload photos to Supabase storage, get public URLs
5. If photo_unusable=true: return early with a generic "photo unusable, please retake" message (no analysis/price)
6. handleSafetyAlert(): if safety_alert=true, SMS the operator + log to safety_alerts table
7. Validate load_size is in allowed set
8. Check weight safety flag
9. Calculate price range: low (base) to high (base + same-day)
10. stripInternalFields() removes safety_alert* from the response
11. Return analysis + price range + photo URLs (safety alert never included)

---

## PART 18: CREW APP LOGIC

### Crew Authentication (lib/crewAuth.js)
- Verifies x-crew-pin header against SHA-256 hash
- Stored hash from crew_pin table (or CREW_PIN_HASH env fallback)
- Constant-time comparison (XOR all bytes, diff must be 0)

### Crew Job Flow (sequential states):
1. **en-route** (app/api/crew/en-route/route.js):
   - Generate tracking_session_id
   - Update crew_status='en_route', set en_route_at
   - Send customer SMS with live tracking link (junkhaul.ca/track/{booking_id})
   - ETA: 15 minutes (placeholder)

2. **arrived** (app/api/crew/arrived/route.js):
   - Update crew_status='arrived', set crew_arrived_at
   - Send customer "crew has arrived!" SMS

3. **start-job** (app/api/crew/start-job/route.js):
   - REQUIRE: at least 3 arrival photos in crew_photos
   - Update crew_status='in_progress', set job_started_at
   - Send customer link to view pre-job photos

4. **complete-job** (app/api/crew/complete-job/route.js):
   - REQUIRE: at least 3 completion photos in crew_photos
   - If paid: crew_status='complete', status='completed'
   - If not paid: crew_status='awaiting_payment'

5. **collect-payment** (app/api/crew/collect-payment/route.js):
   - Only handles cash_crew method (digital goes through Stripe)
   - Verify amount matches balance_due
   - Update: payment_status='cash_crew', payment_method='cash', status='completed', receipt_sent=true
   - Send receipt SMS with review link

### Crew GPS Tracking (app/api/crew/location/route.js)
- POST: upsert by tracking_session_id
- Stores: latitude, longitude, heading, speed_kmh, accuracy_meters, active_booking_id
- Updates every few seconds from crew phone

### Nearby Opportunities (app/api/crew/nearby-opportunities/route.js)
- Gets crew's latest position from crew_location
- Finds waitlist entries within 3km (have lat/lng, not offered today, not converted, not expired)
- Finds future confirmed bookings within 3km (different date, not already opportunistic)
- Calculates haversine distance for each
- Returns sorted by distance

### Offer Nearby (app/api/crew/offer-nearby/route.js)
- Creates nearby_offers record with 5-minute expiry
- Marks waitlist entry as offered_nearby_today
- Sends SMS: "crew is nearby, we can do your pickup right now at no extra charge, reply YES in 5 minutes"

---

## PART 19: CUSTOMER TRACKING PAGE (app/track/[booking_id]/page.js)

- Real-time GPS tracking of crew truck
- Shows crew position on Mapbox map
- Updates from crew_location table (polling)
- Shows ETA, crew heading, speed
- Customer sees live dot moving toward their address

---

## PART 20: SERVICE & REFUND REQUESTS

### Service Request (app/api/service-request/route.js)
1. Store in service_requests table
2. SMS customer confirmation
3. SMS operator about new request
4. Trigger Vapi outbound call (Jordan, service agent) with context

### Refund Request (app/api/refund-request/route.js)
1. Store in refund_requests table (fallback to phone_calls if table missing)
2. SMS customer confirmation
3. SMS operator about new request
4. Trigger Vapi outbound call (Riley, refunds agent) with context

---

## PART 21: ADMIN DASHBOARD LOGIC

### Admin Auth (lib/adminAuth.js)
- Cookie 'jh_admin' stores SHA-256 hash of ADMIN_PASSWORD
- Uses Web Crypto API (works in both Node and Edge runtimes)
- Compared with timing-safe equality

### Admin Endpoints:
- **bookings**: list all bookings
- **cancel**: cancel a booking
- **complete**: mark job completed
- **reschedule**: reschedule a booking
- **no-show**: mark booking as no_show
- **mark-arrived**: manually mark crew arrived
- **add-slots**: add time slots to schedule
- **schedule**: view/manage schedule
- **send-sms**: send custom SMS to customer
- **update-notes**: update internal notes on booking
- **upload-crew-photo**: upload crew photos
- **get-job-photos**: retrieve job photos
- **optimise-route**: route optimization for a date
- **earnings**: revenue analytics
- **leads**: view captured leads
- **call-history**: view call logs
- **waitlist**: view/manage waitlist
- **stripe-branding**: Stripe branding config

### Route Optimization (app/api/admin/optimise-route/route.js)
1. Get all confirmed/rescheduled bookings for a date
2. Run optimiseRoute() (Mapbox or fallback)
3. Calculate profit for each job (revenue - truck - dump)
4. Return ordered list with position, profit, margin
5. Return summary: total jobs, revenue, cost, profit, avg margin

---

## PART 22: EMPLOYEE PORTAL LOGIC

### Employee Auth (lib/employeeAuth.js)

**Password Hashing:**
- scrypt with random 16-byte salt
- N=16384, r=8, p=1, keylen=64
- Format: scrypt$N$r$p$saltHex$hashHex
- Verification: timing-safe comparison

**SIN/Banking Encryption:**
- AES-256-GCM
- Key from EMPLOYEE_ENC_KEY env (32-byte hex)
- Fallback: SHA-256 derived key (NOT for production)
- Format: ivHex:tagHex:encHex
- Each encryption uses random 12-byte IV

**Sessions:**
- 32-byte random hex token
- Stored in employee_sessions table
- 30-day expiry
- httpOnly, Secure, SameSite=Lax cookie
- Touches last_seen_at on each request
- Auto-deletes expired sessions

### Employee Signup (app/api/employee/signup/route.js)
1. Validate: name, email, password (min 8 chars)
2. De-dupe by email
3. Hash password, encrypt SIN if provided
4. Insert employee with status='pending'
5. Seed 5 required document rows (employment_contract, td1_federal, td1_ab, id, banking_info)
6. Auto-login (create session, set cookie)

### Employee Login (app/api/employee/login/route.js)
- Verify password against hash
- Check account not terminated
- Create session, set cookie

### Employee Documents (app/api/employee/documents/route.js)
- GET: list this employee's docs + drive_configured status
- POST: upload a doc (multipart form)
  - Validate doc_type is in allowed list
  - Upload to Google Drive (per-employee private folder)
  - Upsert document record with status='uploaded'
  - Check if all 5 required docs are uploaded → if yes, update employee status to 'onboarded'

### Clock In (app/api/employee/clock-in/route.js)
- Prevent double clock-in (check for open shift)
- Insert timesheet with clock_in_at, optional GPS
- Returns shift record

### Clock Out (app/api/employee/clock-out/route.js)
1. Find open shift (clock_out_at is null)
2. Calculate hours worked
3. Calculate weekly hours (Mon-Sun, excluding this shift)
4. Get employee pay_rate
5. Call calcShiftGross() for overtime + 3hr minimum
6. Update timesheet: clock_out_at, GPS, regular_hours, overtime_hours, total_hours, gross_pay

### Employee Pay Stubs (app/api/employee/pay-stubs/route.js)
- Returns this employee's pay stubs (last 52)
- Includes: hours, pay, deductions, YTD totals, direct deposit status

### Employee Shifts (app/api/employee/shifts/route.js)
- Returns this employee's timesheet history

---

## PART 23: PAYROLL ENGINE (lib/payroll.js)

### Implements CRA T4127 Payroll Deductions Formulas (Option 1) for Alberta

### Pay Rules (Alberta Employment Standards)
- Base rate from employee.pay_rate (default $15/hr)
- Overtime: 1.5× regular rate for hours > 8/day OR > 44/week (whichever gives greater OT)
- 3-hour minimum: if reported and worked < 3 hrs, pay max(workedPay, 3 × $15)

### Overtime Split Logic
1. Daily OT = max(0, dailyHours - 8)
2. Weekly OT = max(0, dailyHours - max(0, 44 - weeklyHoursBefore))
3. otHours = max(dailyOT, weeklyOT)
4. regHours = dailyHours - otHours

### Shift Gross Calculation
1. Split into regular/overtime hours
2. regPay = regularHours × rate
3. otPay = overtimeHours × rate × 1.5
4. gross = regPay + otPay
5. If reported and dailyHours > 0 and < 3: gross = max(gross, 3 × $15)

### CPP Calculation (Chapter 6)
- C = min(cap, gross)
- cap = cpp_max_contribution × (PM/12) - ytdCPP
- gross = cpp_rate × (PI - cpp_basic_exemption / P)
- Rounded half-up to nearest cent

### CPP2 Calculation (second additional)
- C2 = min(cap, gross)
- cap = cpp2_max_contribution × (PM/12) - ytdCPP2
- W = max(PIYTD, cpp2_lower_ceiling × PM/12)
- gross = (PIYTD + PI - W) × cpp2_rate

### EI Calculation (Chapter 7)
- E = min(cap, gross)
- cap = ei_max_premium - ytdEI
- gross = ei_rate × IE

### Federal Tax (Steps 1-3)
- F5 = CPP enhancement per period = C × (first_additional_rate / cpp_rate) + C2
- A = P × (I - F5) [annualized taxable income]
- BPAF = dynamic basic personal amount (phases out for high income: $181,440 to $258,482)
- Find bracket for A
- T3 = R × A - K - K1 - K2 - K4
  - K1 = lowest_rate × TC (federal TD1 claim)
  - K2 = lowest_rate × (baseCPP_annualized + EI_annualized)
  - K4 = min(lowest_rate × A, lowest_rate × CEA)
- T1 = T3 (no LCF)

### Alberta Tax (Steps 4-5)
- T4 = V × A - KP - K1P - K2P - K5P
  - K1P = ab_lowest_rate × TCP (Alberta TD1 claim)
  - K2P = ab_lowest_rate × (baseCPP_annualized + EI_annualized)
  - K5P = max(0, (K1P + K2P - 4896) × 0.25) [Alberta tax reduction]
- T2 = T4 (V1=V2=S=LCP=0 for Alberta)

### Per-Pay-Period Tax (Step 6)
- T = (T1 + T2) / P, rounded half-up

### Vacation Pay
- 4% of gross, paid each period
- Added to gross for CPP/EI/tax calculations
- totalGross = grossForPeriod + vacationPay

### Full Paycheque Calculation
1. Calculate vacation pay (4% of gross)
2. PI = pensionable = gross + vacation
3. IE = insurable = gross + vacation
4. Calculate CPP, CPP2, EI
5. Calculate federal tax (annualizes, applies brackets, de-annualizes)
6. Calculate Alberta tax (same A from federal step)
7. T = (T1 + T2) / P
8. totalDeductions = CPP + CPP2 + EI + T
9. netPay = totalGross - totalDeductions

### Pay Run Calculation (multiple employees)
1. For each employee: fetch employee record + YTD figures
2. Calculate paycheque with employee's TD1 claims
3. Build pay stub with hours, pay, deductions, YTD totals
4. Sum all totals for pay run
5. Calculate CRA remittance = total CPP + CPP2 + EI + tax
6. Remittance due date = 15th of month after period end

### Rate Loading
- Tries payroll_rates DB table first (by effective date range)
- Falls back to SEED_EDITIONS hardcoded rates
- Each edition has: CPP rate, CPP2 rate, EI rate, federal brackets, Alberta brackets, BPA, CEA

---

## PART 24: PAYROLL ADMIN ENDPOINTS

### Payroll Preview (app/api/admin/payroll/preview/route.js)
- Gather un-paid shifts for period
- Aggregate per employee (regular hours, OT hours, gross)
- Calculate pay run (no persistence)
- Return preview for admin review

### Payroll Run (app/api/admin/payroll/run/route.js)
1. Auth: admin cookie OR cron secret
2. Gather un-paid shifts for period
3. Aggregate per employee
4. Calculate pay run
5. Insert pay_runs record (status='calculated')
6. Insert pay_stubs for each employee
7. Tag all shifts with pay_run_id
8. Create remittances record (status='owed', due_date=15th of next month)

### Payroll Approve (app/api/admin/payroll/approve/route.js)
1. Verify status is 'calculated'
2. Update to 'approved', set approved_at, approved_by
3. If send_direct_deposit=true:
   - Check if direct deposit is configured
   - For each stub: get employee banking info, send EFT
   - If all sent: update status to 'paid', set paid_at
   - If any fail: keep status 'approved'
4. Return deposit results per employee

### Employees Overview (app/api/admin/employees/route.js)
- List all employees with status, hire date, pay rate
- Show who's currently clocked in (with live duration + GPS)
- Show period hours (current month, un-paid shifts): regular, OT, total, gross
- Show onboarding doc status per employee (uploaded, missing)
- Summary: total, onboarded, pending, clocked_in_now

### Employee Docs Admin (app/api/admin/employee-docs/route.js)
- GET: list all docs for an employee
- POST: verify or reject a doc (sets verified_at, verified_by, notes)

### Remittance Management (app/api/admin/remittance/route.js)
- GET: all remittances with pay run info, total owed, next due date
- POST: mark remittance as paid (sets paid_at, paid_method)

### T4 Slips (app/api/admin/t4s/route.js)
- GET: all T4 slips for a tax year (with employee name/email)

---

## PART 25: DIRECT DEPOSIT (lib/directDeposit.js)

### Provider Abstraction
- Three adapters: VoPay, Peoples, Plooto
- Active provider from EFT_PROVIDER env (default: vopay)
- Each adapter: sendPayment({ amount, employee, reference }) → { txnId, status, raw }

### Banking Info Decryption
- Decrypts bank_account_enc using AES-256-GCM
- Returns: { institution, transit, account }

### Send Direct Deposit Flow
1. Get active provider
2. Decrypt employee banking info
3. Call provider adapter
4. On success:
   - Insert direct_deposit_log (status='sent', raw_response)
   - Update pay_stub: direct_deposit_status, direct_deposit_id, sent_at
5. On failure:
   - Insert direct_deposit_log (status='failed', error)
   - Update pay_stub: direct_deposit_status='failed'

### Configuration Check
- VoPay: needs VOPAY_API_KEY + VOPAY_API_TOKEN
- Peoples: needs PEOPLES_API_KEY
- Plooto: needs PLOOTO_API_KEY

---

## PART 26: GOOGLE DRIVE INTEGRATION (lib/googleDrive.js)

### Setup
- Service account JSON from GOOGLE_SERVICE_ACCOUNT_JSON env
- Root folder from GOOGLE_DRIVE_EMPLOYEE_ROOT env
- If not configured: no-ops (stores doc metadata only, no Drive upload)

### Per-Employee Folder
- Creates folder: "{name} — {email}" under root
- Stores folder ID on employee.drive_folder_id
- Grants owner email Viewer access (if GOOGLE_DRIVE_OWNER_EMAIL set)

### Document Upload
- Uploads file (Buffer + mime type) to employee's folder
- Returns drive_file_id and drive_file_url (webViewLink)
- Attempts to restrict sharing (private by default)

---

## PART 27: CRON JOBS (Automated)

### Run Payroll (app/api/cron/run-payroll/route.js)
- **Schedule**: Every other Friday (payday)
- Checks if pay run already exists for period (idempotent)
- Checks if there are un-paid shifts
- Triggers /api/admin/payroll/run internally
- Alerts operator: stub count, net total, CRA total
- Does NOT auto-approve (human must review)

### Generate T4s (app/api/cron/generate-t4s/route.js)
- **Schedule**: January 31 each year
- Tax year = current year - 1
- Checks if T4s already exist (idempotent)
- Aggregates all pay stubs from previous year per employee
- T4 boxes: 14 (income), 16 (CPP pensionable), 17 (CPP), 18 (EI insurable), 19 (EI), 22 (tax), 26 (CPP2 pensionable), 28 (CPP2)
- Uses last stub's YTD values for pensionable/insurable earnings
- Alerts operator to review and file before Feb 28

### Remittance Reminder (app/api/cron/remittance-reminder/route.js)
- **Schedule**: 10th of every month (5 days before CRA due date)
- Finds owed remittances due this month
- Alerts operator: total amount, due date, pay period info
- "Pay via online banking or CRA My Business Account by the 15th"

### Refresh Rates (app/api/cron/refresh-rates/route.js)
- **Schedule**: January 1 and July 1 (CRA updates twice yearly)
- Fetches CRA T4127 page
- Parses rate tables from HTML (federal + Alberta brackets, CPP, EI, BPA, CEA)
- Inserts new payroll_rates edition
- Closes out previous edition's effective_to
- **FAIL LOUD**: if parsing fails, sends SMS telling operator to manually update rates
- Falls back to seed values for CPP/EI if page parsing fails for those specific fields

---

## PART 28: DATE/TIME HANDLING (lib/dates.js)

### Calgary Local Time
- All customer-facing times are America/Edmonton timezone
- job_date is 'YYYY-MM-DD', job_time is 'HH:MM' (24h)
- Dates parsed at UTC noon to avoid DST edge cases flipping the calendar day

### jobDateTimeUTC
- Converts Calgary-local date+time to UTC instant
- Probes both MST (UTC-7) and MDT (UTC-6) offsets
- Picks the offset that renders back to the requested local hour
- Fallback: assumes MDT (UTC-6)

### Formatting
- formatTime: '15:00' → '3:00 PM'
- formatDateLong: "Thursday, July 3"
- dayType: Sunday → 'sunday', everything else → 'thursday' (pickup days)

---

## PART 29: SLOTS & SCHEDULE (app/api/slots/route.js)

### Slot Availability
- Queries schedule table for slots from today forward
- Filters: is_available=true, jobs_booked < max_jobs
- Hides past time slots for today (compares to current Calgary time)
- Groups by date, returns remaining capacity per slot

---

## PART 30: CUSTOMER-FACING PAGES

### Home Page (app/page.js)
- Landing page with pricing, services, reviews
- CTA to book

### Book Page (app/book/page.js)
- Multi-step booking flow:
  1. Phone capture (creates lead)
  2. Photo upload (or skip with description)
  3. AI analysis of photos
  4. Load size selection (AI suggests, customer confirms)
  5. Add-ons (same-day, stairs, freon)
  6. Address entry (Mapbox autocomplete)
  7. Date/time selection (from available slots)
  8. Name + email entry
  9. Customer notes
  10. Review summary
  11. Stripe payment ($50 deposit)
  12. Confirmation

### FAQ Page (app/faq/page.js)
- Common questions and answers

### Pay Page (app/pay/[id]/page.js)
- Stripe payment form for deposit
- Handles card, Apple Pay, Google Pay

### Track Page (app/track/[booking_id]/page.js)
- Live GPS tracking of crew
- Mapbox map with crew position

### Photos Page (app/photos/[booking_id]/arrival/page.js)
- Shows arrival photos taken by crew before starting job

### Waitlist Page (app/waitlist/page.js)
- Form to join waitlist when slots are full

### Service Request Page (app/service-request/page.js)
- Form for existing customers to request changes

### Refund Page (app/refund/page.js)
- Form to submit refund request

### Portal Pages (app/portal/*)
- **page.js**: Employee dashboard (status, clock in/out, doc status)
- **clock/page.js**: Clock in/out with GPS
- **documents/page.js**: Upload onboarding documents
- **paystubs/page.js**: View pay stubs

### Admin Page (app/admin/page.js)
- Tabs: Bookings, Schedule, Crew, Analytics, Waitlist, Calls
- Crew tab: employee management, payroll, documents, T4s, remittances

---

## PART 31: SECURITY & AUTH SUMMARY

### Three auth systems:
1. **Admin**: SHA-256 hash of ADMIN_PASSWORD in cookie 'jh_admin'
2. **Employee**: scrypt-hashed password + 32-byte hex session token in cookie 'jh_employee_session' (30-day, httpOnly, Secure)
3. **Crew**: SHA-256 hash of PIN in x-crew-pin header (constant-time comparison)

### Cron auth: x-cron-secret header or Bearer token matching CRON_SECRET

### Vapi auth: x-vapi-secret header matching VAPI_SERVER_SECRET

### Data encryption:
- SIN: AES-256-GCM at rest (EMPLOYEE_ENC_KEY)
- Bank account: AES-256-GCM at rest
- All other data: plaintext in Supabase with RLS (service role only)

### Supabase RLS:
- All tables locked to service role key only
- No public access, no anon access
