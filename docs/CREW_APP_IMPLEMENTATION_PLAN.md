# Junk Haul Calgary — Crew App (Flutter) — Implementation Plan / Checklist

This document is a **prescriptive, step-by-step build plan** derived from `JUNK_HAUL_FLUTTER_CREW_APP_DEV_SPEC.md`. It is designed to be followed like a runbook so nothing in the spec is missed or interpreted differently.

**Use this plan as:**
1. The master task list for every sprint / coding session.
2. The acceptance checklist for every feature.
3. The dependency tracker for backend work that is not Flutter-side.

---

## Legend

- `[ ]` = open task
- `[x]` = completed task
- `🚩 BACKEND` = work that must be done in the Next.js/Supabase backend before the Flutter piece can be considered complete.
- `⚠️ BLOCKER` = a hard dependency that, if not completed, stops the app from working.
- `🧪 VERIFY` = explicit test/verification step before proceeding to the next phase.
- `📜 SPEC` = a direct quote or reference back to the build spec.

---

## 0. Project Setup Conventions

Before writing code, settle these:

1. [ ] **Repo location**: Create the Flutter project under `junkhaul/apps/crew_app` or `junkhaul/crew_app` (decide once and do not move it later; all paths below assume `junkhaul/apps/crew_app`).
2. [ ] **Flutter version**: Use the latest stable Flutter SDK at least 7 days old. Run `flutter doctor` and fix all issues before proceeding.
3. [ ] **Minimum target**: Set `minSdkVersion 24` (Android) and `iOS 13.0` (iOS) to safely support Mapbox, ML Kit, and `workmanager`.
4. [ ] **Dart style**: `flutter_lints` with strict mode, no implicit `dynamic`, no `print` calls in production code (use `log` or Sentry breadcrumbs).
5. [ ] **No dark mode**: `MaterialApp.themeMode` must be hard-coded to `ThemeMode.light` and the entire theme will be built from the spec colors (never use `Theme.of(context).brightness` to decide colors).
6. [ ] **Naming**: `PascalCase` widgets, `snake_case` files, `lowerCamelCase` providers (`auth_provider.dart`).
7. [ ] **State management**: Riverpod `AsyncNotifier` for every feature. No `setState` for shared state, no `get_it`/`get_x`.

---

## Phase 1 — Pre-Flight: Backend Audit & API Mapping

Goal: Confirm the existing Next.js routes can be called from Flutter and identify missing backend work before the Flutter app is built.

**Important:** This audit was re-done from `origin/main` (`app/api/employee/*` and `app/api/crew/*`) by reading each route file directly. The previous plan was based on the stale `devin/1783223164-junkhaul-platform` branch.

### 1.1 Auth model (source of truth)

Read `lib/employeeAuth.js` and `lib/crewAuth.js` on `origin/main` before building the network layer.

| Auth file | Where it is used | Mechanism | What Flutter must send |
|---|---|---|---|
| `lib/employeeAuth.js` `getAuthedEmployee(req)` | All `app/api/employee/*` routes | Reads `jh_employee_session` cookie from `req.headers.get('cookie')` | Cookie is set by `POST /api/employee/login` and `POST /api/employee/signup`. For the native app, `dio` must persist this cookie, OR the backend must be extended to accept an `Authorization: Bearer <token>` header (Section 3.1). |
| `lib/crewAuth.js` `crewAuth(req)` | All `app/api/crew/*` routes | Reads `x-crew-pin` header and compares SHA-256 hash against `crew_pin` table | `x-crew-pin` header. These routes are the old crew portal; the new employee portal uses `employeeAuth`. The Flutter app should not mix the two auth schemes. |

`🚩 BACKEND` — Before the Flutter app goes to production, decide and document the native-auth contract:
- Option A: `dio` with cookie jar (`jh_employee_session` cookie) and the `employee` API.
- Option B: `POST /api/employee/login` returns a bearer token in the JSON body and `getAuthedEmployee` also accepts `Authorization: Bearer <token>`.

### 1.2 Employee API contract (`app/api/employee/*`)

These are the routes used by the live employee PWA (`app/portal/*`). They are the primary targets for the Flutter app.

| Method | Path | Auth | Request Body / Query | Response Shape | Notes |
|---|---|---|---|---|---|
| POST | `/api/employee/clock-in` | `getAuthedEmployee(req)` | JSON `{ lat?, lng? }` | `{ ok: true, shift: { id, employee_id, clock_in_at, clock_in_lat, clock_in_lng } }` | Status must be `active` or `onboarded`; prevents double clock-in. |
| POST | `/api/employee/clock-out` | `getAuthedEmployee(req)` | JSON `{ lat?, lng? }` | `{ ok: true, shift: { id, clock_in_at, clock_out_at, regular_hours, overtime_hours, total_hours, gross_pay } }` | Calculates pay using payroll lib. |
| GET | `/api/employee/documents` | `getAuthedEmployee(req)` | None | `{ documents: [{ id, employee_id, doc_type, status, storage_url, storage_path, extracted_data, ocr_text, uploaded_at, verified_at }] }` | Lists current employee documents. |
| POST | `/api/employee/documents` | `getAuthedEmployee(req)` | Multipart `doc_type`, `file` | `{ ok: true, document: {...}, extracted_data: {...}, onboarding_complete: bool }` | `doc_type` ∈ `employment_contract, td1_federal, td1_ab, id, banking_info, sin_document, drivers_license_front, drivers_license_back, other`. OCR for license. |
| GET | `/api/employee/gas-price` | `getAuthedEmployee(req)` | None | `{ price_per_litre, currency, source, fetched_at, from_cache, warning? }` | Cached 7 days; fallback 1.55 CAD. |
| GET | `/api/employee/incidents` | `getAuthedEmployee(req)` | None | `{ incidents: [...] }` | Last 50 incidents. |
| POST | `/api/employee/incidents` | `getAuthedEmployee(req)` | JSON `{ booking_id, incident_type, severity, description, location, photo_urls, reported_to }` | `{ incident: {...} }` | `description` required; creates crew notification. |
| GET | `/api/employee/issues` | `getAuthedEmployee(req)` | `?booking_id` (optional) | `{ issues: [...] }` | Job issue flags. |
| POST | `/api/employee/issues` | `getAuthedEmployee(req)` | JSON `{ booking_id, issue_type, severity, description, photo_url }` | `{ issue: {...} }` | Creates job issue + notification. |
| POST | `/api/employee/job-clock` | `getAuthedEmployee(req)` | JSON `{ booking_id, assignment_id, action: 'in' | 'out' }` | `in` → `{ ok: true, session: { id, booking_id, assignment_id, employee_id, clock_in_at } }`; `out` → `{ ok: true, duration_minutes: number }` | Auto-manages shift timesheet. |
| GET | `/api/employee/landfill` | `getAuthedEmployee(req)` | `?lat&lng` (optional) | `{ recommended: {...}, all: [...], warnings: [...], day_of_week, is_sunday }` | Filters by day of week; recommends nearest open landfill. |
| POST | `/api/employee/location` | `getAuthedEmployee(req)` | JSON `{ lat, lng, heading?, speed? }` | `{ ok: true }` | Upserts `crew_location` by `employee_id`. |
| GET | `/api/employee/location` | None | `?booking_id` (required) | `{ location: { lat, lng, heading, updated_at, crew_first_names, en_route } }` | Public customer tracking endpoint. |
| POST | `/api/employee/login` | None | JSON `{ email, password }` | `{ employee: { id, email, name, status, onboarding_complete, pending_verification } }` + `Set-Cookie: jh_employee_session` | Scrypt password verify; rejects `terminated`/`rejected`. |
| POST | `/api/employee/logout` | `getAuthedEmployee(req)` | None | `{ ok: true }` + cleared cookie | Destroys session. |
| GET | `/api/employee/me` | `getAuthedEmployee(req)` | None | `{ employee: {...}, documents: [...], onboarding: { complete, required, uploaded, missing }, drive_configured: false }` | Full profile + onboarding status. |
| PUT | `/api/employee/me` | `getAuthedEmployee(req)` | JSON `{ phone, address, td1_federal_claim, td1_ab_claim, onboarding_step, bank_institution, bank_transit, bank_account }` | `{ ok: true }` | Profile update; `onboarding_step` cannot go backwards. |
| GET | `/api/employee/notifications` | `getAuthedEmployee(req)` | None | `{ notifications: [...], unread: number }` | Last 50 notifications. |
| POST | `/api/employee/notifications` | `getAuthedEmployee(req)` | JSON `{ id?, markAll? }` | `{ ok: true }` | Mark read. |
| POST | `/api/employee/onboard/acknowledgments` | `getAuthedEmployee(req)` | JSON `{ tickets, phone, data, company_card }` (booleans) | `{ ok: true, acknowledgments: {...} }` | Acknowledgment checkboxes. |
| GET | `/api/employee/onboard/acknowledgments` | `getAuthedEmployee(req)` | None | `{ acknowledgments: {...} }` | Retrieve acknowledgments. |
| POST | `/api/employee/onboard/banking` | `getAuthedEmployee(req)` | JSON `{ bank_name, institution_number, transit_number, account_number }` | `{ ok: true }` | `account_number` required; encrypted at rest. |
| POST | `/api/employee/onboard/complete` | `getAuthedEmployee(req)` | JSON `{ license_data? }` | `{ ok: true, completed_at, status: 'pending_verification' }` | Verifies all onboarding steps done. |
| GET | `/api/employee/onboard/complete` | `getAuthedEmployee(req)` | None | `{ employee: {...}, onboarding: { contract_signed, td1_federal, td1_ab, acknowledgments, completed, documents: {...} } }` | Onboarding status. |
| POST | `/api/employee/onboard/contract` | `getAuthedEmployee(req)` | JSON `{ signature_typed, contract_version, contract_text_hash }` | `{ ok: true, signed_at }` | `signature_typed` required. |
| GET | `/api/employee/onboard/contract` | `getAuthedEmployee(req)` | None | `{ signed, signed_at, data }` | Contract status. |
| GET | `/api/employee/onboard/invite` | None | `?token` (required) | `{ invite: {...} }` | Pre-auth; validates invite. |
| POST | `/api/employee/onboard/invite` | None | JSON `{ token, password, phone, address }` | `{ employee: { id, email, name, status } }` + `Set-Cookie` | Password min 8 chars, 1 number, 1 special char; auto-login. |
| POST | `/api/employee/onboard/td1` | `getAuthedEmployee(req)` | JSON `{ form_type: 'federal' | 'ab', data }` | `{ ok: true }` | Saves TD1 data. |
| GET | `/api/employee/onboard/td1` | `getAuthedEmployee(req)` | None | `{ federal: {...}, ab: {...} }` | Retrieve TD1 data. |
| GET | `/api/employee/pay-stubs` | `getAuthedEmployee(req)` | None | `{ pay_stubs: [{ id, pay_run_id, created_at, regular_hours, overtime_hours, total_hours, regular_pay, overtime_pay, gross_pay, vacation_pay, cpp, cpp2, ei, fed_tax, total_deductions, net_pay, ytd_gross, ytd_cpp, ytd_cpp2, ytd_ei, ytd_vacation, direct_deposit_status, direct_deposit_sent_at }] }` | Last 52 pay stubs. |
| POST | `/api/employee/push-subscribe` | `getAuthedEmployee(req)` | JSON `{ endpoint, keys: { p256dh, auth } }` | `{ ok: true }` | **Web Push / VAPID** subscription. Flutter uses FCM, so this is not the right shape. `🚩 BACKEND` must add an FCM token endpoint. |
| DELETE | `/api/employee/push-subscribe` | `getAuthedEmployee(req)` | `?endpoint` (required) | `{ ok: true }` | Remove web push subscription. |
| POST | `/api/employee/receipts` | `getAuthedEmployee(req)` | JSON `{ assignment_id, receipt_type, vendor, amount_cad, receipt_photo_url, notes }` | `{ ok: true, receipt: {...} }` | `receipt_type` ∈ `uhaul, gas, dump, other`; `amount_cad` required. |
| GET | `/api/employee/receipts` | `getAuthedEmployee(req)` | `?assignment_id`, `?date` | `{ receipts: [...] }` | Filter receipts. |
| GET | `/api/employee/reset-password` | None | `?token` (required) | `{ ok: true, email, first_name }` | Validates reset token. |
| POST | `/api/employee/reset-password` | None | JSON `{ token, password }` | `{ ok: true, email }` | Password min 8 chars, 1 number, 1 special char. |
| GET | `/api/employee/schedule` | `getAuthedEmployee(req)` | `?date` (default today), `?weekly=true` | Weekly: `{ week: [{ date, dayName, dayNum, isToday, assignment, bookings }], startDate, endDate }`; Daily: `{ assignment, partner, bookings, open_sessions, completed_sessions, open_shift }` | Returns the crew assignment and bookings for the day or week. |
| POST | `/api/employee/selfie` | `getAuthedEmployee(req)` | Multipart `file` | `{ ok: true, selfie_url }` | Uploads to `crew-photos` bucket. |
| GET | `/api/employee/selfie` | None | `?booking_id` (required) | `{ crew: [{ first_name, selfie_url }] }` | Public endpoint for booking crew selfies. |
| GET | `/api/employee/shifts` | `getAuthedEmployee(req)` | None | `{ open_shift, recent: [...], period: { regular_hours, overtime_hours, total_hours, gross } }` | Open shift, recent 30 shifts, current month totals. |
| POST | `/api/employee/signature` | `getAuthedEmployee(req)` | JSON `{ booking_id, customer_name_typed, customer_signature_url, amount_confirmed, payment_method }` | `{ ok: true, signature: {...} }` | `booking_id`, `customer_name_typed`, `amount_confirmed` required; sets booking `status='completed'` and `payment_status='paid'` (note: `paid` is invalid per `bookings.payment_status` constraint; `🚩 BACKEND` should set `cash_crew` for cash and `paid_card` for card, `supabase/migrations/20260705_crew_app.sql:65-69`). |
| GET | `/api/employee/signature` | `getAuthedEmployee(req)` | `?booking_id` (required) | `{ signatures: [...] }` | Retrieve signatures. |
| POST | `/api/employee/signup` | None | JSON `{ name, email, phone, password, sin, address }` | `{ employee: { id, email, name, status } }` + `Set-Cookie` | Password min 8 chars; encrypts SIN; seeds docs. |
| POST | `/api/employee/storage-drop` | `getAuthedEmployee(req)` | JSON `{ assignment_id, facility_id, booking_id, item_photos, capacity_photo_url, capacity_estimate_pct }` | `{ ok: true, drop: {...} }` | `facility_id` required; updates storage facility usage. |
| GET | `/api/employee/storage-drop` | `getAuthedEmployee(req)` | None | `{ facilities: [{ id, name, address, lat, lng, access_code, capacity_sqft, current_usage_pct }] }` | Lists active storage facilities. |
| POST | `/api/employee/truck-check` | `getAuthedEmployee(req)` | JSON `{ assignment_id, check_type: 'pickup' | 'return', dashboard_photo_url, odometer_km, fuel_level, fuel_percent, truck_photos, damage_notes, gas_receipt_url, gas_amount_cad, gas_station }` | `{ ok: true, check: {...} }` | `assignment_id` and `check_type` required. |
| GET | `/api/employee/truck-check` | `getAuthedEmployee(req)` | `?assignment_id` (required) | `{ checks: [...] }` | List truck checks for assignment. |

### 1.3 Crew API contract (`app/api/crew/*`)

These routes still exist on `origin/main`, but they use the old `x-crew-pin` auth (`lib/crewAuth.js`). The live employee portal (`app/portal`) does **not** use these; it uses the `employee` routes above. The Flutter app should likely target the `employee` routes, but these are documented for reference and for any endpoints not yet migrated (e.g., `item-conditions`, `resend-payment-link`).

| Method | Path | Auth | Request Body / Query | Response Shape | Notes |
|---|---|---|---|---|---|
| POST | `/api/crew/arrived` | `crewAuth(req)` | JSON `{ booking_id }` | `{ ok: true }` | Sets `crew_status='arrived'`, sends SMS. |
| GET | `/api/crew/balance-payment/[booking_id]` | None | Path param `booking_id` | If paid `{ paid: true, payment_status, booking: {...} }`; if unpaid `{ paid: false, clientSecret, booking: {...} }` | Public; Stripe PaymentIntent for balance. |
| POST | `/api/crew/balance-payment/[booking_id]` | None | JSON `{ action: 'declare_cash' }` | `{ ok: true }` | Declares cash. |
| POST | `/api/crew/clock-off` | `crewAuth(req)` | None | `{ ok: true }` | Clears active booking on `crew_location`. |
| POST | `/api/crew/collect-payment` | `crewAuth(req)` | JSON `{ booking_id, method, amount }` | `{ ok: true }` | `method='cash_crew'` only; amount must match `balance_due`. |
| POST | `/api/crew/complete-job` | `crewAuth(req)` | JSON `{ booking_id }` | `{ ok: true, crew_status: 'awaiting_payment' | 'complete' }` | Requires ≥3 completion photos. |
| POST | `/api/crew/en-route` | `crewAuth(req)` | JSON `{ booking_id }` | `{ tracking_session_id }` | Generates tracking session; sends SMS. |
| POST | `/api/crew/item-conditions` | `crewAuth(req)` | JSON `{ booking_id, conditions: { "0": "good", "1": "damaged", "1_note": "...", ... } }` | `{ ok: true, summary }` | Merges conditions into `itemized_items`. |
| GET | `/api/crew/jobs` | `crewAuth(req)` | None | `{ jobs: [...], stats: { total_jobs, completed, remaining, expected_total, collected_total, collected_cash, collected_card } }` | Today's jobs in optimized order. |
| POST | `/api/crew/location` | `crewAuth(req)` | JSON `{ latitude, longitude, heading, speed_kmh, accuracy_meters, active_booking_id, tracking_session_id }` | `{ ok: true }` | `latitude`, `longitude`, `tracking_session_id` required. |
| GET | `/api/crew/nearby-opportunities` | `crewAuth(req)` | None | `{ opportunities: [...], truck_fill: {...} }` | Waitlist/future bookings/quoted leads within 3 km. |
| POST | `/api/crew/offer-nearby` | `crewAuth(req)` | JSON `{ booking_id?, waitlist_id?, lead_id?, distance_km?, original_price?, discounted_price?, discount_percent? }` | `{ offer_id }` | Creates offer; sends SMS. |
| GET | `/api/crew/photos/[booking_id]` | None | Path param `booking_id` | `{ photos: [{ url, type, taken_at, lat, lng }] }` | Public. |
| POST | `/api/crew/resend-payment-link` | `crewAuth(req)` | JSON `{ booking_id }` | `{ ok: true }` | SMS customer payment link. |
| GET | `/api/crew/route` | `crewAuth(req)` | `?from=lat,lng&to=booking_id` | `{ geometry, distance_meters, duration_seconds, eta_minutes, steps: [...], destination: {...} }` | Mapbox Directions route. |
| POST | `/api/crew/start-job` | `crewAuth(req)` | JSON `{ booking_id }` | `{ ok: true }` | Requires ≥3 arrival photos; sets `crew_status='in_progress'`. |
| GET | `/api/crew/track/[booking_id]` | None | Path param `booking_id` | `{ booking: {...}, crew_location: {...} }` | Public customer tracking. |
| POST | `/api/crew/upload-photo` | `crewAuth(req)` | Multipart `booking_id, type, lat, lng, taken_at, photo` | `{ url }` | `type` ∈ `arrival`, `completion`. 1-year signed URL. |
| POST | `/api/crew/verify-pin` | None | JSON `{ pin_hash }` | `{ ok: true }` | Verifies SHA-256 pin hash. |

### 1.4 Backend flags / dependencies

1. [ ] `🚩 BACKEND` — Decide native-auth contract. The current `employee` API uses `jh_employee_session` cookie. For a Flutter app, extend `lib/employeeAuth.js` `getAuthedEmployee` to also read `Authorization: Bearer <token>` and have `POST /api/employee/login` return the token in the response body. Do not start the final Dio client until this is final.
2. [ ] `🚩 BACKEND` — Push notifications: `POST /api/employee/push-subscribe` expects Web Push/VAPID keys. Flutter needs FCM. Add a new endpoint or column for FCM tokens (`fcm_token` in `employee_push_subscriptions` or a new `fcm_tokens` table) and an FCM sender in the backend.
3. [ ] `🚩 BACKEND` — Confirm Supabase Realtime is enabled on `crew_location`, `bookings`, `crew_assignments`, and `notifications` for the Flutter live map and schedule updates (Section 7.9). Define the exact channel and payload shape.
4. [ ] `🚩 BACKEND` — Add backend fields for the six new features (Section 6): `truck_fullness`, `fuel_level`/`fuel_percent`, `job_space_photos` table, weekly donation-run cron, and per-truck fuel profile. Route optimization should reuse the existing `lib/route.js` optimizer (Mapbox Optimization/Matrix/Haversine) rather than a new VROOM deployment unless it is proven insufficient.
5. [ ] `🚩 BACKEND` — Clarify route reconciliation. The live `/portal` app calls only `/api/employee/*` routes plus `/api/crew/item-conditions` and `/api/crew/resend-payment-link` (`app/portal/job/page.js`). The Flutter app should mirror this. All other `/api/crew/*` routes (`en-route`, `arrived`, `start-job`, `complete-job`, `upload-photo`, `verify-pin`, `clock-off`, `collect-payment`, `jobs`, `route`, `location`, etc.) are real but not used by the live employee portal.

### 1.5 Verify

1. [ ] `🧪 VERIFY` — Using `curl` or Postman, call `POST /api/employee/login` with valid email/password, capture the `jh_employee_session` cookie, and then call `GET /api/employee/me` and `GET /api/employee/schedule` with that cookie. Document the exact JSON shape.
2. [ ] `🧪 VERIFY` — Confirm Supabase Storage buckets `employee-documents` and `crew-photos` exist and are writable by the authenticated employee role.
3. [ ] `🧪 VERIFY` — For each `employee` route the Flutter app will use, run a `curl` that returns `200` and record the request/response in `lib/src/api/contracts/`.

**Phase 1 Exit Criteria:** The native-auth contract is documented, every `employee` route the Flutter app uses has a `curl`-verified contract, and all backend dependencies for Section 6 are ticketed.

---

## Phase 2 — Flutter Project Scaffolding

Goal: Create a clean, runnable Flutter project with the correct package skeleton and environment.

1. [ ] Create the Flutter project: `flutter create --org ca.junkhaul --project-name crew_app apps/crew_app` (or the chosen path).
2. [ ] Delete the default `lib/main.dart` counter app and `test/widget_test.dart`.
3. [ ] Set up folder structure:
   - `lib/main.dart`
   - `lib/src/app.dart`
   - `lib/src/router/router.dart` (go_router)
   - `lib/src/core/` (constants, theme, errors, utils, extensions)
   - `lib/src/data/` (api clients, repositories, supabase, offline queue)
   - `lib/src/domain/` (models, providers, services)
   - `lib/src/presentation/` (screens, widgets, features)
   - `lib/src/presentation/shared/` (buttons, cards, pills, sheets, etc.)
4. [ ] Configure `pubspec.yaml` with the exact package list from Section 2. Example skeleton:
   ```yaml
   dependencies:
     flutter:
       sdk: flutter
     flutter_riverpod: ^<version>
     go_router: ^<version>
     freezed_annotation: ^<version>
     json_annotation: ^<version>
     dio: ^<version>
     supabase_flutter: ^<version>
     mapbox_maps_flutter: ^<version>
     flutter_mapbox_animarker: ^<version>
     geolocator: ^<version>
     flutter_foreground_task: ^<version>
     flutter_compass: ^<version>
     sliding_up_panel2: ^<version>
     shimmer: ^<version>
     flutter_svg: ^<version>
     cached_network_image: ^<version>
     signature: ^<version>
     flutter_animate: ^<version>
     confetti: ^<version>
     google_fonts: ^<version>
     camera: ^<version>
     image: ^<version>
     google_mlkit_text_recognition: ^<version>
     flutter_doc_scanner: ^<version>
     firebase_messaging: ^<version>
     flutter_local_notifications: ^<version>
     connectivity_plus: ^<version>
     hive: ^<version>
     hive_flutter: ^<version>
     sentry_flutter: ^<version>
     permission_handler: ^<version>
     workmanager: ^<version>
     intl: ^<version>
     url_launcher: ^<version>
     package_info_plus: ^<version>
     flutter_secure_storage: ^<version>
     path_provider: ^<version>
   dev_dependencies:
     flutter_test:
       sdk: flutter
     flutter_lints: ^<version>
     build_runner: ^<version>
     freezed: ^<version>
     json_serializable: ^<version>
     hive_generator: ^<version>
     mockito: ^<version>
   ```
   *Pin every `^` version to a release published at least 7 days ago. Do not use `latest` or unbounded ranges.*
5. [ ] Run `flutter pub get` and commit `pubspec.lock`.
6. [ ] `🧪 VERIFY` — `flutter build apk` (debug) and `flutter build ios --no-codesign` (simulator) both succeed from the project root.

---

## Phase 3 — Design System & Shared Components

Goal: Build the exact visual system described in Section 1 and Section 4. No screen should be built before this phase is complete.

### 3.1 Theme / Colors / Typography

1. [ ] Create `lib/src/core/app_theme.dart` with a `ThemeData` that is hard-coded light.
2. [ ] Define exact colors as `Color` constants:
   - `accent` = `#F97316`
   - `accentDark` = `#EA580C`
   - `bgBase` = `#FAFAFA`
   - `bgCard` = `#FFFFFF`
   - `bgInput` = `#F2F2F2`
   - `textPrimary` = `#1A1A1A`
   - `textSecondary` = `#6B6B6B`
   - `textDisabled` = `#B0B0B0`
   - `statusGreen` = `#22C55E`
   - `statusAmber` = `#F59E0B`
   - `statusGray` = `#9CA3AF`
   - `statusRed` = `#EF4444`
   - `borderSubtle` = `#EAEAEA`
3. [ ] Apply `google_fonts` Inter to the whole theme:
   - `displayLarge` = 32sp, weight 800
   - `headlineSmall` = 22sp, weight 700
   - `titleMedium` = 17sp, weight 600
   - `bodyMedium` = 15sp, weight 400
   - `labelSmall` = 13sp, weight 500
4. [ ] Add `FontFeature.tabularFigures()` to any `TextStyle` that will display prices, odometer, timers, or ETA numbers.
5. [ ] Disable system dark mode: `themeMode: ThemeMode.light` in `MaterialApp` and verify the UI is white/orange on a device in dark mode.
6. [ ] `🧪 VERIFY` — Take screenshots of a simple theme preview screen showing every color token and text style. Compare hex values to the spec.

### 3.2 Shared UI Components

Build each component in its own file with an example in `lib/src/presentation/shared/`.

1. [ ] **JhPrimaryButton** — solid `accent` background, white text, 14px radius, 52px height, `ScaleTransition` to 0.96 on press, `HapticFeedback.mediumImpact()` on tap, disabled at 40% opacity.
2. [ ] **JhSecondaryButton** — transparent, 1.5px `borderSubtle` border, `textSecondary` text.
3. [ ] **JhCard** — 16px radius, `bgCard`, 1px `borderSubtle` border, `BoxShadow(blurRadius: 12, opacity: 0.04)`.
4. [ ] **JhStatusPill** — `Row` with 8px colored dot, label, pill background at 12% opacity of the status color, full-color text.
5. [ ] **JhSkeleton** — exact shape loaders using the `shimmer` package. Never use a bare `CircularProgressIndicator` in the center of an empty screen.
6. [ ] **JhErrorBanner** — retry button, never a dead end, consistent across all screens.
7. [ ] **JhBottomSheetHandle** — 36x4px, `borderSubtle`, centered, 8px from top.
8. [ ] **JhTextField** — `bgInput` background, no default underline, `textPrimary`, `textSecondary` label.
9. [ ] **JhListTile** — standard row height, leading icon, title, subtitle, trailing chevron.
10. [ ] **JhPhotoThumbnail** — `CachedNetworkImage` with placeholder and error fallback.

### 3.3 Motion / Animation Utilities

1. [ ] Create `lib/src/core/animations.dart` with:
   - `pageFadeTransition` (200-250ms)
   - `pageSharedAxisTransition` (200-250ms)
   - `stateTransitionDuration` = `Duration(milliseconds: 150)` with `Curves.easeOutCubic`
   - helper `animateColor()` and `animateContainer()` for status pills.
2. [ ] Wire `go_router` to use `CustomTransitionPage` with the shared/fade transitions for every route.
3. [ ] Configure `flutter_animate` defaults for consistent micro-animations.
4. [ ] `🧪 VERIFY` — Run the app and navigate between placeholder routes. Every transition must fade or shared-axis, never the default platform slide.

**Phase 3 Exit Criteria:** A theme preview screen exists showing every color, text style, button, card, status pill, and skeleton. Animations are smooth and match spec timing.

---

## Phase 4 — Core Architecture & Infrastructure

Goal: Build the backbone before any screen. This is the most critical phase for reliability.

### 4.1 Models (freezed + json_serializable)

1. [ ] Create `freezed` models for every API response:
   - `Booking`, `Customer`, `BookingStatus`, `PaymentStatus`, `CrewStatus`, `Job`, `DayStats`, `Stop`, `Route`, `RouteStep`, `CrewLocation`, `CrewPhoto`, `Document`, `Paystub`, `Notification`, `Incident`, `OfflineAction`, `FuelEstimate`, `TruckFullness`, `JobSpacePhotoPair`.
2. [ ] Generate `fromJson`/`toJson` with `build_runner`.
3. [ ] `🧪 VERIFY` — Serialize and deserialize a sample JSON for each model with `dart test`.

### 4.2 Networking (dio + auth + retry)

1. [ ] Create `DioClient` with:
   - Base URL pointing to the Next.js deployment (dev/staging/prod via `Flavor`/`--dart-define`).
   - Cookie jar that persists and sends the `jh_employee_session` cookie set by `POST /api/employee/login` and `POST /api/employee/signup` (`app/portal/page.js:31-37`, `app/api/employee/login/route.js`). If the backend is extended per Phase 1.4 to issue a bearer token, add an `Authorization: Bearer <token>` interceptor instead.
   - Interceptor that injects `Accept: application/json`.
   - Timeout 15s per request.
   - Custom retry interceptor: 3 attempts, exponential backoff for `DioExceptionType.connectionTimeout`, `sendTimeout`, `receiveTimeout`, `unknown` network errors. Do NOT retry 4xx.
2. [ ] Create typed exceptions: `NetworkException`, `ApiException`, `AuthException`, `ServerException`.
3. [ ] Create `ApiResult<T>` and `Result` to return `data` or `failure`.
4. [ ] `🧪 VERIFY` — Unit-test the retry interceptor by forcing 3 failures then 1 success. Confirm 4xx is not retried.

### 4.3 Supabase Client & Realtime

1. [ ] Initialize `supabase_flutter` in `main.dart` with URL, anon key, and auth options.
2. [ ] Configure `RealtimeClient` with reconnection logic and a global `onError` handler.
3. [ ] Create a `SupabaseRealtimeService` that manages channel subscriptions:
   - `crew_location` changes for live truck location (used in admin/customer tracking, not necessarily the crew app itself).
   - `bookings` changes for schedule updates.
   - `crew_route` or `notifications` channel for route changes and notifications.
4. [ ] `🧪 VERIFY` — Connect to a real Supabase Realtime channel and verify a payload received from the backend appears in the app.

### 4.4 Offline Queue (Hive + Workmanager)

1. [ ] Add `Hive` initialization (`Hive.initFlutter()` and register `OfflineAction` adapter).
2. [ ] Create `OfflineQueueService`:
   - `enqueue({ required String type, required Map<String, dynamic> payload, List<String>? filePaths, DateTime? createdAt })` returns an ID.
   - `pendingCount()` stream.
   - `flush()` processes queue in order, only removing on success.
   - `retry()` on app foreground and `workmanager` background task.
3. [ ] Create `connectivity_plus` provider `isOnlineProvider` that triggers `flush()` when online after being offline.
4. [ ] Create `Workmanager` registration and a `callbackDispatcher` that calls `OfflineQueueService.flush()`.
5. [ ] `🧪 VERIFY` — Toggle airplane mode mid-request, confirm the action is queued, then re-enable network and confirm the action is sent in order.

### 4.5 Secure Storage & Auth Token

1. [ ] Use `flutter_secure_storage` to save the session cookie or bearer token (not a PIN hash). Login is email/password only (`app/portal/page.js:17-37`).
2. [ ] Create `AuthRepository` that:
   - Stores the session on login.
   - Clears the session on logout.
   - Exposes an `authState` stream for the Dio interceptor / router guards.
3. [ ] `🧪 VERIFY` — Kill and reopen the app, confirm the session is restored and an authenticated request succeeds.

### 4.6 Sentry Crash Reporting

1. [ ] Initialize `SentryFlutter` in `main.dart` with DSN, environment, and release.
2. [ ] Capture every unhandled async exception and every non-4xx API failure as a Sentry breadcrumb.
3. [ ] Add `SentryNavigatorObserver` to `go_router` to log route changes.
4. [ ] `🧪 VERIFY` — Trigger a `throw` in a test screen and confirm it appears in the Sentry dashboard.

### 4.7 Error Boundaries

1. [ ] Wrap `MaterialApp` in a `ErrorWidget.builder` that shows the app error state instead of the red screen.
2. [ ] Create `AsyncErrorScreen` widget that handles `AsyncError` from every Riverpod provider with a retry button.
3. [ ] `🧪 VERIFY` — Force a provider error in a test screen and confirm the `AsyncErrorScreen` appears, not a red screen.

**Phase 4 Exit Criteria:** The app can be killed, reopened, and make an authenticated API call while offline. Sentry captures crashes. Realtime receives messages. No red screens.

---

## Phase 5 — Navigation & Route Guards

Goal: Implement all routes from Section 3.3 with deep-linking, permission guards, and auth redirects.

1. [ ] Define `GoRouter` in `lib/src/router/router.dart` with these routes:
   - `/splash`
   - `/login`
   - `/onboard` (with sub-routes for each onboarding step if desired)
   - `/verification`
   - `/permissions-gate` (parameterized by permission type)
   - `/schedule`
   - `/job/:bookingId`
   - `/job/:bookingId/truck-check`
   - `/clock`
   - `/documents`
   - `/paystubs`
   - `/notifications`
   - `/incidents`
   - `/reset-password`
2. [ ] Implement `redirect` logic:
   - Unauthenticated -> `/login`
   - Authenticated but onboarding incomplete -> `/onboard`
   - Authenticated but pending verification -> `/verification`
   - Location/camera denied -> `/permissions-gate`
3. [ ] Implement `Extra` parameters for job step so `/job/:bookingId?step=arrived` is supported.
4. [ ] Configure deep links for push notifications (FCM + `go_router` path parsing).
5. [ ] `🧪 VERIFY` — Test each redirect path with `GoRouter` `initialLocation` and confirm it lands on the correct guarded screen.

**Phase 5 Exit Criteria:** All routes are reachable and the correct guards prevent skipping permissions or auth.

---

## Phase 6 — Permissions & Permission Gate

Goal: Exact behavior from Section 5.

1. [ ] Create a reusable `PermissionGateScreen` that accepts a `Permission` enum (`location`, `camera`, `notification`) and shows:
   - Clear explanation text.
   - **Open Settings** button.
   - **Try Again** button.
   - Full-screen blocking UI.
2. [ ] Implement location permission flow using `geolocator`:
   - Request `locationWhenInUse` then `locationAlways`.
   - If denied, route to `/permissions-gate?type=location`.
3. [ ] Implement camera permission using `permission_handler`.
   - If denied, route to `/permissions-gate?type=camera`.
4. [ ] Implement notification permission using `firebase_messaging` + `permission_handler`.
   - **Notifications are non-blocking** (Section 5) — show a persistent banner on `/schedule` if denied, and a re-prompt in Settings.
5. [ ] Add Android `AndroidManifest.xml` permissions:
   - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`.
6. [ ] Add iOS `Info.plist` strings:
   - `NSLocationWhenInUseUsageDescription`
   - `NSLocationAlwaysAndWhenInUseUsageDescription`
   - `NSLocationAlwaysUsageDescription`
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription` (if uploading from gallery)
   - `NSMicrophoneUsageDescription` (camera plugin may require it)
7. [ ] `🧪 VERIFY` — Deny location on first launch, confirm you cannot reach `/schedule` and the `PermissionGateScreen` appears. Grant via OS settings and confirm the app resumes.

**Phase 6 Exit Criteria:** All three permissions are requested at the right time and enforced exactly as Section 5 describes.

---

## Phase 7 — Authentication, Login & Onboarding

Goal: Secure login, onboarding, and verification screens.

### 7.1 Login / Signup

Verified from `app/portal/page.js` on `origin/main`:

- The form state is `{ name, email, phone, password, sin, address }` (`app/portal/page.js:17`).
- Login mode posts to `/api/employee/login` with `{ email, password }` (`app/portal/page.js:31-37`).
- Signup mode posts to `/api/employee/signup` with the full form (`app/portal/page.js:31-37`).
- The login inputs are `Email` and `Password` (`app/portal/page.js:84,88`).
- On success, the PWA redirects to `/portal/verification` (pending), `/portal/onboard` (incomplete onboarding), or `/portal/schedule` (`app/portal/page.js:41-47`).

1. [ ] Build `LoginScreen` with **email + password** inputs. POST `{ email, password }` to `/api/employee/login` and persist the `jh_employee_session` cookie in `flutter_secure_storage` (or use a bearer token if the backend is extended per Phase 1.4).
2. [ ] Implement `authProvider` as Riverpod `AsyncNotifier` exposing `authState`: `unauthenticated`, `loading`, `authenticated`, `needsVerification`, `needsOnboarding`.
3. [ ] `🧪 VERIFY` — Wrong password returns an error; correct credentials route to `/schedule` or `/onboard`.

### 7.2 Onboarding (8 Steps, Resumable)

Verified from `app/portal/onboard/page.js` on `origin/main`:

- `STEP_LABELS` is exactly: `Account`, `Documents`, `TD1 Federal`, `TD1AB Alberta`, `Contract`, `Banking`, `Acknowledgments`, `Complete` (`app/portal/onboard/page.js:20-29`).
- The comment confirms the sequence: account → documents → TD1 Federal → TD1AB → contract e-sign → banking → acknowledgments → complete (`app/portal/onboard/page.js:16-18`).
- Resume step is inferred from `/api/employee/me` fields (`onboarding_completed_at`, `pending_verification`, `onboarded`, `has_password`, document statuses, `td1_federal_done`, `td1_ab_done`, `contract_signed`, `has_banking`, `acknowledgments_done`) (`app/portal/onboard/page.js:114-136`).
- `onboarding_step` is persisted via `PUT /api/employee/me` (`app/portal/onboard/page.js:104-112`).

1. [ ] Implement the 8 onboarding steps in this exact order:
   - Step 1: Account (password, phone, address)
   - Step 2: Documents (SIN, driver’s license front/back, selfie)
   - Step 3: TD1 Federal
   - Step 4: TD1AB Alberta
   - Step 5: Contract e-sign
   - Step 6: Banking
   - Step 7: Acknowledgments
   - Step 8: Complete
2. [ ] Resume from the inferred step returned by `/api/employee/me`.
3. [ ] Implement `onboardingProvider` with `AsyncNotifier` and sub-routes `/onboard/step/1` ... `/onboard/step/8` (or use `pageController`).
4. [ ] `🧪 VERIFY` — Kill the app on step 4 and reopen; confirm it resumes on step 4.

### 7.3 Verification Pending

1. [ ] Build `VerificationPendingScreen` that polls or listens via Supabase Realtime for approval.
2. [ ] On approval, route to `/schedule`.
3. [ ] `🧪 VERIFY` — Simulate admin approval in Supabase and confirm the app navigates to `/schedule`.

**Phase 7 Exit Criteria:** A crew member can log in, complete or resume onboarding, and wait for verification, then reach the schedule screen.

---

## Phase 8 — Schedule / Home Screen (Map + Bottom Sheet)

Goal: The main screen with live map, truck marker, route, and draggable bottom sheet. This is the single source of truth for the route.

### 8.1 Mapbox Map

1. [ ] Create `MapBoxConfig` with `mapbox_maps_flutter` initialization, access token, and the custom Mapbox Studio style URL (Section 8). Until the style is ready, use `mapbox://styles/mapbox/streets-v12` as a placeholder.
2. [ ] Build `ScheduleMapScreen` with a full-screen `MapWidget`.
3. [ ] Add `onStyleLoaded` callback to add route line and markers.
4. [ ] Implement camera follow mode: follow truck, follow route, free pan.

### 8.2 Live Truck Marker

1. [ ] Add the three truck PNG assets (64/128/256) in `assets/truck/` and declare them in `pubspec.yaml`.
2. [ ] Build `TruckMarkerLayer` using `mapbox_maps_flutter` `PointAnnotation` or `SymbolLayer`.
3. [ ] Implement `AnimationController` that interpolates lat/lng and rotation between GPS updates over 2-4 seconds.
4. [ ] Account for baseline orientation: the source image faces right (0° = east), so rotation = `gps_heading - 90°` (or equivalent correction).
5. [ ] Use `flutter_compass` heading when GPS heading is `null` or near 0.
6. [ ] `🧪 VERIFY` — Move a mock location every 2 seconds; the truck marker glides, not jumps.

### 8.3 Route Line & Numbered Job Pins

Verified from `origin/main`:

- `app/api/employee/schedule/route.js` returns the daily assignment and `bookings` ordered by `job_time` (`app/api/employee/schedule/route.js:85-95`). It does **not** include route geometry.
- `app/api/crew/route/route.js` exists and returns Mapbox Directions geometry for a single leg (`app/api/crew/route/route.js:9-64`), but it uses `crewAuth` (`x-crew-pin`) and is **not** called by the live `/portal` app.
- `lib/route.js` contains a three-tier optimizer (Mapbox Optimization API → Mapbox Matrix API → Haversine nearest-neighbour) seeded from the U-Haul depot (`lib/route.js:31-152`). It is already imported by `app/api/crew/jobs/route.js:3` to order jobs.
- The live PWA uses `https://maps.google.com/?q=...` to launch directions (`app/portal/job/page.js:337`) and does not draw a Mapbox route line.

1. [ ] Use `GET /api/employee/schedule` for the list and initial stop order. Do **not** call `GET /api/crew/route` (it uses `crewAuth` and is not used by the live PWA). For route geometry, use an employee-side equivalent:
   - **Primary:** Call the Mapbox Directions API directly from Flutter with the public `NEXT_PUBLIC_MAPBOX_TOKEN` (the same token the live PWA already exposes at `app/portal/schedule/page.js:20`).
   - **Fallback:** If the token must be hidden, `🚩 BACKEND` add a new `GET /api/employee/route` that wraps the same Mapbox Directions call from `app/api/crew/route/route.js`.
2. [ ] Draw the route as a `LineAnnotation` with `accent` color (#F97316) and appropriate width.
3. [ ] Add numbered circular markers for each stop: `accent` orange fill, white number.
4. [ ] Re-order markers when the backend pushes a new route sequence via Supabase Realtime.
5. [ ] `🧪 VERIFY` — Change the route on the backend and confirm the map updates automatically with a notification.

### 8.4 Draggable Bottom Sheet

1. [ ] Implement `ScheduleBottomSheet` with `sliding_up_panel2` (or `DraggableScrollableSheet` with `snap: true` and velocity detection).
2. [ ] Three snap states:
   - Collapsed: drag handle + ETA pill only.
   - Half: assignment card + first 2-3 jobs.
   - Full: entire list + weekly toggle.
3. [ ] Implement velocity-based snapping: a fast downward flick collapses regardless of position.
4. [ ] Build `JobListItem` card with status pill, customer name, address, time window.
5. [ ] `🧪 VERIFY` — Fling the sheet up and down; it snaps to the correct state and the map resizes.

### 8.5 Day Stats & Weekly Toggle

1. [ ] Display `DayStats` computed from the `bookings` array returned by `GET /api/employee/schedule` (e.g., total, completed, remaining, cash/card collected). The `stats` object in `app/api/crew/jobs/route.js:44-66` is the reference shape if the backend extends `GET /api/employee/schedule` to include it. Do **not** call `GET /api/crew/jobs` from the Flutter app.
2. [ ] Build weekly toggle (today + future days) that calls `GET /api/employee/schedule` with a `date` parameter.
3. [ ] `🧪 VERIFY` — Switch to a different day and confirm the job list reloads with the correct skeleton.

**Phase 8 Exit Criteria:** The `/schedule` screen shows a live map, a gliding truck marker, an orange route, numbered pins, and a bottom sheet with correct snap states. Realtime route updates work.

---

## Phase 9 — Job Execution Flow

Goal: The full job flow, including the new capture steps from Section 6.

Verified from `app/portal/job/page.js` on `origin/main`:

- The job stepper is defined in `STEPS` as: `En Route` → `Arrived` → `Payment` → `Load Truck` → `Route` → `Drop Flow` → `Signature` (`app/portal/job/page.js:12-20`).
- The live PWA calls `/api/employee/job-clock` with `action: 'in'` from the En Route step (`app/portal/job/page.js:185-200`), `/api/crew/item-conditions` from the Arrived step (`app/portal/job/page.js:202-224`), and `/api/crew/resend-payment-link` from the Payment step (`app/portal/job/page.js:627-629`). The final Signature step calls `/api/employee/signature` (`app/portal/job/page.js:257-280`). The Load/Route/Drop steps in the PWA do not call `start-job`, `complete-job`, `upload-photo`, or `clock-off`.
- Payment method UI shows only two buttons: **Card** and **Cash** (`app/portal/job/page.js:607-622`).
- `app/api/crew/collect-payment/route.js` explicitly rejects `method !== 'cash_crew'` and returns an error: "This route only handles cash_crew. Digital payments go through /pay/[booking_id]." (`app/api/crew/collect-payment/route.js:29-33`).
- The `bookings.payment_status` check constraint is: `unpaid, paid_card, paid_apple_pay, paid_google_pay, cash_declared, cash_crew` (`supabase/migrations/20260705_crew_app.sql:65-69`).

### 9.1 Job Detail / Start Flow

1. [ ] Build `JobScreen` parameterized by `bookingId` and `step` query.
2. [ ] Create `jobProvider` that fetches `Booking` by ID and refreshes from Realtime.
3. [ ] Implement action buttons for the verified step order: **En Route**, **Arrived**, **Payment**, **Load Truck**, **Route**, **Drop Flow**, **Signature**.
4. [ ] Each primary action calls `HapticFeedback.mediumImpact()`.

### 9.2 Step 1 — Arrived (includes Item Conditions)

Item conditions are not a separate step; they are folded into the Arrived screen.

1. [ ] Build `ArrivedStep` with the item list and condition buttons for each item: **Good**, **Damaged**, **Missing** (mirroring `app/portal/job/page.js:537-562`).
2. [ ] If an item is damaged, allow a text note (`app/portal/job/page.js:562-578`).
3. [ ] On **Confirm & Continue**, POST the conditions to `/api/crew/item-conditions` as `{ booking_id, conditions: { "0": "good", "1": "damaged", "1_note": "...", ... } }` (`app/portal/job/page.js:207-220`). This is one of the two `crew` endpoints the live app uses.
4. [ ] Capture GPS metadata at the moment of the action.

### 9.3 Step 2 — Before/After Photos of Customer Space (Section 6.6)

Verified from `JUNK_HAUL_FLUTTER_CREW_APP_DEV_SPEC.md` Section 6.6: the screen is inserted between Arrived and Payment, but the `After` capture is taken at the very end of the job, right before Signature.

1. [ ] Add a `BeforeAfterStep` screen after `Arrived` and before `Payment`.
2. [ ] **Before** photo: capture the space where junk currently sits before removal.
3. [ ] **After** photo: capture the same space at the very end of the job, immediately before the Signature step.
4. [ ] Store both as a linked pair in `job_space_photos` (`before_photo_url`, `after_photo_url`, `booking_id`).
5. [ ] `🚩 BACKEND` — Create `job_space_photos` table/columns.
6. [ ] Show side-by-side before/after thumbnails once both are captured, with a subtle animation.
7. [ ] `🧪 VERIFY` — Capture before and after, confirm the pair is saved and linked to the booking.

### 9.4 Step 3 — Payment

Payment is **cash in-app** or **card via SMS Stripe link only**. No Apple Pay, no Google Pay, no native Stripe SDK, no tap-to-pay.

1. [ ] Build `PaymentStep` showing balance due and two large buttons: **Card** and **Cash** (`app/portal/job/page.js:607-622`).
2. [ ] **Card**: call `POST /api/crew/resend-payment-link` with `{ booking_id }`. The backend sends the customer an SMS with `https://junkhaul.ca/pay/${booking_id}` (`app/portal/job/page.js:627-629`, `app/api/crew/resend-payment-link/route.js:8-46`). The customer completes the Stripe payment on their own device. Do **not** integrate Stripe in the Flutter app.
3. [ ] **Cash**: record the cash collection. The live PWA passes `payment_method: 'cash'` to `POST /api/employee/signature` (`app/portal/job/page.js:257-280`). `🚩 BACKEND` — `app/api/employee/signature/route.js` currently sets `payment_status: 'paid'` for both cash and card, which is invalid per the `bookings.payment_status` constraint (`supabase/migrations/20260705_crew_app.sql:65-69`). It should set `payment_status: 'cash_crew'` for cash and enforce `amount_confirmed == balance_due` (matching `app/api/crew/collect-payment/route.js:47-52`).
4. [ ] `🧪 VERIFY` — Cash: confirm the booking updates to `cash_crew` and `status = completed`. Card: confirm the SMS link is sent and the Stripe webhook later updates `payment_status` to `paid_card`.

### 9.5 Step 4 — Load Truck

1. [ ] Build `LoadTruckStep` with a checklist of `itemized_items` as shown in the PWA (`app/portal/job/page.js:637-679`).
2. [ ] The crew checks each item as it is loaded.
3. [ ] Attach GPS coordinates and timestamp to the "Load Confirmed" action.
4. [ ] `🚩 BACKEND` — The live PWA does not upload load photos. If the Flutter app must capture load photos, add an `employee` job-photo upload endpoint (do not use `POST /api/crew/upload-photo` per the route mixing rule).

### 9.6 Step 5 — Truck Fullness Check (Section 6.4)

Verified from `JUNK_HAUL_FLUTTER_CREW_APP_DEV_SPEC.md` Section 6.4: new capture step added after "Load Truck".

1. [ ] Add a `TruckFullnessStep` after `LoadTruck`.
2. [ ] Capture a single photo of the truck's load bed.
3. [ ] Show a row of 5 options: Empty / ¼ / ½ / ¾ / Full.
4. [ ] Upload the photo and the selected fullness to the backend.
5. [ ] `🚩 BACKEND` — Add `truck_fullness` field to `bookings` or a crew flow table.
6. [ ] If fullness ≥ 75% (configurable), the next **Route Decision** step defaults to **Landfill run recommended** with a visible reason ("Truck is over 75% full").
7. [ ] `🧪 VERIFY` — Select ¾ and confirm the route decision defaults to landfill.

### 9.7 Step 6 — Route Decision / Landfill

1. [ ] Build `RouteDecisionStep`:
   - Default recommendation: **Continue to next job**.
   - If fullness threshold is met: **Landfill run recommended**.
2. [ ] If landfill is selected, call `GET /api/employee/landfill` (with `?lat` and `?lng`) to get the nearest open landfill and navigate to it (`app/api/employee/landfill/route.js`).
3. [ ] Use `url_launcher` to open directions if needed.

### 9.8 Step 7 — Drop Flow

1. [ ] Build `DropFlowStep` mirroring the PWA (`app/portal/job/page.js:726-762`):
   - Select a storage facility from the list returned by `GET /api/employee/storage-drop`.
   - Capture item photos and capacity photo.
   - POST to `/api/employee/storage-drop` with `{ assignment_id, facility_id, booking_id, item_photos, capacity_photo_url, capacity_estimate_pct }` (`app/portal/job/page.js:233-252`, `app/api/employee/storage-drop/route.js`).

### 9.9 Step 8 — Signature

1. [ ] Use `signature` package to build a full-screen signature canvas.
2. [ ] Require the customer to type their name and (optionally) sign (`app/portal/job/page.js:257-280`).
3. [ ] POST to `/api/employee/signature` with `{ booking_id, customer_name_typed, customer_signature_url, amount_confirmed, payment_method }` (`app/portal/job/page.js:263-272`, `app/api/employee/signature/route.js:8-48`).
4. [ ] `🧪 VERIFY` — Complete a job and confirm the booking status becomes `completed`.

### 9.10 Issue Flag Overlay

1. [ ] Add a **Report Issue** button accessible from every job step.
2. [ ] Build `ReportIssueSheet` with issue type and photo upload.
3. [ ] POST to `/api/employee/issues` with `{ booking_id, issue_type, severity, description, photo_url }` (`app/api/employee/issues/route.js`).

**Route-mixing rule (verified from `app/portal/job/page.js`):** The Flutter app should call `/api/employee/*` for almost everything. The only two `/api/crew/*` endpoints it should call are `/api/crew/item-conditions` and `/api/crew/resend-payment-link`. Do not call `/api/crew/en-route`, `/api/crew/arrived`, `/api/crew/start-job`, `/api/crew/complete-job`, `/api/crew/upload-photo`, `/api/crew/verify-pin`, or `/api/crew/collect-payment` unless the backend and auth model explicitly change to use them.

**Phase 9 Exit Criteria:** A complete job can be started, item conditions confirmed, before/after photos captured, payment collected (cash or card link), load and fullness recorded, route/drop decisions made, signature captured, and the job completed without crashes.

---

## Phase 10 — Truck Check (Pickup / Return)

Goal: Truck condition, fuel, and odometer capture.

1. [ ] Build `TruckCheckScreen` at `/job/:bookingId/truck-check`.
2. [ ] Implement fuel-level selector (Empty / ¼ / ½ / ¾ / Full).
3. [ ] `🚩 BACKEND` — Add per-truck fuel profile (tank capacity, fuel type, economy) and store fuel level for the day.
4. [ ] Capture odometer photo with `google_mlkit_text_recognition` for optional reading.
5. [ ] Capture truck walkaround photos.
6. [ ] `🧪 VERIFY` — Capture fuel level and odometer, confirm the backend persists it and projected fuel stops are visible on `/schedule`.

---

## Phase 11 — The Six New Features (Section 6)

These are not separate screens; they are capabilities integrated into the flows above. This section ensures each is completed and verified.

### 11.1 Real Multi-Stop Route Optimization (6.1)

1. [ ] `🚩 BACKEND` — Reuse the existing `optimiseRoute` in `lib/route.js` (Mapbox Optimization API → Matrix API → Haversine fallback, seeded from the U-Haul depot at 2615 12 St NE Calgary) (`lib/route.js:31-152`); wire it into `GET /api/employee/schedule` or a new `GET /api/employee/optimized-jobs` endpoint. Do **not** deploy a new VROOM service until the existing optimizer is proven insufficient.
2. [ ] Flutter app **never computes** the route. It listens to Supabase Realtime for the updated sequence and redraws pins/routes.
3. [ ] Job pins always reflect the optimized sequence order.
4. [ ] `🧪 VERIFY` — Add a new booking in the admin dashboard and confirm the app reorders pins automatically.

### 11.2 Traffic-Aware Rerouting (6.2)

1. [ ] `🚩 BACKEND` — Add a traffic-aware route endpoint (or extend `/api/crew/route`) that accepts live traffic parameter and returns a threshold comparison.
2. [ ] In the app, set a 3-5 minute timer while a job is in progress to re-request the route.
3. [ ] If the new route saves > 3 minutes, update the displayed route and show a non-blocking banner: **“Faster route found — updated automatically.”**
4. [ ] Keep existing 120m off-route detection in place.
5. [ ] `🧪 VERIFY` — Simulate a faster route from the backend and confirm the banner appears and the route updates.

### 11.3 Fuel Math / Predicted Gas Stop (6.3)

1. [ ] `🚩 BACKEND` — Add per-truck fuel profile and compute projected fuel at each stop using the existing `lib/route.js` optimized route distance and `gas-price` endpoint. Do not introduce a new VROOM deployment unless `lib/route.js` is proven insufficient.
2. [ ] If fuel < ¼ tank before the day is done, the backend inserts a **Fuel Stop** into the optimized route.
3. [ ] The app displays the Fuel Stop as a numbered stop with a gas-station icon.
4. [ ] `🧪 VERIFY` — With a low fuel scenario, confirm a fuel stop appears in the route list.

### 11.4 Truck Fullness Check (6.4)

Covered in Phase 9.5. Re-verify:
1. [ ] `🧪 VERIFY` — Photo upload + fullness selection + landfill default works end-to-end.

### 11.5 Weekly Recurring Donation-Drop Job (6.5)

1. [ ] `🚩 BACKEND` — Create a weekly cron that generates a donation-run booking from accumulated storage items.
2. [ ] The app treats it as a normal job card with customer name **“Donation Center Run”**.
3. [ ] On arrival, reuse the existing photo capture flow for donation items.
4. [ ] `🧪 VERIFY` — Seed a donation-run job and confirm it appears in the schedule and the job flow works.

### 11.6 Before/After Photos (6.6)

Covered in Phase 9.3. Re-verify:
1. [ ] `🧪 VERIFY` — Before/after pair linked to `booking_id` and visible side-by-side.

---

## Phase 12 — Camera, OCR, Document Scanner & Photo Uploads

Goal: Robust, offline-safe photo capture.

1. [ ] Initialize `camera` package and select/initialize the correct camera lens.
2. [ ] Build a reusable `CameraCaptureScreen` with:
   - Fixed aspect ratio / overlay for document vs job-photo modes.
   - Capture button with `HapticFeedback.mediumImpact()`.
   - Retake / Confirm flow.
   - GPS metadata injection.
3. [ ] Compress every captured image with the `image` package before upload:
   - Max dimension 1280px.
   - JPEG quality 80%.
   - Preserve EXIF/GPS metadata where possible.
4. [ ] Upload job/space photos via an `employee` endpoint (`/api/employee/storage-drop` or a new `/api/employee/upload-job-photo`) or queue in Hive if offline. Do not call `POST /api/crew/upload-photo` per the route-mixing rule.
5. [ ] Implement `flutter_doc_scanner` (or `edge_detection`) for document capture with auto-crop.
6. [ ] Implement `google_mlkit_text_recognition` for driver’s license fields:
   - DOB
   - License number
   - Expiry
   - Province
7. [ ] `🧪 VERIFY` — Capture a photo, turn on airplane mode, confirm the upload queues, then goes through on reconnection.
8. [ ] `🧪 VERIFY` — Scan a driver’s license and confirm the OCR extracts the 4 fields.

---

## Phase 13 — Notifications, Background & Real-Time Sync

Goal: Push and foreground notifications, background location, and sync.

1. [ ] Set up Firebase project for the app and add `google-services.json` / `GoogleService-Info.plist`.
2. [ ] Configure `firebase_messaging`:
   - Token registration on login.
   - Send token to backend (or Supabase `fcm_tokens` table).
   - `🚩 BACKEND` — Add FCM sender alongside existing Web Push/VAPID sender.
3. [ ] Configure `flutter_local_notifications` to show banners when the app is foregrounded.
4. [ ] Build a notification routing service that maps FCM data payload to `go_router` deep links.
5. [ ] Implement background geolocation with `geolocator` + `flutter_foreground_task` (free) instead of `flutter_background_geolocation` (paid license, ~$250–500/app per earlier research):
   - Start a foreground service on login / start of shift.
   - Stop the service on `clock-off` / `clock-out`.
   - Post GPS updates to `POST /api/employee/location` (`app/portal/schedule/page.js:161-170`).
   - Configure iOS `location` background mode and Android foreground service + `WAKE_LOCK`.
6. [ ] Implement `connectivity_plus` global listener and show a non-alarming “X items waiting to sync” badge.
7. [ ] `🧪 VERIFY` — Send a test FCM notification and confirm it opens the correct job screen. Test background location by moving the device and checking the backend `crew_location` table.

---

## Phase 14 — Secondary Screens

Goal: All non-core screens in Section 3.4.

1. [ ] `ClockScreen` — read-only current shift status from `GET /api/employee/shifts`, call `POST /api/employee/clock-in` or `POST /api/employee/clock-out` (`app/api/employee/clock-in/route.js`, `app/api/employee/clock-out/route.js`). Do not call `POST /api/crew/clock-off` per the route-mixing rule.
2. [ ] `DocumentsScreen` — list crew documents, upload new ones, integrate `flutter_doc_scanner`.
3. [ ] `PaystubsScreen` — list paystubs with `intl` currency formatting.
4. [ ] `NotificationsScreen` — notification history, mark read.
5. [ ] `IncidentsScreen` — list and submit incidents, photo attachments.
6. [ ] `SettingsScreen` — app version, logout, support contact, re-prompt notification permission.
7. [ ] `ResetPasswordScreen` — integrate `/api/employee/reset-password`.
8. [ ] `🧪 VERIFY` — Every secondary screen loads data, shows skeleton, handles errors, and never crashes on pull-to-refresh.

---

## Phase 15 — EOD Celebration & Premium Polish

Goal: The “delight” details.

1. [ ] Build `EndOfDayScreen` with confetti animation using `confetti`.
2. [ ] Show day stats (jobs, cash collected, card collected, total).
3. [ ] Trigger `EndOfDayScreen` after the last job is completed or after `clock-out` (`POST /api/employee/clock-out`).
4. [ ] `🧪 VERIFY` — Complete the last job of the day and confirm the confetti screen appears.

---

## Phase 16 — Reliability & Crash Prevention (Section 9)

Goal: Make the app bulletproof before release.

1. [ ] Ensure every screen has a `try/catch` or error boundary and an `AsyncError` fallback.
2. [ ] Ensure no `setState` on disposed widgets, no `NullPointerException` equivalent in Dart, no unawaited async calls.
3. [ ] Verify `dio` retry (Section 9.2) does not retry 4xx.
4. [ ] Verify `sentry_flutter` is configured with proper environment and release tags.
5. [ ] Verify offline queue works for all write actions: photo upload, form submission, signature, truck check, payment, incident, route decision.
6. [ ] Add an “X items waiting to sync” badge on `ScheduleScreen` and `SettingsScreen`.
7. [ ] Test `workmanager` background flush on Android and iOS.
8. [ ] `🧪 VERIFY` — Run the full crash-resilience test matrix:
   - Airplane mode toggled mid-flow.
   - Camera permission denied mid-flow.
   - App killed and reopened mid-onboarding.
   - Full job completed 10 times in a row without crashes.

---

## Phase 17 — Testing, QA & Hardening

Goal: Confirm spec compliance and no regressions.

1. [ ] Unit tests for `dio` retry, `OfflineQueueService`, `AuthRepository`, `RouteRepository`, models, `freezed` serialization.
2. [ ] Widget tests for shared components (buttons, cards, bottom sheet, status pills).
3. [ ] Integration test that completes a full job: login -> schedule -> en route -> arrived -> before photo -> payment -> after photo -> signature -> complete.
4. [ ] Manual QA on a physical Android and iOS device.
5. [ ] Verify no dark mode leaks (force OS dark mode, check every screen).
6. [ ] Verify all colors/typography match the spec tokens.
7. [ ] Verify every primary action has haptic feedback.
8. [ ] Verify animations are 150-250ms with `easeOutCubic`.
9. [ ] `🧪 VERIFY` — Run `flutter test` and `flutter analyze` with zero warnings/errors.

---

## Phase 18 — Deployment & Store Submission

Goal: Release the app.

1. [ ] Set up flavors: `dev`, `staging`, `prod` with `--dart-define` for API URLs and Sentry DSN.
2. [ ] Configure Android signing (`key.properties` + `release.keystore`).
3. [ ] Configure iOS signing, provisioning profiles, and App Store Connect.
4. [ ] Build release APK and App Bundle.
5. [ ] Build iOS release archive.
6. [ ] Configure CI/CD (GitHub Actions) to run `flutter analyze`, `flutter test`, and build both platforms on every PR.
7. [ ] Submit to Google Play Console and App Store Connect.
8. [ ] Set up TestFlight and Google Play Internal Testing.
9. [ ] `🧪 VERIFY` — Install release builds on physical devices, complete a full job, and confirm no crash / no Sentry error.

---

## Appendix A — Backend Change Flags Summary (Section 7)

Track these in a separate backend ticket board.

- [ ] 1. Native auth contract: `POST /api/employee/login` sets `jh_employee_session` cookie; optionally extend `lib/employeeAuth.js` to also accept `Authorization: Bearer <token>` for the Flutter app.
- [ ] 2. FCM push sender alongside existing Web Push/VAPID sender.
- [ ] 3. Route optimization: reuse existing `lib/route.js` (Mapbox Optimization API → Matrix API → Haversine fallback, seeded from U-Haul depot) rather than deploying a new VROOM service.
- [ ] 4. Traffic-aware reroute threshold logic + endpoint.
- [ ] 5. Per-truck fuel profile data (tank capacity, fuel type, economy).
- [ ] 6. Truck fullness field additions to job-flow tables.
- [ ] 7. Weekly cron job for donation-run auto-creation.
- [ ] 8. `job_space_photos` table or equivalent.
- [ ] 9. Supabase Realtime channel setup for schedule/route/notification updates.
- [ ] 10. Verify `employee` endpoints for documents, pay-stubs, notifications, incidents, clock-in/out are accessible from the Flutter app (all confirmed in Phase 1.2).
- [ ] 11. `fcm_tokens` table or column for storing Flutter FCM tokens.
- [ ] 12. Fix `POST /api/employee/signature` so it sets `payment_status` to `cash_crew` for cash and `paid_card` for card, instead of invalid `paid` (`app/api/employee/signature/route.js:38-45` vs. `supabase/migrations/20260705_crew_app.sql:65-69`).

---

## Appendix B — Spec Compliance Checklist

Use this before handoff.

- [ ] No dark mode, ever — hard-coded light theme.
- [ ] Location, Camera, Notifications permissions handled exactly as Section 5.
- [ ] The app never crashes (Sentry, error boundaries, retry, offline queue).
- [ ] Offline is expected — every write action queues and retries.
- [ ] Live map is the single source of truth — route updates from backend automatically.
- [ ] All exact hex colors from Section 1.1 are used.
- [ ] Inter font via `google_fonts` with exact scale.
- [ ] Tabular figures for all numeric displays.
- [ ] Every transition 200-250ms; every state change 150ms `easeOutCubic`.
- [ ] Haptics on every meaningful action.
- [ ] Bottom sheet has three velocity-aware snap states.
- [ ] Truck marker glides between GPS pings, never jumps.
- [ ] Loading states use skeletons, not bare spinners.
- [ ] Six new features are built and verified.
- [ ] Testing matrix from Section 9.5 is passed.

---

## Appendix C — Risk & Issue Log

Keep this updated as blockers appear.

| # | Risk | Mitigation | Status |
|---|------|------------|--------|
| 1 | `flutter_background_geolocation` is a premium plugin | Use `geolocator` + `flutter_foreground_task` (free) instead of the paid `flutter_background_geolocation` plugin | Resolved |
| 2 | Mapbox custom Studio style not ready | Use `mapbox://styles/mapbox/streets-v12` with a brand-color route line as a fallback; swap in the custom URL later | Open |
| 3 | VROOM backend not deployed | Existing `lib/route.js` optimizer (Mapbox Optimization/Matrix/Haversine) already provides route ordering; no VROOM deployment needed until proven insufficient | Resolved |
| 4 | iOS Mapbox Navigation SDK not available via `mapbox_maps_flutter` | Use `mapbox_maps_flutter` for map + route line; open `url_launcher` for turn-by-turn until native SDK is integrated | Open |
| 5 | `flutter_doc_scanner` may not be stable on iOS | Spike both `flutter_doc_scanner` and `edge_detection`; pick the one that works | Open |
| 6 | `POST /api/employee/signature` sets `payment_status` to `paid` for both cash and card | Update `employee/signature` to set valid `payment_status` values (`cash_crew` for cash, `paid_card` for card) or use a separate `employee/collect-payment` endpoint for cash | Open |

---

*End of implementation plan. Mark each checkbox as you go. If anything in the spec is ambiguous, stop and ask — do not guess.*
