# Junkhaul — Complete Progress & Status

**Last updated:** 2026-07-17
**Total commits:** 175+
**Repo:** `/Users/hammadbhatti/Junkhaul` (Next.js web platform)
**Crew app:** `/Users/hammadbhatti/Desktop/crew_app` (Flutter iOS/Android)

---

## 2026-07-17 Repository-grounded implementation update

This section supersedes broad claims below such as “everything built.” Status values used here are only `COMPLETE_AND_VERIFIED`, `BUILT_NOT_VERIFIED`, `PARTIAL`, `NOT_BUILT`.

### Customer website / paid booking flow

- Status: `BUILT_NOT_VERIFIED`
- Repository path: `app/book/page.js`, `app/api/capture-lead/route.js`, `app/api/create-booking/route.js`
- API: `/api/capture-lead`, `/api/create-booking`, `/api/photo-quote`, `/api/slots`
- Database table: `leads`, `bookings`, `lead_quotes`, `quote_price_ledger`, `timeline_events`, `attribution_records`
- Admin visibility: `PARTIAL` via Leads, Booking Detail, timeline and price ledger APIs.
- Manager visibility: `PARTIAL`; role foundation exists, full manager UI is not built.
- Quo integration: `PARTIAL`; central sender now supports suppression and entity links.
- Vapi integration: `PARTIAL`; existing tools still need full shared-data refactor.
- App impact: `APP_READS_THIS` for price ledger/timeline later; documented in `docs/CREW_APP_BACKLOG.md`.
- Tests: `BUILT_NOT_VERIFIED`; foundation unit tests added, route integration tests still needed.
- Manual verification: `BUILT_NOT_VERIFIED`; build/lint/tests pass locally.
- Production status: `PARTIAL`; migration must be applied and seeded.
- Known gaps: customer change history is still not fully captured per field; photo metadata is not fully stored for website upload; admin action endpoints are not complete.

### Verification phase status

- Status: `PARTIAL`
- Repository path: `tests/integration/foundation.integration.js`, `tests/foundation.test.js`, `.env.integration.example`, `docs/STAGING_VERIFICATION.md`, `.nvmrc`, `package.json`, `package-lock.json`
- API: no production API added by the harness.
- Database table: validates foundation tables when an isolated test DB is provided.
- Admin visibility: `NO_APP_IMPACT`
- Manager visibility: `NO_APP_IMPACT`
- Quo integration: parser fixtures, signed-webhook unit tests, delivery-event helper coverage and route-level integration cases exist; live Quo payload/auth verification against a real Quo webhook remains `NOT_BUILT`.
- Vapi integration: `NO_APP_IMPACT`
- App impact: `NO_APP_IMPACT`
- Tests: `COMPLETE_AND_VERIFIED` for pure helper/unit tests; `BUILT_NOT_VERIFIED` for the guarded route/database/storage integration harness itself; database integration execution remains `NOT_BUILT` in this environment because no isolated staging DB URL is configured and local Supabase cannot start without Docker socket access.
- Manual verification: `COMPLETE_AND_VERIFIED` for `npm test`, `npm run lint`, and `npm run build` under local Node 21.6.0; `npm run test:integration` correctly exits `NOT_RUN` without approved staging/local Supabase variables. Node 22.13.0 is declared in `.nvmrc`/`engines`, but this shell does not have Node 22 installed.
- Production status: `PARTIAL`; do not apply the migration to production until a staging/disposable database has run the full chain and second-run/idempotency validation.
- Known gaps: no staging project was available in this environment; route-level DB integration tests still need a disposable Supabase project or working local Supabase Docker environment.

### Door-hanger and flyer attribution

- Status: `PARTIAL`
- Repository path: `app/book/hanger/route.js`, `lib/attribution.js`
- API: `/book/hanger`
- Database table: `marketing_campaigns`, `campaign_batches`, `campaign_tracking_codes`, `attribution_records`, `funnel_events`
- Admin visibility: `PARTIAL` via Marketing admin panel.
- Manager visibility: `NOT_BUILT`
- Quo integration: `PARTIAL`; messages can link to campaign IDs.
- Vapi integration: `PARTIAL`; tables exist for later call attribution.
- App impact: `APP_READS_THIS` optional source badge only.
- Tests: `PARTIAL`; pure tests added, route tests still needed.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`; campaign/batch/code seed data required.
- Known gaps: first-touch correction UI is not built; campaign creation UI is not built.

### Marketing campaign reporting

- Status: `PARTIAL`
- Repository path: `app/api/admin/marketing/route.js`, `components/admin/MarketingPanel.js`
- API: `/api/admin/marketing`
- Database table: campaign and attribution tables above.
- Admin visibility: `PARTIAL`; report metrics are visible but creation/editing and full breakdown filters are not finished.
- Manager visibility: `NOT_BUILT`
- Quo integration: `PARTIAL`
- Vapi integration: `PARTIAL`
- App impact: `NO_APP_IMPACT`
- Tests: `NOT_BUILT` for admin route aggregation.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`
- Known gaps: profit per hanger uses collected revenue minus campaign cost only; full job-cost profit is not wired.

### Free donation-only pickup

- Status: `PARTIAL`
- Repository path: `app/book/donation/page.js`, `app/api/donation-request/route.js`, `app/api/donation-request/draft/route.js`, `app/api/donation-request/photos/route.js`, `app/api/admin/donations/[id]/photo/[photoId]/route.js`, `lib/donation.js`, `lib/donationPhotos.js`, `components/admin/DonationsView.js`, `app/api/admin/donations/route.js`
- API: `/api/donation-request`, `/api/donation-request/draft`, `/api/donation-request/photos`, `/api/admin/donations`, `/api/admin/donations/[id]/photo/[photoId]`
- Database table: `donation_requests`, `donation_request_items`, `donation_request_photos`, `donation_policy_versions`, `donation_ai_analyses`, `donation_route_matches`
- Admin visibility: `PARTIAL`; queue and actions exist, full detail workspace is not complete.
- Manager visibility: `PARTIAL`; permission tables exist, manager UI not built.
- Quo integration: `PARTIAL`; templates are represented by message types, versioned template admin is not built.
- Vapi integration: `NOT_BUILT` for donation-specific tools.
- App impact: `APP_REQUIRES_NEW_WORKFLOW`, `APP_WRITES_THIS`, `APP_RECEIVES_REALTIME_UPDATE`; backlog documented.
- Tests: `PARTIAL`; validation/state-machine pure tests and image-inspection helper tests added. Route/database upload tests still require isolated Supabase credentials.
- Manual verification: `BUILT_NOT_VERIFIED`; build/lint/unit tests pass, but storage upload has not been exercised against staging.
- Production status: `PARTIAL`; storage bucket and metadata schema are in the migration, the bucket must be private, and staging migration/upload verification is still required.
- Known gaps: route-fit algorithm foundation exists as table only; actual route matching is not implemented. Donation “AI” remains rule-based pre-screening and must not be represented as real image AI. Abandoned-draft cleanup is documented but not built.

### Quo SMS infrastructure

- Status: `PARTIAL`
- Repository path: `lib/sms.js`, `lib/quoInbound.js`, `lib/quoPayload.js`, `lib/quoRules.js`, `app/api/quo/inbound/route.js`, `app/api/sms-webhook/route.js`, `supabase/functions/_shared/clients.ts`
- API: `/api/quo/inbound`, legacy `/api/sms-webhook`, `/api/sms/inbound`
- Database table: `messages`, `message_entity_links`, `sms_consent`, `sms_suppression`, `expected_replies`, `quo_webhook_events`
- Admin visibility: `PARTIAL`; messages visible through Booking Detail, but full retry/failure dashboard is not built.
- Manager visibility: `NOT_BUILT`
- Quo integration: `PARTIAL`; central Next.js outbound suppression exists, the edge-function sender now checks suppression, canonical inbound helper exists, signed-webhook verification has unit coverage, and delivery status updates are implemented.
- Vapi integration: `PARTIAL`; Vapi-triggered SMS uses central sender where existing callers use `sendSMS`.
- App impact: `APP_RECEIVES_REALTIME_UPDATE` later for message-triggered assignments.
- Tests: `PARTIAL`; pure expected reply/STOP/START classification tests, signature tests, delivery-event tests and parser fixture tests added. Route-level Quo integration tests are built but not run against staging.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`; Quo webhook should be pointed to canonical route after payload verification.
- Known gaps: existing conversational SMS route still contains legacy booking logic; full migration to canonical router remains. Actual Quo payload examples and webhook authentication must be verified with Quo before production webhook cutover.

### Booking Detail workspace

- Status: `PARTIAL`
- Repository path: `components/admin/BookingDetailView.js`, `app/api/admin/bookings/[id]/detail/route.js`
- API: `/api/admin/bookings/[id]/detail`
- Database table: `bookings`, `leads`, `quote_price_ledger`, `timeline_events`, `audit_events`, `messages`, `attribution_records`, `phone_calls`, `service_requests`, `refund_requests`
- Admin visibility: `PARTIAL`; read workspace exists by booking UUID.
- Manager visibility: `NOT_BUILT`
- Quo integration: `PARTIAL`; communications section reads linked messages.
- Vapi integration: `PARTIAL`; calls are included where linked.
- App impact: `APP_READS_THIS` for future crew context.
- Tests: `NOT_BUILT` for route response shape.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`
- Known gaps: admin action buttons/endpoints for assign/reschedule/correct/review/send/cancel/escalate are not fully implemented.

### Manager-role foundation

- Status: `PARTIAL`
- Repository path: `lib/permissions.js`, `lib/permissionRules.js`
- API: not fully exposed yet.
- Database table: `staff_roles`, `permissions`, `staff_role_permissions`, `staff_role_assignments`, `manager_scopes`
- Admin visibility: `NOT_BUILT`
- Manager visibility: `NOT_BUILT`
- Quo integration: `NOT_BUILT`
- Vapi integration: `NOT_BUILT`
- App impact: `APP_REQUIRES_NEW_WORKFLOW`
- Tests: `PARTIAL`; manager denial rules tested.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`; owner/admin role assignment seed required.
- Known gaps: existing admin APIs still use admin cookie only except the runtime migration endpoint, which is now permanently disabled. Permission enforcement must be rolled through high-risk action routes.

### Timeline and audit architecture

- Status: `PARTIAL`
- Repository path: `lib/timeline.js`, `lib/auditEvents.js`
- API: used by new/modified routes.
- Database table: `timeline_events`, `audit_events`
- Admin visibility: `PARTIAL`; Booking Detail reads timeline/audit records.
- Manager visibility: `NOT_BUILT`
- Quo integration: `PARTIAL`
- Vapi integration: `NOT_BUILT`
- App impact: `APP_WRITES_THIS` for future crew workflow events.
- Tests: `NOT_BUILT` for DB insert behavior.
- Manual verification: `BUILT_NOT_VERIFIED`
- Production status: `PARTIAL`
- Known gaps: many existing routes still write only legacy state and need timeline/audit wrappers.

### Crew app backlog

- Status: `COMPLETE_AND_VERIFIED`
- Repository path: `docs/CREW_APP_BACKLOG.md`
- API: documented per backlog item.
- Database table: documented per backlog item.
- Admin visibility: documented per backlog item.
- Manager visibility: documented per backlog item.
- Quo integration: documented per backlog item.
- Vapi integration: documented per backlog item.
- App impact: every item labeled.
- Tests: documentation only.
- Manual verification: file created and reviewed.
- Production status: documentation only.
- Known gaps: Flutter UI intentionally not built today.

---

## 1. PLATFORM OVERVIEW

Junkhaul is a Calgary-based junk removal business platform with three connected surfaces:

1. **Customer website** (Next.js) — booking, photo quote, tracking, payment, feedback, tips
2. **Crew app** (Flutter) — clock in/out, truck pickup, job workflow, navigation, photos, payment collection, incidents, SOS
3. **Admin portal** (Next.js) — dispatch, schedule, leads, crew, payroll, earnings, growth, calls, config, audit

All three surfaces connect through a **Supabase PostgreSQL database** (55+ tables) and **Vercel-hosted API routes**.

---

## 2. CUSTOMER WEBSITE — EVERYTHING BUILT

### 2.1 Landing Page (`app/page.js`)
- Branding: "Your junk. Gone today."
- CTA: "Get Instant Price"
- Trust badges: Canadian Owned, Calgary Run, Licensed & Insured, Same Day
- Phone number: (587) 325-0751
- Service page links: Commercial, Garage Cleanouts, Estate Cleanouts, Furniture Removal, Appliance Removal
- Privacy Policy link (in-app page, not external)
- SEO neighborhood pages: Auburn Bay, Copperfield, Cornerstone, Coventry Hills, Cranston, Evergreen, Mahogany, McKenzie Towne, New Brighton, Panorama Hills

### 2.2 Booking Flow (`app/book/page.js`)
Multi-step wizard with A/B test for phone-gate position (phone_first vs price_first):

**Step 1 — Phone Gate:**
- Customer enters phone number
- Creates lead in `leads` table with `session_id`, `source`, UTM params, `ab_variant`
- Sends welcome SMS

**Step 2 — Address Entry:**
- Mapbox address autocomplete
- Unit/buzzer field (optional)
- Auto-detects apartment (sets stairs=1)
- Auto-detects out-of-area (Calgary bounding box)
- Derives quadrant (NW/NE/SW/SE), lat/lng, postal_code
- Persists to `leads` table

**Step 3 — Photo Quote:**
- Upload up to 6 photos (camera/gallery)
- Skip photos option with text description
- AI analysis via Gemini Flash (provider: Google AI, fallback: Groq/DeepSeek)
- Returns: load_size, weight estimate, volume, confidence, items_detected, hazmat flag, freon count, recommended truck size
- Itemized quote with per-item pricing from catalog
- Photo similarity detection (perceptual hash) to lock prices for unchanged items
- Photo quote caching (SHA-256 hash)
- Persists to `leads` table + `photo_quote_cache` + `photo_phashes`

**Step 4 — Review & Customize:**
- Load size cards (1-2 items, Small, Half, Full)
- AI-detected items list
- Add item picker (100+ item catalog from `lib/itemPricing.js`)
- Categories: Furniture, Beds & Mattresses, Freon Appliances, Appliances, Electronics, Outdoor, Renovation, Boxes & Misc
- Quantity controls, disposal toggle (dump/donate)
- Stairs counter, same-day toggle
- Truck size upsell (15/20/26 ft)
- Flat-rate vs itemized price comparison
- Client-side price calculation using `lib/pricingConstants.js`

**Step 5 — Schedule Selection:**
- Date selector (horizontal scroll)
- Time slot pills with scarcity indicators
- Window labels (Morning/Afternoon)
- Custom slot creation if no standard slots
- Waitlist link if no slots
- GET `/api/slots` with load_size and address params

**Step 6 — Contact Details:**
- Name (required), phone (pre-filled), email (optional)
- Customer notes textarea
- Referral code input

**Step 7 — Deposit Payment:**
- Stripe PaymentElement (card, Apple Pay, Google Pay)
- $50 fixed deposit
- Creates booking in `bookings` table
- Creates Stripe PaymentIntent
- Generates booking_ref (JH-XXXXXX) and tracking_token

### 2.3 Booking Creation API (`app/api/create-booking/route.js`)
- Validates required fields
- Enforces 24-hour minimum booking window
- Verifies slot capacity
- Loads runtime pricing config from `system_config`
- Computes surge multiplier
- Geocodes address
- Calculates travel fee via Mapbox Directions API
- Calculates final price (base + same_day + stairs + freon + travel + truck + surge)
- Weight safety flag
- Upgrade suggestion if AI estimate > selected load
- Inserts booking record
- Creates Stripe PaymentIntent
- Resolves dispatch (crew assignment)
- Processes referral code
- Sends confirmation SMS + operator alert

### 2.4 Customer Tracking Page (`app/track/[token]/page.js`)
- Step tracker: Scheduled → En Route → Arrived → In Progress → Completed
- Job summary: load size, booking ref, total price, date/time, address
- Crew card with names and photos
- Live map (when en_route or arrived) using crew GPS
- Balance payment section (if balance due)
- Timeline of job events
- Storage facility photos
- Donation run info
- Customer signature info
- **Feedback section:** star rating (1-5), review text, name → `customer_feedback` table
- **Tip section:** preset amounts ($5/$10/$15/$20/$25) + custom → Stripe payment → `crew_tips` table
- Contact support section

### 2.5 Balance Payment Page (`app/pay/[booking_id]/page.js`)
- Booking details display
- Balance due amount
- Payment methods: Apple Pay/Google Pay, Credit/Debit Card, Cash
- Cash exact change warning
- Stripe payment processing
- Cash declaration option

### 2.6 Waitlist (`app/waitlist/page.js`)
- Name, phone, address (optional), preferred day type, estimated load
- Persists to `waitlist` table with 30-day expiry
- SMS notification when slot opens

### 2.7 Service Request (`app/service-request/`)
- Reschedule, cancel, address change, questions, complaints
- Triggers Vapi customer service outbound call
- Persists to `service_requests` table

### 2.8 Refund Request (`app/refund/`)
- Customer submits: name, phone, email, booking_ref, reason, amount
- Persists to `refund_requests` table
- SMS confirmation to customer + alert to operator
- Triggers Vapi refunds agent follow-up

### 2.9 Photo Upload (`app/photos/[booking_id]/arrival/`)
- Customer photo upload page for bookings

### 2.10 Policy Pages
- Privacy Policy (`app/privacy/`)
- Crew Privacy (`app/crew-privacy/`)
- Safety Policy (`app/safety-policy/`)
- Vehicle Use Policy (`app/vehicle-use-policy/`)
- Code of Conduct (`app/code-of-conduct/`)
- Uniform Policy (`app/uniform-policy/`)
- All styled with brand colors (orange #f97316)

### 2.11 SEO Pages
- Service pages: Commercial, Garage Cleanouts, Estate Cleanouts, Furniture Removal, Appliance Removal, Basement/Attic, Renovation Debris, Residential, Storage Unit
- Neighborhood pages: 10 Calgary communities
- FAQ page
- Robots.txt and sitemap.js

---

## 3. CREW APP (FLUTTER) — EVERYTHING BUILT

**Location:** `/Users/hammadbhatti/Desktop/crew_app`
**State management:** Flutter Riverpod 3.x
**Routing:** go_router 17.x
**HTTP:** Dio 5.x with cookie jar
**Backend:** Supabase + Vercel API
**Maps:** Mapbox Maps SDK 2.25.1
**Offline:** Hive 2.x persistent queue
**Built and installed on iPhone**

### 3.1 All Screens (27 screens)

| Screen | Path | Purpose |
|--------|------|---------|
| Splash | `/splash` | App initialization |
| Login | `/login` | Employee authentication (email + password) |
| Onboard | `/onboard` | Multi-step onboarding wizard (contract, TD1, banking, documents, selfie) |
| Verification | `/verification` | Awaiting account approval |
| Permissions | `/permissions-gate` | Location, camera, notification permission requests |
| Schedule | `/schedule` | Today's jobs on map + list, sync status, route instructions |
| Job | `/job/:bookingId` | 9-step job workflow container |
| Clock | `/clock` | Clock in/out with GPS tagging |
| Day Summary | `/day-summary` | End-of-day stats + clock-off |
| Truck Pickup | `/truck-pickup` | Start-of-shift truck condition check |
| Truck Check | `/truck-check` | Detailed truck inspection form |
| Earnings | `/earnings` | Daily earnings breakdown |
| Pay Stubs | `/paystubs` | Pay stub viewing |
| Documents | `/documents` | Employee document management |
| Receipts | `/receipts` | Expense receipt submission |
| Notifications | `/notifications` | Push notification list |
| Incidents | `/incidents` | Incident reporting + history |
| SOS | `/sos` | Emergency SOS with hold-to-trigger |
| Opportunities | `/opportunities` | Nearby job opportunities |
| Profile | `/profile` | Employee profile editing |
| Settings | `/settings` | App settings |
| Policies | `/policies` | Company policies |
| Privacy | `/privacy` | Privacy policy |
| Delete Info | `/delete-info` | Account deletion request |
| Menu | `/menu` | Navigation menu |
| Navigation | (in job) | Turn-by-turn Mapbox navigation |

### 3.2 Job Workflow — 9 Steps

The job screen (`job_screen.dart`) manages a 9-step sequential workflow:

**Step 1 — En Route (`en_route_step.dart`):**
- Customer name and address display
- ETA and distance
- Notes field (gate codes, parking)
- "Start Navigation" button → opens `JobNavigationScreen`

**Step 2 — Arrived (`arrived_step.dart`):**
- Customer home / not home toggle
- Item list with condition badges (Good, Minor damage, Major damage)
- Notes field
- If not home: Call customer, Leave notice, Wait buttons
- Submits item conditions to `/api/crew/item-conditions`

**Step 3 — Before/After Photos (`before_after_step.dart`):**
- 3 required arrival photos:
  1. Entry path / front of property
  2. Main junk area
  3. Pre-existing damage or "none"
- Hazmat flag toggle
- "Call Dispatch" button if hazmat flagged
- Photos uploaded to Supabase `crew-photos` bucket

**Step 4 — Load Truck (`load_truck_step.dart`):**
- Item checklist with checkboxes
- "Add item found onsite" button
- If load bigger: price update banner with "Send Price Update to Customer"
- "Truck's Loaded" button
- Price update triggers `/api/crew/resend-payment-link`

**Step 5 — Signature (`signature_step.dart`):**
- After photo capture
- Confirmed amount display
- Customer present / not present toggle
- Signature pad (using `signature` package)
- Customer name typed
- "Complete Job" button
- Submits to `/api/employee/signature` → `customer_signatures` table

**Step 6 — Payment (`payment_step.dart`):**
- Balance due amount
- Three payment options:
  1. Card on file (shows last 4 digits)
  2. Cash (with cash received input)
  3. SMS payment link
- Submits to `/api/employee/collect-payment`
- Server-side validation: booking belongs to crew, signature exists, 3 arrival photos required, cash amount matches

**Step 7 — Truck Fullness (`truck_fullness_step.dart`):**
- Truck bed photo capture
- Estimated capacity used %
- Next job summary
- "Continue" button

**Step 8 — Route Decision (`route_decision_step.dart`):**
- Two options: Landfill run OR Continue to next job
- Auto-route decision at ≥75% fullness
- "Confirm" button

**Step 9 — Drop Flow (`drop_flow_step.dart`):**
- 2 required photos: items unloaded + truck empty
- Facility name display
- Capacity after drop %
- "Confirm Drop-off" button

### 3.3 Turn-by-Turn Navigation (`job_navigation_screen.dart`)

Full "Uber-level" navigation experience:

- **Mapbox Directions API** integration (`mapbox_directions_service.dart`)
- Route geometry, steps, speed limits, voice instructions
- **Route line:** Orange line with white casing
- **Truck marker:** User's position as orange dot with heading
- **Destination pin:** "B" marker at job address
- **"I've Arrived" check:** Distance-based warnings/auto-arrival
- **Speed limit sign:** Current road speed limit, turns red if exceeded
- **Current speed:** Real-time GPS speed display
- **Maneuver banner:** Next turn instruction, distance, "Then:" preview
- **Camera tracking:** Map follows GPS position with 3D view
- **Map style:** `navigation-day-v1`
- Initial route overview, then switches to follow mode
- **Compass-based map rotation** using `flutter_compass` + `easeTo` for smooth rotation

### 3.4 Truck Pickup/Return (`truck_pickup_screen.dart`)

**Pickup (start of shift):**
- Odometer reading (km)
- Fuel level dropdown (empty, quarter, half, three-quarters, full)
- Dashboard photo (required)
- Damage photos (up to 5, optional)
- Damage notes
- Submits to `/api/employee/truck-check` → `truck_checks` table

**Return (end of shift):**
- Same as pickup PLUS:
- Gas receipt photo
- Gas station name
- Gas amount (CAD)

### 3.5 Clock In/Out (`clock_screen.dart`)
- Current shift status display
- Elapsed time ticker
- Clock in/out with GPS coordinates
- Recent shift history
- Submits to `/api/employee/clock-in` or `/api/employee/clock-out` → `timesheets` table

### 3.6 Day Summary (`day_summary_screen.dart`)
- Celebration animation with checkmark badge
- Stats: total collected, jobs done, cash/card totals
- List of completed jobs
- "Clock Off & Finish" button

### 3.7 SOS (`sos_screen.dart`)
- Large red SOS button (2-second hold-to-trigger)
- Hammad's phone number display
- "Call Hammad" button
- On trigger: logs to `/api/employee/sos-log`, opens SMS with GPS link, opens phone dialer

### 3.8 Incidents (`incidents_screen.dart`)
- Incident type dropdown (safety, injury, vehicle_damage, hazardous_material, other)
- Severity dropdown (low, medium, high)
- Description, location, photo upload
- Submits to `/api/employee/incidents` → `safety_incidents` table
- Incident history list

### 3.9 Earnings (`earnings_screen.dart`)
- Daily earnings breakdown
- Fetches from employee API

### 3.10 Pay Stubs (`paystubs_screen.dart`)
- Pay stub viewing from `pay_stubs` table

### 3.11 Documents (`documents_screen.dart`)
- Employee document management
- Upload/view documents (contract, TD1, ID, banking, SIN, driver's license)

### 3.12 Receipts (`receipts_screen.dart`)
- Expense receipt submission (gas, U-Haul, dump, other)
- Vendor, amount, photo, notes
- Submits to `/api/employee/receipts` → `transaction_receipts` table

### 3.13 Opportunities (`opportunities_screen.dart`)
- Shows nearby job opportunities (waitlist entries, future bookings, quoted-but-unbooked leads)
- Fetches from `/api/employee/nearby-opportunities`
- Crew can send offer to customer via `/api/employee/offer-nearby`

### 3.14 Notifications (`notifications_screen.dart`)
- Push notification list
- Mark as read

### 3.15 Profile, Settings, Policies, Privacy, Delete Info
- Profile editing (`/api/employee/me`)
- App settings
- Company policies viewer
- Privacy policy viewer
- Account deletion request (`/api/employee/delete-info`)

### 3.16 Onboarding (`onboard_screen.dart`)
- Multi-step wizard:
  - Employment contract signing
  - TD1 Federal form
  - TD1 Alberta form
  - Banking info (institution, transit, account)
  - Document upload (ID, driver's license)
  - Selfie capture
- All data persists to `employees` and `employee_documents` tables

### 3.17 Permission Gate (`permission_gate_screen.dart`)
- Requests location, camera, and notification permissions on launch
- Shows after login, before schedule

### 3.18 Services (`lib/src/data/services/`)

| Service | File | Purpose |
|---------|------|---------|
| Camera | `camera_service.dart` | Photo capture from device camera |
| Geofence | `geofence_service.dart` | GPS geofencing with dwell detection (10s arrival, 30s departure), haversine distance, regions: customer (50m), landfill (100m), storage (50m), truck (50m) |
| Mapbox Directions | `mapbox_directions_service.dart` | Turn-by-turn directions via Mapbox API — route geometry, steps, speed limits, voice instructions |
| Photo Upload | `photo_upload_service.dart` | Photo upload to Supabase Storage with geotagging and timestamping |

### 3.19 Providers (`lib/src/domain/providers/`)

| Provider | File | State Managed |
|----------|------|---------------|
| Core | `core_providers.dart` | Base URL, secure storage, DioClient singleton |
| Schedule | `schedule_provider.dart` | Daily/weekly schedule data from `/api/employee/schedule` |
| Job | `job_provider.dart` | Job step state, booking lookup |
| Route Plan | `route_plan_provider.dart` | Route plan data from `/api/employee/route-plan` |
| Route Realtime | `route_realtime_provider.dart` | Real-time route updates via Supabase Realtime subscriptions to `route_plans` table |
| Permission | `permission_provider.dart` | Location/camera permission state |

### 3.20 API Client (`lib/src/data/api/employee_api.dart`)

All crew app API calls go through this client. Endpoints called:

**Schedule & Shifts:**
- `GET /api/employee/schedule` — daily/weekly schedule
- `GET /api/employee/shifts` — shift history
- `POST /api/employee/clock-in` — clock in with GPS
- `POST /api/employee/clock-out` — clock out with GPS
- `POST /api/employee/job-clock` — job-level clock in/out

**Job Workflow:**
- `POST /api/crew/item-conditions` — submit item conditions
- `POST /api/crew/resend-payment-link` — resend payment link
- `POST /api/employee/signature` — customer signature
- `POST /api/employee/collect-payment` — payment collection (cash/card/SMS)

**Truck & Equipment:**
- `GET /api/employee/truck-check` — fetch truck checks
- `POST /api/employee/truck-check` — submit truck check
- `GET /api/employee/storage-drop` — fetch storage facilities
- `POST /api/employee/storage-drop` — record storage drop
- `GET /api/employee/landfill` — fetch landfill locations

**Location & Navigation:**
- `POST /api/employee/location` — GPS update
- `GET /api/employee/route-plan` — route plan
- `POST /api/employee/route-plan` — acknowledge route plan
- `GET /api/employee/route-decision` — route decision

**Incidents & Safety:**
- `GET /api/employee/incidents` — fetch incidents
- `POST /api/employee/incidents` — report incident
- `POST /api/employee/issues` — report job issue
- `POST /api/employee/sos-log` — log SOS event

**Financial:**
- `GET /api/employee/receipts` — fetch receipts
- `POST /api/employee/receipts` — submit receipt
- `GET /api/employee/pay-stubs` — fetch pay stubs
- `GET /api/employee/gas-price` — current gas price

**Other:**
- `GET /api/employee/notifications` — fetch notifications
- `POST /api/employee/notifications` — mark read
- `GET /api/employee/nearby-opportunities` — nearby jobs
- `POST /api/employee/offer-nearby` — send offer
- `GET /api/employee/offer-status` — poll offer status

### 3.21 Offline Queue (`lib/src/data/offline/`)

**Files:**
- `offline_action.dart` — action model
- `offline_queue_service.dart` — Hive-backed persistent queue
- `connectivity_provider.dart` — network status

**Supported Action Types (15):**
- `clock_in` → `/api/employee/clock-in`
- `clock_out` → `/api/employee/clock-out`
- `location` → `/api/employee/location`
- `job_clock_in` → `/api/employee/job-clock`
- `job_clock_out` → `/api/employee/job-clock`
- `signature` → `/api/employee/signature`
- `incident` → `/api/employee/incidents`
- `issue` → `/api/employee/issues`
- `receipt` → `/api/employee/receipts`
- `truck_check` → `/api/employee/truck-check`
- `storage_drop` → `/api/employee/storage-drop`
- `collect_payment` → `/api/employee/collect-payment`
- `geofence_event` → `/api/employee/geofence-event`
- `sos_log` → `/api/employee/sos-log`
- `route_ack` → `/api/employee/route-plan`

**Behavior:**
- Hive box `offline_queue` persists across app restarts
- Each action: `{ id, type, payload, filePaths[], createdAt, attempts }`
- Flushes when network available
- Failed actions stay in queue for retry
- Increments attempt counter on failure

### 3.22 Supabase Realtime (`lib/src/data/supabase/`)

- `supabase_realtime_service.dart` — watches `route_plans` table via Supabase Realtime
- Pushes new route versions to crew app instantly
- Crew app acknowledges receipt via `/api/employee/route-plan`

### 3.23 Flutter Dependencies (Key Packages)

| Package | Version | Purpose |
|---------|---------|---------|
| flutter_riverpod | 3.3.2 | State management |
| go_router | 17.3.0 | Navigation/routing |
| dio | 5.10.0 | HTTP client |
| supabase_flutter | 2.15.4 | Supabase client + realtime |
| mapbox_maps_flutter | 2.25.1 | Mapbox maps |
| flutter_mapbox_animarker | 0.0.10 | Animated map markers |
| geolocator | 14.0.3 | GPS location |
| flutter_foreground_task | 9.2.2 | Background location service |
| flutter_compass | 0.8.1 | Compass heading for map rotation |
| sliding_up_panel2 | 3.3.0+1 | Bottom sheet UI |
| signature | 6.3.0 | Customer signature capture |
| camera | 0.12.0+1 | Photo capture |
| image_picker | 1.1.2 | Gallery photo selection |
| image | 4.9.1 | Image processing |
| google_mlkit_text_recognition | 0.15.1 | OCR for receipts/documents |
| flutter_doc_scanner | 0.0.20 | Document scanning |
| flutter_local_notifications | 22.0.1 | Push notifications |
| connectivity_plus | 7.2.0 | Network status |
| hive | 2.2.3 | Offline queue persistence |
| sentry_flutter | 9.23.0 | Crash reporting |
| permission_handler | 12.0.3 | Permission requests |
| workmanager | 0.9.0+3 | Background tasks |
| confetti | 0.8.0 | Day completion celebration |

---

## 4. BACKEND API — EVERYTHING BUILT

**Location:** `/Users/hammadbhatti/Junkhaul/app/api/`
**Framework:** Next.js 15 API routes
**Database:** Supabase PostgreSQL
**Payments:** Stripe
**SMS:** Quo API (replaced Twilio)
**Voice AI:** Vapi
**Maps:** Mapbox
**AI:** Google Gemini Flash (primary), Groq, DeepSeek (fallbacks)
**Email:** Resend
**Deployed:** Vercel production

### 4.1 Customer/Public API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analyze` | POST | Photo analysis with AI pricing |
| `/api/assistant-request` | POST | Vapi assistant requests |
| `/api/capture-lead` | POST | Lead capture with funnel tracking (init, update, price_reveal, step, convert, out_of_area) |
| `/api/config/booking-flow` | GET | Booking flow A/B test config |
| `/api/create-booking` | POST | Booking creation with Stripe deposit |
| `/api/photo-quote` | POST | Photo-based quoting |
| `/api/refund-request` | POST | Customer refund requests |
| `/api/service-request` | POST | Service requests (reschedule/cancel) |
| `/api/stripe-webhook` | POST | Stripe payment webhooks |
| `/api/track/[token]` | GET | Customer tracking portal data |
| `/api/track/[token]/tip` | GET/POST | Crew tipping (create + confirm Stripe payment) |
| `/api/track/[token]/feedback` | POST | Customer feedback submission |
| `/api/slots` | GET | Available time slots |
| `/api/waitlist` | POST | Join waitlist |
| `/api/referral` | GET/POST | Referral lookup and creation |

### 4.2 Crew API Routes (`app/api/crew/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/crew/arrived` | POST | Mark arrival |
| `/api/crew/balance-payment/[booking_id]` | GET/POST | Balance payment info + cash declaration |
| `/api/crew/clock-off` | POST | Clock off |
| `/api/crew/collect-payment` | POST | Cash payment collection |
| `/api/crew/complete-job` | POST | Complete job |
| `/api/crew/en-route` | POST | Mark en route |
| `/api/crew/item-conditions` | POST | Item condition reporting |
| `/api/crew/jobs` | GET | Crew job list |
| `/api/crew/location` | POST | Crew location updates |
| `/api/crew/nearby-opportunities` | GET | Find nearby opportunistic jobs |
| `/api/crew/offer-nearby` | POST | Make opportunistic offer |
| `/api/crew/photos/[booking_id]` | GET | Get job photos |
| `/api/crew/resend-payment-link` | POST | Resend payment link |
| `/api/crew/route` | GET | Route information |
| `/api/crew/start-job` | POST | Start job |
| `/api/crew/track/[booking_id]` | GET | Track job progress |
| `/api/crew/upload-photo` | POST | Upload job photos |
| `/api/crew/verify-pin` | POST | PIN verification |

### 4.3 Employee API Routes (`app/api/employee/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/employee/clock-in` | POST | Clock in with GPS |
| `/api/employee/clock-out` | POST | Clock out with GPS |
| `/api/employee/collect-payment` | POST | Payment collection (with server-side validation: signature + 3 photos required) |
| `/api/employee/delete-info` | POST | Account deletion request |
| `/api/employee/documents` | GET/POST | Document management |
| `/api/employee/gas-price` | GET | Current gas price |
| `/api/employee/geofence-event` | POST | Geofence event logging (auto-updates booking status) |
| `/api/employee/incidents` | GET/POST | Incident reporting |
| `/api/employee/issues` | POST | Job issue reporting |
| `/api/employee/job-clock` | POST | Job-level clock in/out |
| `/api/employee/landfill` | GET | Landfill locations |
| `/api/employee/location` | POST | GPS location update |
| `/api/employee/login` | POST | Employee login |
| `/api/employee/logout` | POST | Employee logout |
| `/api/employee/me` | GET/PATCH | Employee profile |
| `/api/employee/nearby-opportunities` | GET | Nearby opportunities (employee auth) |
| `/api/employee/offer-nearby` | POST | Send nearby offer |
| `/api/employee/offer-status` | GET | Poll offer status (for YES-reply webhook) |
| `/api/employee/notifications` | GET/POST | Notifications + mark read |
| `/api/employee/onboard/*` | various | Onboarding wizard endpoints |
| `/api/employee/pay-stubs` | GET | Pay stubs |
| `/api/employee/push-subscribe` | POST | Push notification subscription |
| `/api/employee/receipts` | GET/POST | Expense receipts |
| `/api/employee/reset-password` | POST | Password reset |
| `/api/employee/route-decision` | GET | Route decision |
| `/api/employee/route-plan` | GET/POST | Route plan + acknowledgement |
| `/api/employee/schedule` | GET | Employee schedule |
| `/api/employee/selfie` | POST | Selfie upload |
| `/api/employee/shifts` | GET | Shift history |
| `/api/employee/signature` | POST | Customer signature capture |
| `/api/employee/signup` | POST | Employee signup |
| `/api/employee/sos-log` | POST | SOS event logging |
| `/api/employee/storage-drop` | GET/POST | Storage facility drops |
| `/api/employee/truck-check` | GET/POST | Truck inspection |

### 4.4 Admin API Routes (`app/api/admin/` — 38 routes)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/add-slots` | POST | Add schedule slots |
| `/api/admin/agent` | GET/POST | AI agent actions |
| `/api/admin/bookings` | GET | List/filter bookings by date + stats |
| `/api/admin/bookings/[id]/timeline` | GET | Booking timeline (events + SMS + offers) |
| `/api/admin/call-history` | GET | Vapi call logs with sentiment |
| `/api/admin/cancel` | POST | Cancel booking |
| `/api/admin/command-center` | GET | Daily ops dashboard |
| `/api/admin/complete` | POST | Mark booking complete |
| `/api/admin/config` | GET/POST | System configuration |
| `/api/admin/crew` | GET/POST | Crew management + invites |
| `/api/admin/crew/[id]` | GET/PATCH/DELETE | Individual crew operations |
| `/api/admin/crew/[id]/approve` | POST | Approve employee |
| `/api/admin/crew/[id]/resend-invite` | POST | Resend onboarding invite |
| `/api/admin/crew/assignments` | GET/POST | Crew assignments |
| `/api/admin/crew/donation-centers` | GET/POST | Donation centers |
| `/api/admin/crew/storage` | GET/POST | Storage facilities |
| `/api/admin/crew/push` | POST | Send push notification to crew |
| `/api/admin/crew-locations` | GET | Live crew GPS tracking |
| `/api/admin/dispatch-actions` | GET | AI dispatch agent audit log |
| `/api/admin/earnings` | GET | Earnings/revenue reports |
| `/api/admin/employee-docs` | GET/POST | Employee document verification |
| `/api/admin/employees` | GET | Employee list with hours + clock status |
| `/api/admin/events` | GET | System events log |
| `/api/admin/funnel` | GET | Lead funnel analytics |
| `/api/admin/get-job-photos` | GET | Job photos (crew + customer) |
| `/api/admin/growth` | GET | Growth panel data |
| `/api/admin/insights` | GET | AI-generated business insights |
| `/api/admin/leads` | GET | Lead management with quote history |
| `/api/admin/leads/send-sms` | POST | Send follow-up SMS to leads |
| `/api/admin/login` | POST | Admin authentication |
| `/api/admin/mark-arrived` | POST | Mark crew arrived |
| `/api/admin/no-show` | POST | Mark no-show |
| `/api/admin/optimise-route` | POST | Route optimization with profit estimates |
| `/api/admin/payroll/approve` | GET/POST | Approve payroll + send direct deposit |
| `/api/admin/payroll/preview` | POST | Preview payroll calculation |
| `/api/admin/payroll/run` | POST | Run payroll calculation |
| `/api/admin/quadrant-profit` | GET | Profit by quadrant |
| `/api/admin/referrals` | GET | Referral management |
| `/api/admin/remittance` | GET/POST | Remittance tracking |
| `/api/admin/reschedule` | POST | Reschedule booking |
| `/api/admin/run-migration` | POST | DEPRECATED — schema migration (pending deletion) |
| `/api/admin/safety-incidents` | GET/PATCH | Safety incident reports |
| `/api/admin/schedule` | GET/POST | Schedule management |
| `/api/admin/send-sms` | POST | Send manual SMS |
| `/api/admin/stripe-branding` | POST | Stripe account branding |
| `/api/admin/t4s` | GET | T4 tax forms |
| `/api/admin/update-notes` | POST | Update booking notes |
| `/api/admin/upload-crew-photo` | POST | Upload crew photo |
| `/api/admin/waitlist` | GET/POST | Waitlist management |

### 4.5 Cron Jobs (`app/api/cron/` — 12 jobs)

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/abandonment-followup` | Every 30 min | Lead abandonment SMS (T+1h, T+20h, T+47h) |
| `/api/cron/demand-snapshot` | Every 6 hours | Demand snapshot for surge pricing |
| `/api/cron/generate-t4s` | Annual | T4 generation |
| `/api/cron/onboarding-reminder` | Daily 3PM | Onboarding reminders |
| `/api/cron/opportunistic-offer` | Every 5 min | Opportunistic load offers |
| `/api/cron/refresh-rates` | Periodic | CRA rate refresh |
| `/api/cron/remittance-reminder` | Periodic | Remittance reminders |
| `/api/cron/review-request` | Hourly | Review requests after job completion |
| `/api/cron/run-payroll` | Fri 10AM | Payroll execution |
| `/api/cron/seed-daily-assignments` | Daily 12PM | Seed daily crew assignments |
| `/api/cron/seed-reviewer-jobs` | Daily 12:30PM | Seed reviewer test jobs |
| `/api/cron/seed-donation-drops` | Mon 6AM | Seed donation drop stops |

### 4.6 Communication Routes

| Route | Purpose |
|-------|---------|
| `/api/sms-webhook` | SMS conversation webhook (AI-powered replies, photo handling, booking flow) |
| `/api/sms/inbound` | SMS inbound for YES replies to opportunistic offers (auto-creates booking, pushes route) |
| `/api/whatsapp-webhook` | WhatsApp webhook |
| `/api/vapi` | Vapi voice assistant webhook (booking, service, refunds, dispatch agents) |
| `/api/vapi-outbound` | Vapi outbound call bridge via Quo |

---

## 5. SHARED LIBRARIES (`lib/` — 43 files)

### 5.1 Pricing

| File | Purpose |
|------|---------|
| `pricing.js` | Server-side pricing with runtime config loading from `system_config` |
| `pricingConstants.js` | Client-safe pricing constants + `calculatePrice()` function |
| `itemPricing.js` | 100+ item catalog with prices (dump fees + labor + truck costs) |
| `surge.js` | Demand-based surge pricing (0.85-1.30 multiplier) using slot fill ratios |
| `discountEngine.js` | Capacity-aware discount curve for opportunistic offers (floor: dump fee + fuel + $10) |

**Pricing factors:**
- Base load price: single_item $99, quarter $160, half $240, full $380
- Same-day fee: $50
- Stairs fee: $25 per flight
- Freon fee: $40 per item
- Travel fee: $1.50/km from depot to customer (Mapbox Directions)
- Truck fee: $0 (15ft), $150 (20ft), $300 (26ft)
- Early bird multiplier: 0.95 for 7AM slots
- Surge multiplier: 0.85-1.30 (dynamic)
- Dynamic multiplier: clamped 0.75-1.40
- Deposit: $50 fixed

### 5.2 AI & Photo Analysis

| File | Purpose |
|------|---------|
| `ai.js` | AI photo analysis (Gemini Flash primary, Groq/DeepSeek fallback). Functions: `analysePhotos()`, `analysePhotoDiff()`, `analyseDescription()`, `handleSafetyAlert()` |
| `aiAgent.js` | AI agent logic for admin insights |
| `deepseek.js` | DeepSeek API integration |
| `photoCache.js` | Photo quote caching by SHA-256 hash |
| `photoSimilarity.js` | Perceptual hash (dHash) for photo similarity detection |
| `perceptualHash.js` | Perceptual hashing implementation |

### 5.3 Auth

| File | Purpose |
|------|---------|
| `adminAuth.js` | Admin cookie auth (SHA-256 hash of `junkhaul:${ADMIN_PASSWORD}`) |
| `crewAuth.js` | Crew PIN auth |
| `employeeAuth.js` | Employee session token auth |
| `dispatchAuth.js` | Vapi dispatch agent auth + audit logging |
| `cronAuth.js` | Cron job auth |

### 5.4 Operations

| File | Purpose |
|------|---------|
| `bookingActions.js` | Booking action handlers |
| `cancellations.js` | Cancellation logic + SMS |
| `reschedule.js` | Rescheduling logic + SMS |
| `noshow.js` | No-show handling |
| `waitlist.js` | Waitlist management + SMS notifications |
| `route.js` | Travel fee calculation via Mapbox |
| `routeOptimizer.js` | Route optimization with profit estimates, truck capacity, landfill hours |
| `slotAvailability.js` | Slot availability logic |
| `dispatch.js` | Dispatch logic for crew assignment |
| `geocode.js` | Address geocoding |
| `googleDrive.js` | Google Drive integration for document storage |

### 5.5 Payroll

| File | Purpose |
|------|---------|
| `payroll.js` | Payroll calculation (CPP, CPP2, EI, federal tax, AB tax, vacation pay) |
| `payrollRates.js` | CRA tax rate editions |
| `directDeposit.js` | Direct deposit processing |

### 5.6 Communication

| File | Purpose |
|------|---------|
| `sms.js` | SMS sending via Quo API (logs all messages to `messages` table) |
| `whatsapp.js` | WhatsApp integration |
| `messages.js` | SMS/email templates (confirmation, operator alert, heavy load, upgrade, deposit link, waitlist) |
| `pushNotifications.js` | Web push notifications to crew |

### 5.7 Vapi Tools

| File | Purpose |
|------|---------|
| `vapiTools.js` | 18 Vapi tools for booking/customer service/refunds agents |
| `dispatchTools.js` | 13 Vapi tools for dispatch agent (tier A/B/C) |

### 5.8 Other

| File | Purpose |
|------|---------|
| `supabase.js` | Supabase client (service role + anon) |
| `stripe.js` | Stripe integration |
| `config.js` | System config loading from `system_config` table |
| `analytics.js` | Analytics helpers |
| `audit.js` | Audit logging |
| `dates.js` | Date/time utilities |
| `offlineQueue.js` | Server-side offline queue handling |
| `adminUiHelpers.js` | Admin UI utility functions |

---

## 6. DATABASE — EVERYTHING BUILT

**Database:** Supabase PostgreSQL
**Migrations:** 37 SQL files in `supabase/migrations/`
**Tables:** 55+ tables
**Storage buckets:** `booking-photos` (customer), `crew-photos` (crew)

### 6.1 Core Booking Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `bookings` | All booking data (80+ columns) | booking_ref, name, phone, address, lat/lng, load_size, pricing fields, AI fields, crew_status, payment_status, source, tracking_token, photos, crew_photos |
| `schedule` | Time slots | slot_date, slot_time, max_jobs, jobs_booked, is_available, window_label |
| `waitlist` | Waitlist entries | name, phone, preferred_day_type, load_size, expires_at |
| `messages` | SMS log | booking_id, direction, to_number, message_type, body, provider_status |

### 6.2 Growth Engine Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `leads` | Lead capture + funnel tracking | session_id, phone, source, utm_*, gclid, fbclid, ab_variant, last_step_reached, ai_price_estimate, photos |
| `lead_quotes` | Quote version history | lead_id, price, load_size, photos, itemized (jsonb) |
| `referrals` | Referral program | referrer_phone, referee_phone, reward amounts, status |
| `nearby_offers` | Opportunistic offers | lead_id, customer_phone, offer_type, original_price, discounted_price, distance_km |
| `slot_demand_snapshots` | Surge pricing data | slot_date, fill_ratio, days_out_bucket |

### 6.3 Crew Management Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `employees` | Employee profiles | email, name, phone, status, pay_rate, sin_enc, banking, td1 data, contract |
| `employee_documents` | Onboarding docs | employee_id, doc_type, status, verified_by |
| `employee_sessions` | Auth sessions | token, employee_id, expires_at |
| `employee_invites` | Onboarding invites | email, token, pay_rate, status |
| `crew_assignments` | Daily crew+truck assignments | assignment_date, driver_employee_id, secondary_employee_id, uhaul_location |
| `truck_checks` | Truck inspection records | assignment_id, check_type, odometer_km, fuel_level, dashboard_photo, damage_notes, gas_receipt |
| `transaction_receipts` | Expense receipts | assignment_id, receipt_type, vendor, amount_cad, receipt_photo |
| `customer_signatures` | Payment signatures | booking_id, customer_name_typed, signature_url, amount_confirmed, payment_method |
| `storage_facilities` | Storage locations | name, address, lat/lng, access_code, capacity |
| `storage_drops` | Storage drop records | assignment_id, facility_id, booking_id, item_photos, capacity_estimate |
| `donation_centers` | Donation locations | name, address, lat/lng |
| `donation_runs` | Donation run records | assignment_id, center_id, item_photos, status |
| `job_clock_sessions` | Job-level time tracking | booking_id, employee_id, clock_in_at, clock_out_at, duration |
| `landfills` | Landfill locations + hours | name, address, sunday_open, open_time, close_time |
| `gas_price_cache` | Gas price data | province, price_per_litre, fetched_at |

### 6.4 Payroll & Finance Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `timesheets` | Clock in/out records | employee_id, clock_in_at, clock_out_at, lat/lng, regular_hours, overtime_hours, gross_pay |
| `payroll_rates` | CRA tax rate editions | edition, cpp_rate, ei_rate, fed_brackets, ab_brackets |
| `pay_runs` | Payroll runs | period_start, period_end, status, total_gross, total_net, approved_by |
| `pay_stubs` | Individual pay stubs | pay_run_id, employee_id, gross_pay, cpp, ei, fed_tax, ab_tax, net_pay |
| `direct_deposit_log` | Direct deposit records | pay_stub_id, amount_cad, batch_id, status |

### 6.5 Crew Tracking & Operations Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `crew_locations` | Live crew GPS (realtime enabled) | employee_id, lat, lng, heading, speed, updated_at |
| `crew_photos` | Crew-uploaded job photos | booking_id, employee_id, photo_type, storage_path, lat/lng, captured_at |
| `route_plans` | Server-generated route plans | crew_assignment_id, route_version, stops (jsonb), decision_reason |
| `route_acknowledgements` | Route ack records | route_plan_id, employee_id, acknowledged_at |
| `geofence_events` | GPS geofence transitions | employee_id, booking_id, region_type, event_type, lat/lng, timestamp |
| `gps_overrides` | Manual GPS overrides | booking_id, reason, crew_lat/lng, distance_meters |
| `crew_pin` | Crew PIN hash | pin_hash |
| `push_subscriptions` | Push notification subscriptions | employee_id, endpoint, p256dh, auth |

### 6.6 Safety & Incident Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `safety_alerts` | AI safety alerts (hazmat) | summary, source, booking_id, photo_urls, reviewed_at |
| `safety_incidents` | Incident reports | employee_id, booking_id, severity, category, description, photo_urls, status |
| `incident_reports` | Separate incident reports | employee_id, booking_id, incident_type, severity, location, photo_urls |
| `job_issues` | Job issue flags | booking_id, employee_id, issue_type, severity, description |

### 6.7 Customer Portal Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `customer_feedback` | Reviews and ratings | booking_id, rating, review_text, reviewer_name |
| `crew_tips` | Tip payments | booking_id, assignment_id, amount_cad, stripe_charge_id, status |
| `crew_notifications` | Crew push notifications | employee_id, type, title, body, read_at |
| `offline_job_queue` | Server-side offline queue | employee_id, booking_id, action, payload, synced_at |

### 6.8 System Observability Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `system_config` | Runtime configuration | key, value, value_type, category, updated_by |
| `system_events` | System event log | event_type, booking_id, lead_id, payload |
| `cron_health` | Cron job health | job_name, last_run_at, last_status, last_payload |
| `ai_insights` | AI-generated insights | content, model, input_summary |
| `ai_agent_actions` | AI agent audit log | tool_name, arguments, success, error |
| `dispatch_actions` | Dispatch agent audit log | action, caller_phone, employee_id, booking_id, tier |

### 6.9 Photo & AI Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `photo_phashes` | Perceptual hashes for similarity | phone, session_id, phash, photo_hash, analysis_json |
| `photo_quote_cache` | AI quote cache by photo hash | photo_hash, analysis_json, itemized_json, price_json, photo_urls |
| `image_quotes` | Image-level quote records | image_id (sha256), scan_result, quote_result |

### 6.10 Other Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `phone_verifications` | Phone verification codes | phone, code, expires_at, verified |
| `escalations` | Vapi escalations | caller_phone, booking_ref, reason, escalated_by |
| `compensation_log` | Compensation authorizations | booking_ref, compensation_type, reason, authorized_by |
| `phone_calls` | Legacy call log (superseded by call_history) | vapi_call_id, caller_number, direction, transcript |
| `call_history` | Enhanced call log | caller_number, agent_type, sentiment, call_summary, transcript |

### 6.11 Database Views

| View | Purpose |
|------|---------|
| `quadrant_profit_v` | Per-quadrant profit analytics |
| `lead_quality_v` | Lead quality scoring with conversion status |
| `customer_ltv_v` | Customer lifetime value by phone number |

### 6.12 Database Functions

- `increment_slot(p_date, p_time)` — Increments jobs_booked
- `decrement_slot(p_date, p_time)` — Decrements jobs_booked
- `bookings_updated_at` trigger — Auto-updates updated_at
- `safety_incidents_updated_at` trigger — Auto-updates updated_at

### 6.13 Realtime (Supabase)

- `crew_locations` table — realtime enabled for live GPS tracking
- `route_plans` table — watched by crew app for instant route updates

### 6.14 Storage Buckets

- `booking-photos` — Customer-uploaded photos (public read)
- `crew-photos` — Crew-uploaded photos (public read, authenticated write)

---

## 7. ADMIN PORTAL — EVERYTHING BUILT

**Location:** `/Users/hammadbhatti/Junkhaul/app/admin/` + `/components/admin/`
**Auth:** Single shared password via `ADMIN_COOKIE` (SHA-256 hash)
**Note:** No manager role exists yet — all admin users have full access

### 7.1 Admin Pages (21 components)

| Component | File | Data Source | What It Shows |
|-----------|------|-------------|---------------|
| AdminLayout | `AdminLayout.js` | — | Main shell with navigation, search, notifications |
| AdminLoginPage | `AdminLoginPage.js` | — | Password login |
| DashboardView | `DashboardView.js` | `/api/admin/command-center` | Today's stats, urgent calls, pending offers, stale crons |
| DispatchView | `DispatchView.js` | `/api/admin/bookings`, `/api/admin/crew-locations` | Job list by date, live crew map, route optimization, complete/cancel/reschedule actions |
| ScheduleView | `ScheduleView.js` | `/api/admin/schedule` | Slot management, fill rates, toggle slots, set max jobs |
| LeadsView | `LeadsView.js` | `/api/admin/leads` | Lead list with quotes, funnel status, send SMS |
| WaitlistView | `WaitlistView.js` | `/api/admin/waitlist` | Waitlist entries, send notification SMS |
| EarningsDashboard | `EarningsDashboard.js` | `/api/admin/earnings` | Revenue by source, by date, pipeline |
| PayrollPanel | `PayrollPanel.js` | `/api/admin/payroll/*` | Pay runs, remittances, T4s, preview/approve/run |
| CrewView | `CrewView.js` | `/api/admin/crew`, `/api/admin/safety-incidents` | Crew roster, clock-in status, safety incidents |
| GrowthPanel | `GrowthPanel.js` | `/api/admin/growth`, `/api/admin/funnel` | Funnel analytics, abandonment, A/B tests, opportunistic offers, cron health |
| CallsPanel | `CallsPanel.js` | `/api/admin/call-history` | Vapi call logs with sentiment, sorted by risk |
| IntelPanel | `IntelPanel.js` | `/api/admin/quadrant-profit` | Profitability by quadrant |
| ReferralsPanel | `ReferralsPanel.js` | `/api/admin/referrals` | Referral leaderboard, referral list |
| ConfigPanel | `ConfigPanel.js` | `/api/admin/config` | System configuration by category |
| AuditTrail | `AuditTrail.js` | `/api/admin/events` | System events log, filter by type |
| DispatchLogView | `DispatchLogView.js` | `/api/admin/dispatch-actions` | AI dispatch agent actions by tier |
| BookingTimeline | `BookingTimeline.js` | `/api/admin/bookings/[id]/timeline` | Combined timeline of events, SMS, offers |
| LiveCrewMap | `LiveCrewMap.js` | `/api/admin/crew-locations` | Real-time crew GPS on map |
| RouteMap | `RouteMap.js` | — | Route visualization |
| CommandCenter | `CommandCenter.js` | `/api/admin/command-center` | Operations overview |

### 7.2 Admin Navigation Tabs

Dashboard, Dispatch, Schedule, Leads, Waitlist, Earnings, Payroll, Crew, Growth, Calls, Intel, Referrals, Config, Audit, Dispatch Log

---

## 8. VAPI VOICE AI — EVERYTHING BUILT

**Location:** `/app/api/vapi/`, `/lib/vapiTools.js`, `/lib/dispatchTools.js`
**Agents:** 4 specialized agents (Booking, Customer Service, Refunds, Dispatch)
**Auth:** `VAPI_SERVER_SECRET` header

### 8.1 Vapi Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| Greeter | Routes calls to appropriate specialist | Handoff destination logic |
| Booking (Morgan) | Sales — create bookings, quotes, check availability | 18 tools in vapiTools.js |
| Customer Service (Riley) | Reschedule, cancel, answer questions | Same 18 tools |
| Refunds | Process refund requests | issue_refund tool |
| Dispatch (AI Crew Support) | Crew support — schedule, location, incidents | 13 tools in dispatchTools.js |

### 8.2 Booking/Service Agent Tools (18 tools in `vapiTools.js`)

| Tool | Purpose | DB Access |
|------|---------|-----------|
| `check_availability` | Get open pickup slots | Reads `schedule` |
| `get_quote` | Price quote | Reads pricing config |
| `create_booking` | Create booking | Writes to `bookings` (source: 'vapi') |
| `lookup_booking` | Look up booking | Reads `bookings` |
| `cancel_booking` | Cancel booking | Updates `bookings` |
| `reschedule_booking` | Reschedule | Updates `bookings` |
| `add_to_waitlist` | Add to waitlist | Writes to `waitlist` |
| `issue_refund` | Stripe refund | Updates `bookings`, Stripe API |
| `send_email` | Send branded email | Resend API |
| `escalate_to_human` | Escalate to operator | Writes `phone_calls`, SMS |
| `notify_operator` | Urgent notification | SMS |
| `get_calgary_info` | Weather/news/events | External APIs |
| `get_sports_info` | Calgary sports | NHL API, CBC RSS |
| `get_job_photos` | Retrieve job photos | Reads `bookings` |
| `get_booking_details` | Full booking details | Reads `bookings` |
| `escalate_to_owner` | Escalate to owner | Writes `escalations` |
| `log_compensation` | Log compensation | Writes `compensation_log` |

### 8.3 Dispatch Agent Tools (13 tools in `dispatchTools.js`)

| Tool | Tier | Purpose |
|------|------|---------|
| `get_crew_schedule` | A | Get crew schedule for a date |
| `get_booking_details` | A | Get booking details |
| `get_crew_location` | A | Get crew GPS location |
| `trigger_password_reset` | B | Reset crew password |
| `resend_payment_link` | A | Resend payment link |
| `get_customer_feedback` | A | Get customer feedback |
| `log_issue` | A/B/C | Log job issue |
| `log_incident` | B/C | Log incident report |
| `mark_no_show` | B | Mark job as no-show |
| `escalate_to_owner` | C | Escalate to owner |
| `notify_operator` | B | Notify operator |
| `get_today_overview` | A | Today's dispatch overview |
| `get_policy_info` | A | Answer policy questions |

All dispatch actions logged to `dispatch_actions` table with tier (A/B/C).

### 8.4 Vapi Call Logging

- End-of-call report writes to `phone_calls` table: vapi_call_id, caller_number, direction, duration, cost, transcript, outcome, agent_type
- Follow-up SMS sent on customer hangup (skips if booking completed, quick transfer, or dispatch agent)
- Frustration detection for appropriate follow-up message
- Outbound calls via Quo bridge (`/api/vapi-outbound`)

---

## 9. SMS SYSTEM — EVERYTHING BUILT

**Provider:** Quo API (replaced Twilio)
**Phone:** (587) 325-0751
**Logging:** All SMS logged to `messages` table

### 9.1 SMS Templates (30+ types)

| Type | Trigger | Recipient |
|------|---------|-----------|
| `lead_welcome` | Phone captured at booking start | Customer |
| `lead_price_reveal` | Quote shown | Customer |
| `confirmation` | Booking created (deposit paid) | Customer |
| `operator_alert` | New booking | Hammad |
| `heavy_load_customer` | AI flags heavy load | Customer |
| `heavy_load_operator` | AI flags heavy load | Hammad |
| `upgrade` | AI suggests larger load | Customer |
| `deposit_link` | Vapi/WhatsApp booking | Customer |
| `waitlist_confirm` | Added to waitlist | Customer |
| `waitlist` | Slot opens | Customer |
| `abandonment_touch1` | T+1 hour no booking | Customer |
| `abandonment_touch2` | T+20 hours | Customer |
| `abandonment_touch3` | T+47 hours ($15 off) | Customer |
| `deadhead_offer` | Crew nearby with space | Customer |
| `review_request` | Job completed | Customer |
| `out_of_area_lead` | Out of area | Hammad |
| `service_request_confirmation` | Service request submitted | Customer |
| `service_request_operator` | Service request | Hammad |
| `cancellation` | Booking cancelled | Customer |
| `frustrated_hangup` | Frustrated call hangup | Customer |
| `follow_up` | Normal call hangup | Customer |
| `dispatch_password_reset` | Password reset | Hammad |
| `dispatch_payment_link` | Payment link resent | Customer |
| `dispatch_incident_escalation` | Critical incident | Hammad |
| `dispatch_no_show` | No-show marked | Hammad |
| `offer_confirmed` | Opportunistic offer accepted | Customer |
| `offer_expired` | Offer expired | Customer |
| `help` | HELP keyword | Customer |
| `optout` | STOP keyword | Customer |

### 9.2 Inbound SMS Handling

**General conversation (`/api/sms-webhook`):**
- AI-powered replies using Groq LLM
- Photo handling (MMS): downloads, uploads to Supabase, AI analysis, quote generation
- Conversation stages: quote_given, awaiting_address, awaiting_name, awaiting_slot_choice, deposit_sent
- Booking creation via SMS (source: 'sms')
- STOP/HELP keyword handling
- CANCEL keyword handling
- Deduplication via provider_sid

**YES-reply for offers (`/api/sms/inbound`):**
- Handles YES replies to opportunistic offers
- Atomic lock on nearby_offers record
- Auto-creates booking from accepted offer
- Inserts stop into crew's route via `insertStopMidRoute()`
- Pushes new route to crew app
- Confirms with customer

---

## 10. HOW EVERYTHING CONNECTS

### 10.1 Customer Journey → Database → Admin → Crew

```
Customer visits website
  → Landing page (app/page.js)
  → Booking flow (app/book/page.js)
    → Phone gate → creates LEAD (leads table)
    → Address → updates LEAD with lat/lng/quadrant
    → Photos → /api/analyze → AI analysis → photo_quote_cache + photo_phashes
    → Price reveal → updates LEAD + creates lead_quotes row
    → Customize items → client-side pricing
    → Schedule → /api/slots reads schedule table
    → Contact details → client state
    → Deposit payment → /api/create-booking
      → Creates BOOKING (bookings table, 80+ columns)
      → Creates Stripe PaymentIntent
      → Resolves dispatch → crew_assignments
      → Updates leads.converted_to_booking_id
      → Sends confirmation SMS → messages table
      → Sends operator alert SMS → messages table
    → Stripe webhook → /api/stripe-webhook
      → Marks deposit_paid, status='confirmed'
      → Increments schedule.jobs_booked

Admin sees:
  → Dashboard (command center) → today's bookings, urgent calls
  → Dispatch → job list, live crew map, route optimization
  → Leads → all leads with funnel status, quotes, source attribution
  → Schedule → slot management
  → Earnings → revenue by source, by date

Crew app receives:
  → /api/employee/schedule → today's jobs
  → /api/employee/route-plan → optimized route (route_plans table)
  → Supabase Realtime → instant route updates
  → Push notifications → new assignments
```

### 10.2 Crew Job Flow → Database → Admin

```
Crew clocks in
  → /api/employee/clock-in → timesheets table
  → Admin sees live clock-in status

Crew picks up truck
  → /api/employee/truck-check → truck_checks table
  → Admin: NO visibility yet (gap)

Crew views route
  → /api/employee/route-plan → route_plans table
  → Crew acknowledges → route_acknowledgements table
  → Admin: NO visibility yet (gap)

Crew drives to job
  → GPS updates → /api/employee/location → crew_locations table (realtime)
  → Admin sees live crew map
  → Geofence triggers → /api/employee/geofence-event → geofence_events table
  → Auto-updates booking.crew_status to 'arrived'
  → Admin: geofence events NO visibility (gap)

Crew completes 9-step job:
  → Item conditions → /api/crew/item-conditions
  → Arrival photos → crew_photos table + bookings.crew_photos
  → Signature → /api/employee/signature → customer_signatures table
  → Payment → /api/employee/collect-payment → bookings.payment_status
    → Server validates: signature exists + 3 photos + amount matches
  → Drop photos → crew_photos table
  → Admin: photos visible via /api/admin/get-job-photos

Crew reports incident
  → /api/employee/incidents → safety_incidents table
  → Admin sees via /api/admin/safety-incidents

Crew triggers SOS
  → /api/employee/sos-log → system_events
  → Admin: NO dedicated visibility (gap)

Crew clocks out
  → /api/employee/clock-out → timesheets table
  → Admin sees via /api/admin/employees
```

### 10.3 Vapi Call → Database → Admin

```
Customer calls
  → Vapi webhook (/api/vapi)
  → Greeter routes to Booking/Service/Refunds/Dispatch agent
  → Agent uses tools (vapiTools.js / dispatchTools.js)
  → create_booking → bookings table (source: 'vapi')
  → lookup_booking → reads bookings
  → issue_refund → Stripe + bookings
  → End-of-call report → phone_calls table
  → Follow-up SMS → messages table
  → Dispatch actions → dispatch_actions table (tier A/B/C audit)

Admin sees:
  → Calls panel → call_history table with sentiment
  → Dispatch log → dispatch_actions table
  → Bookings → all bookings including vapi-sourced
```

### 10.4 SMS → Database → Admin

```
Customer texts
  → /api/sms-webhook
  → AI-powered reply (Groq LLM)
  → Photo handling → AI analysis → quote
  → Booking creation (source: 'sms')
  → All messages logged to messages table

Customer replies YES to offer
  → /api/sms/inbound
  → Accepts nearby_offers record
  → Auto-creates booking
  → Inserts stop in crew route
  → Pushes route to crew app

Admin sees:
  → Booking timeline → messages for a booking
  → Growth panel → nearby_offers
```

### 10.5 Payment Flow

```
Deposit:
  Customer → Stripe PaymentElement → /api/create-booking → Stripe PaymentIntent
  → /api/stripe-webhook → payment_intent.succeeded
  → bookings.deposit_paid = true, status = 'confirmed'

Balance (online):
  Customer → /app/pay/[booking_id] → Stripe PaymentElement
  → /api/crew/balance-payment/[booking_id] → Stripe

Balance (crew-collected):
  Crew → /api/employee/collect-payment
  → Server validates: signature + 3 photos + amount
  → bookings.payment_status = 'cash_crew' or 'paid_card'
  → SMS receipt to customer

Tip:
  Customer → tracking page → /api/track/[token]/tip
  → Stripe PaymentIntent → crew_tips table

Refund:
  Customer → /api/refund-request → refund_requests table
  → Vapi refunds agent follow-up
  → Admin processes → bookings.refund_amount, refund_processed
```

### 10.6 Pricing Flow

```
Customer uploads photos
  → /api/analyze → AI analysis (Gemini Flash)
  → Returns: load_size, items, confidence, hazmat, freon
  → Itemized quote from itemPricing.js catalog
  → Photo similarity check (perceptual hash)
  → Cached in photo_quote_cache

Customer selects load size + options
  → Client-side calculatePrice() from pricingConstants.js
  → Factors: base, same_day, stairs, freon, travel, truck, surge

Booking creation
  → /api/create-booking → server-side calculatePriceWithConfig()
  → Loads runtime config from system_config
  → Computes surge from slot_demand_snapshots
  → Geocodes address → travel fee via Mapbox
  → Final price stored in bookings (base_price, fees, total_price, multipliers)

Lead quote history
  → Every price reveal → lead_quotes table (price, load_size, itemized)
  → Admin can see all quote versions
```

### 10.7 Route Optimization Flow

```
Admin triggers optimization
  → /api/admin/optimise-route → lib/routeOptimizer.js
  → Factors: time windows, job duration, crew location, truck capacity, landfill hours, shift end
  → Generates ordered stops with profit estimates
  → Profit: revenue - truck cost - dump fee (from lib/pricing.js estimateProfit)

Route plan generation
  → generateRoutePlan() → route_plans table
  → Stops include: customer, landfill, storage, fuel
  → Route versioning (unique constraint: assignment_id + route_version)

Crew app receives route
  → /api/employee/route-plan → fetches latest version
  → Supabase Realtime → instant push of new versions
  → Crew acknowledges → route_acknowledgements table

Opportunistic offer accepted
  → /api/sms/inbound → insertStopMidRoute()
  → New stop inserted into existing route
  → New route version pushed to crew app
```

---

## 11. EMPLOYEE PORTAL (WEB) — EVERYTHING BUILT

**Location:** `/app/portal/`
**Purpose:** Web-based employee portal (alternative to Flutter app)

### 11.1 Portal Pages

| Page | Path | Purpose |
|------|------|---------|
| Portal Home | `/portal/` | Dashboard |
| Onboard | `/portal/onboard/` | Onboarding wizard |
| Schedule | `/portal/schedule/` | View schedule |
| Job | `/portal/job/` | Job details |
| Clock | `/portal/clock/` | Clock in/out |
| Documents | `/portal/documents/` | Document management |
| Incidents | `/portal/incidents/` | Incident reporting |
| Notifications | `/portal/notifications/` | Notifications |
| Pay Stubs | `/portal/paystubs/` | Pay stub viewing |
| Verification | `/portal/verification/` | Awaiting approval |
| Reset Password | `/portal/reset-password/` | Password reset |

---

## 12. CURRENT STATUS SUMMARY

### 12.1 What's Working (Production)

- Customer booking flow (web + SMS + Vapi)
- Photo quote with AI (Gemini Flash)
- Stripe deposit + balance payments
- Customer tracking page with live map
- Customer feedback + tipping
- Lead capture + funnel tracking + A/B testing
- Abandonment follow-up SMS (3 touches)
- Surge pricing (demand-based)
- Discount engine for opportunistic offers
- Nearby opportunity offers + YES-reply booking
- Crew app (Flutter) — built, installed on iPhone
- Crew clock in/out with GPS
- Crew truck pickup/return checks
- Crew 9-step job workflow
- Turn-by-turn navigation (Mapbox)
- Customer signature capture
- Payment collection (cash/card/SMS) with server validation
- Geofence arrival/departure detection
- Route plan generation + realtime push
- Offline queue (15 action types)
- Incident reporting
- SOS emergency
- Vapi 4 agents (booking, service, refunds, dispatch)
- Admin portal (21 components, 38 API routes)
- Payroll calculation (CPP, CPP2, EI, federal/AB tax)
- Pay runs + approval + direct deposit
- T4 generation
- Remittance tracking
- Referral program
- Waitlist with SMS notifications
- Review request cron
- Donation drop cron
- 10 SEO neighborhood pages
- 6 policy pages
- Privacy policy (in-app)
- Account deletion request flow

### 12.2 Known Gaps (Not Yet Built)

**Admin visibility gaps (15 tables with no admin UI):**
- `safety_alerts` — AI hazmat alerts
- `incident_reports` — separate from safety_incidents
- `job_issues` — job issue flags
- `direct_deposit_log` — direct deposit records
- `crew_tips` — tip amounts
- `transaction_receipts` — expense receipts
- `payroll_rates` — no admin screen for CRA rate editions
- `cron_health` — cron job health monitoring
- `truck_checks` — truck inspection data
- `gps_overrides` — manual GPS overrides
- `customer_feedback` — reviews and ratings
- `customer_signatures` — payment signatures
- `donation_runs` — donation run records
- `storage_drops` — storage drop records
- `crew_notifications` — crew push notifications

**Crew app gaps:**
- Photo upload not fully wired (TODO comments in truck pickup, arrival, drop-off, truck fullness)
- Item conditions error handling is silent
- Route decision is local only (not sent to backend)
- Truck fullness AI not integrated
- Drop-off photos not fully implemented

**Platform gaps:**
- No manager role or RBAC (single admin password)
- No door-hanger booking flow (`/book/hanger`)
- No marketing attribution system (only basic `source` field)
- No campaign management or tracking links
- No funnel event log table (only `last_step_reached` on leads)
- No booking price revision history (only `lead_quotes` for pre-booking)
- No refund history table
- Vapi calls not attached to bookings (phone_calls.booking_id always null)
- `escalations` and `compensation_log` tables only defined in deprecated run-migration route
- `crew_location` (singular) is dead code, `crew_locations` (plural) is live
- `/api/admin/run-migration` pending deletion

### 12.3 Deployment Status

- **Web platform:** Deployed to Vercel production
- **Crew app:** Built and installed on iPhone
- **Database:** All 37 migrations applied to Supabase production
- **Environment variables set:** MAPBOX_ACCESS_TOKEN, VAPI_SERVER_SECRET, STRIPE keys, QUO_API_KEY, SUPABASE keys, GEMINI API key, DEEPSEEK API key, RESEND API key
- **Cron jobs:** 5 Vercel crons + 16 Supabase pg_cron jobs active
- **Storage:** 2 Supabase Storage buckets (booking-photos, crew-photos)
- **Realtime:** crew_locations + route_plans tables

### 12.4 Latest Commits (Most Recent First)

1. `50982aa` — Add YES-reply webhook for opportunistic offers + offer status polling
2. `dc8c38d` — Add crew photos storage, geofence detection, payment validation tests
3. `3112fa6` — Add crew route engine, nearby opportunities, payment validation, SOS logging
4. `ea17c8d` — Switch AI vision to Gemini Flash Latest with thinkingBudget=0
5. `651b294` — Remove crew policy links from customer homepage
6. `8d1137b` — Fix policy page colors to match brand
7. `5a4ad9e` — Add policy pages: privacy, crew-privacy, safety, vehicle use, code of conduct, uniform
8. `8b2831b` — Fix schedule: simplify assignment query
9. `b549e9b` — Fix schedule API: use job_time instead of non-existent time_slot column
10. `b7feccc` — Fix sharp resize: round to integer width
11. `ccdefcd` — Maximize item detection: 3x3 grid + 1.5x zoom + aggressive prompt
12. `4166915` — Smart truck size + flat-rate comparison from photo analysis
13. `3b21f33` — Add itemized breakdown to photo-quote response
14. `07127b4` — Photo-quote: Gemini 2.5 Flash + sharp enhance + multi-image + dedupe
15. `ea3c682` — Fix Dispatch agent hallucination: enforce real-data-only responses
16. `ffcd83b` — Build Dispatch AI agent for crew support line
17. `a0052b6` — Funnel analytics + A/B test framework for phone-gate position
18. `1a7c18f` — Deterministic photo pricing: exact cache + perceptual hash diff
19. `9030e16` — Fix Review & Customize: item names, flat-rate savings, truck size, freon bug
20. `f51e0e8` — Customer booking flow: dark theme removal, state persistence, UX fixes

**Total commits:** 175+

---

## 13. FILE STRUCTURE SUMMARY

### 13.1 Web Platform (`/Users/hammadbhatti/Junkhaul/`)

```
Junkhaul/
├── app/                    # Next.js app router
│   ├── page.js            # Landing page
│   ├── book/              # Booking flow
│   ├── track/             # Customer tracking
│   ├── pay/               # Balance payment
│   ├── waitlist/          # Waitlist page
│   ├── refund/            # Refund request
│   ├── service-request/   # Service requests
│   ├── photos/            # Photo upload
│   ├── admin/             # Admin portal pages
│   ├── portal/            # Employee web portal
│   ├── api/               # 80+ API routes
│   │   ├── admin/         # 38 admin routes
│   │   ├── crew/          # 18 crew routes
│   │   ├── employee/      # 34 employee routes
│   │   ├── cron/          # 12 cron jobs
│   │   ├── sms/           # SMS inbound
│   │   ├── vapi           # Vapi webhook
│   │   └── ...            # Public routes
│   └── [SEO pages]        # 10 neighborhood + service pages
├── components/
│   ├── admin/             # 21 admin components
│   └── booking/           # 3 booking components
├── lib/                   # 43 shared libraries
├── supabase/
│   └── migrations/        # 37 SQL migration files
├── docs/                  # Documentation + Vapi prompts
├── vercel.json            # Vercel config with 5 crons
└── package.json
```

### 13.2 Crew App (`/Users/hammadbhatti/Desktop/crew_app/`)

```
crew_app/
├── lib/
│   └── src/
│       ├── data/
│       │   ├── api/          # API client (employee_api.dart, dio_client.dart)
│       │   ├── services/     # 4 services (camera, geofence, mapbox, photo upload)
│       │   ├── offline/      # Offline queue (Hive)
│       │   └── supabase/     # Realtime service
│       ├── domain/
│       │   └── providers/    # 6 Riverpod providers
│       ├── presentation/
│       │   └── features/     # 27 feature directories
│       │       ├── schedule/
│       │       ├── job/      # 9-step workflow + navigation
│       │       ├── clock/
│       │       ├── truck_pickup/
│       │       ├── truck_check/
│       │       ├── earnings/
│       │       ├── incidents/
│       │       ├── sos/
│       │       ├── opportunities/
│       │       └── ... (20 more)
│       └── router/           # go_router configuration
├── ios/                      # iOS configuration
├── android/                  # Android configuration
└── pubspec.yaml              # Flutter dependencies
```

---

## 14. KEY CONFIGURATION

### 14.1 Environment Variables (Vercel + local)

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key
- `SUPABASE_ANON_KEY` — Supabase anon key
- `STRIPE_SECRET_KEY` — Stripe API secret
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `MAPBOX_ACCESS_TOKEN` — Mapbox API token
- `VAPI_SERVER_SECRET` — Vapi webhook secret
- `QUO_API_KEY` — Quo SMS API key
- `QUO_PHONE_NUMBER` — Quo phone number
- `QUO_USER_ID` — Quo user ID
- `QUO_WEBHOOK_SECRET` — Quo webhook secret
- `GEMINI_API_KEY` — Google Gemini AI API key
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `GROQ_API_KEY` — Groq API key
- `RESEND_API_KEY` — Resend email API key
- `ADMIN_PASSWORD` — Admin portal password
- `HAMMAD_PHONE` — Owner phone number
- `CRON_SECRET` — Cron job auth secret

### 14.2 Vercel Cron Jobs (vercel.json)

- `onboarding-reminder` — Daily 3PM
- `run-payroll` — Friday 10AM
- `seed-daily-assignments` — Daily 12PM
- `seed-reviewer-jobs` — Daily 12:30PM
- `seed-donation-drops` — Monday 6AM

### 14.3 Supabase pg_cron Jobs (16 jobs)

- `generate-weekly-slots` — Mondays 5AM
- `morning-reminders` — Hourly (7AM guard)
- `operator-day-summary` — Every 30 min (Thu/Sun guard)
- `review-requests` — Every 30 min
- `no-show-check` — Every 30 min (7AM-5PM guard)
- `risk-reminders` — Hourly (8PM guard)
- `waitlist-cleanup` — Hourly
- `slot-fill-alert` — Tue/Fri 9AM
- `day-before-fill` — Wed/Sat 8PM
- `lead-followup` — Every 3 hours
- `crew-location-cleanup` — Hourly (24h retention)
- `abandonment-followup` — Every 30 min
- `opportunistic-offer-live` — Every 5 min
- `opportunistic-offer-proactive` — 8AM daily
- `review-request` — Hourly
- `demand-snapshot` — Every 6 hours

---

*This document is a living record. Update it as new features are built.*
