# Junk Haul Calgary — Crew App (Portal) Complete Documentation

This document describes the entire crew application (employee portal and its supporting admin infrastructure) as currently implemented. It covers the user-facing portal pages, the crew API routes, the authentication/security model, the database schema, the admin controls that affect crew, and the payroll/operations logic.

---

## 1. Entry Points / Public URLs

- `/portal` — login / signup
- `/portal/onboard?token=...` — onboarding from an admin invite
- `/portal/reset-password?token=...` — password reset from an admin link
- `/portal/schedule` — daily work dashboard
- `/portal/job?booking_id=...` — job execution flow
- `/portal/clock` — shift status
- `/portal/documents` — onboarding document status
- `/portal/paystubs` — pay stubs
- `/portal/notifications` — in-app notifications
- `/portal/incidents` — incident reporting
- `/portal/verification` — pending admin approval after onboarding

---

## 2. Authentication & Session

Authentication is cookie-based with a `jh_employee_session` cookie.

- Passwords are hashed with scrypt (`N=16384, r=8, p=1, keylen=64`).
- Sessions are stored in `employee_sessions` with a 30-day expiry.
- Sensitive fields (SIN, banking) are encrypted with AES-256-GCM.
- `getAuthedEmployee(req)` reads the cookie from every `/api/employee/*` request and validates it.
- Unauthenticated or unauthorized requests return `401`.

---

## 3. Portal Layout

**File:** `app/portal/layout.js`

- Mounts `useEffect` on every `/portal/*` route.
- Sets `data-theme="light"` on `document.documentElement`.
- Restores previous theme on unmount.
- This forces the entire crew portal to render in light mode, regardless of the phone's dark mode setting.

---

## 4. `/portal` — Login / Signup

**File:** `app/portal/page.js`

### Purpose
The entry point for crew members. Toggles between login and new-account signup.

### UI Elements
- Logo (104x104 px)
- Segmented toggle: "Log In" / "Sign Up"
- Login mode: Email + Password
- Signup mode: Full name, Email, Phone, Password, SIN (optional), Address autocomplete
- Submit button: "Log In" or "Create Account" (orange, disabled while loading)
- Error banner (red alert with AlertCircle)

### API Calls
- `POST /api/employee/login` — `{ email, password }`
- `POST /api/employee/signup` — `{ name, email, phone, password, sin, address }`

### State
- `mode`: `'login' | 'signup'`
- `loading`, `error`
- `form`: `{ name, email, phone, password, sin, address }`

### User Flow
1. On load, checks `localStorage` for `jh-onboard-token`. If present, redirects to `/portal/onboard?token=...`.
2. User fills form and submits.
3. On success:
   - `pending_verification` → `/portal/verification`
   - onboarding incomplete → `/portal/onboard`
   - otherwise → `/portal/schedule`

### Validation
- Password must be 8+ characters, contain 1 number, and 1 special character.

---

## 5. `/portal/onboard` — Onboarding Flow

**File:** `app/portal/onboard/page.js`

### Purpose
Multi-step employee onboarding. Entry is from an admin invite email. The flow resumps from the first incomplete step if the employee returns.

### Current Steps (8 steps)
1. **Account** — password, phone, address
2. **Documents** — SIN document, driver's license front, driver's license back, selfie
3. **TD1 Federal** — federal tax form
4. **TD1AB Alberta** — Alberta tax form
5. **Contract** — e-sign employment agreement
6. **Banking** — direct deposit info
7. **Acknowledgments** — policy checkboxes
8. **Complete** — final validation and submission

### Step 0
- Displays only a loading spinner (legacy install-gate removed).

### Step 1: Account Creation
- Invite info card (name, email, pay rate if provided)
- Password input with live checklist (8+ chars, 1 number, 1 special)
- Phone input
- Address autocomplete (Mapbox Geocoding)
- "Create account & continue" button

### Step 2: Documents
- DocumentScanner for SIN
- DocumentScanner for driver's license front
- DocumentScanner for driver's license back
- SelfieCapture
- "Continue" button

### Step 3: TD1 Federal
- Total income from other employers
- Spousal amount
- Number of dependents
- Other deductions
- Auto-calculated total claim (base $15,705)
- Optional override total claim

### Step 4: TD1AB Alberta
- Same fields as TD1 Federal with base amount $22,182

### Step 5: Contract E-Sign
- Scrollable contract text
- Typed signature input
- "I have read and agree" checkbox
- "Sign & continue" button

### Step 6: Banking
- Bank name
- Institution number (3 digits)
- Transit number (5 digits)
- Account number

### Step 7: Acknowledgments
Four checkboxes:
1. Traffic / parking tickets are the employee's responsibility.
2. Phone is required for the app and job communication.
3. Data usage is the employee's responsibility.
4. Company card usage is for job-related expenses only.

Button is disabled until all four are checked.

### Step 8: Complete
- Success checkmark
- "Complete onboarding" button
- List of missing items if validation fails
- On success, message says admin review is pending and redirects to `/portal/verification`

### API Calls
| Endpoint | Method | Body / Notes |
|----------|--------|--------------|
| `/api/employee/onboard/invite?token=...` | GET | Validates token |
| `/api/employee/me` | GET | Resume logic |
| `/api/employee/me` | PUT | `{ onboarding_step }` |
| `/api/employee/onboard/invite` | POST | `{ token, password, phone, address }` |
| `/api/employee/documents` | POST | FormData: `doc_type`, `file` |
| `/api/employee/selfie` | POST | FormData: `file` |
| `/api/employee/onboard/td1` | POST | `{ form_type, data }` |
| `/api/employee/onboard/contract` | POST | `{ signature_typed, contract_version }` |
| `/api/employee/onboard/banking` | POST | `{ bank_name, institution_number, transit_number, account_number }` |
| `/api/employee/onboard/acknowledgments` | POST | `{ tickets, phone, data, company_card }` |
| `/api/employee/onboard/complete` | POST | `{ license_data }` |
| Mapbox Geocoding API | external | Address autocomplete |

### Resume Logic
`inferResumeStep()` checks employee fields in this order:
1. Onboarding completed → step 8
2. No password → step 1
3. Missing required documents or selfie → step 2
4. `td1_federal_done` false → step 3
5. `td1_ab_done` false → step 4
6. `contract_signed` false → step 5
7. `has_banking` false → step 6
8. `acknowledgments_done` false → step 7
9. Otherwise step 8

### Save Progress
- `saveStep()` posts `onboarding_step` to `/api/employee/me` every time `step` changes.
- `onboarding_step` is never saved for step 0 or 1 before the account exists.

### Conditional Logic
- Password validation: 8+ chars, 1 number, 1 special character.
- Phone: 10+ digits after cleaning.
- Address: 5+ characters.
- Banking: institution 3 digits, transit 5 digits.
- All acknowledgments must be checked.
- All three documents and selfie must be uploaded to proceed from Step 2.

---

## 6. `/portal/verification` — Pending Admin Approval

**File:** `app/portal/verification/page.js`

### Purpose
Shown after onboarding is complete while the admin has not yet approved or rejected the employee.

### UI Elements
- Loading spinner (while checking status)
- Pending state: pulsing checkmark, "Onboarding Complete!", "Waiting for approval", message that the page checks every 10 seconds
- Rejected state: red X, "Not Approved", phone number link to call, "Back to Login" button

### API Calls
- `GET /api/employee/me` (polled every 10 seconds)

### User Flow
1. Page loads and polls `me` every 10 seconds.
2. If `status` becomes `active` or `onboarded` → auto-redirect to `/portal/schedule`.
3. If `status` becomes `rejected` → show rejected state.
4. If onboarding is incomplete → redirect to `/portal/onboard`.

---

## 7. `/portal/schedule` — Daily Work Dashboard

**File:** `app/portal/schedule/page.js`

### Purpose
Map-first dashboard showing the crew member's assigned jobs, route, navigation, and job actions.

### UI Elements

**Map (top section):**
- Mapbox street map
- Crew truck marker with heading rotation
- Job location markers (numbered)
- Orange route line
- ETA pill (next job name, ETA, distance)
- Navigation instruction card with turn instruction, current speed, speed limit, voice toggle, and support button
- Alternative route badges
- Floating glass header:
  - Crew name + status dot
  - Date
  - Offline indicator
  - Notification badge
  - Buttons: clock, documents, paystubs, incidents, logout

**Bottom Sheet (draggable):**
- Drag handle
- Today / Week toggle
- Weekly view: day cards with job counts
- Assignment card (pickup location, partner info, call button)
- Truck check section (pickup / return buttons)
- Job cards:
  - Number badge
  - Customer name
  - Status pill
  - Address
  - Price
  - Time slot + load size
  - Items list (expandable)
  - Notes (expandable)
  - Live timer for in-progress jobs
  - "Start Job" / "End Job" button
  - "View Details" button
- End-of-day celebration when all jobs are completed

**Location Permission Prompt:**
- Request location access
- iPhone / Android instructions

**Location Denied Screen:**
- Error message
- Settings instructions
- Try again / logout

### API Calls
| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/employee/me` | GET | Auth + onboarding check |
| `/api/employee/schedule` | GET | Daily data |
| `/api/employee/schedule?weekly=true` | GET | Weekly data |
| `/api/employee/notifications` | GET | Unread count (polled every 30s) |
| `/api/employee/location` | POST | `{ lat, lng, heading, speed }` every 30s |
| `/api/employee/job-clock` | POST | `{ booking_id, action: 'in'|'out' }` |
| `/api/employee/logout` | POST | Logout |
| Mapbox Directions API | external | Routing, ETA, speed limit, voice instructions |
| Mapbox Geocoding API | external | Job address coordinates |

### State
- `loading`, `emp`, `data`, `error`
- `busy`: booking_id currently loading
- `now`: current timestamp, updates every second
- `mapReady`, `crewPos`, `jobCoords`
- `routeInfo`: ETA, distance, instruction, speed_limit, maneuvers
- `locPerm`, `showLocPrompt`
- `liveSpeedKmh`, `liveHeading`, `voiceEnabled`, `alternatives`
- `sheetState`: `'collapsed' | 'half' | 'full'`
- `dragY`, `expandedItems`, `expandedNotes`, `showEOD`
- `unreadNotifs`, `showWeekly`, `weekData`, `isOnline`

### User Flow
1. Page loads, checks auth, onboarding, verification status.
2. Requests location permission.
3. Loads Mapbox map and starts GPS watch.
4. Fetches schedule and notifications.
5. Geocodes job addresses and places markers.
6. Draws route to next job.
7. User drags bottom sheet, toggles week/today, starts/ends jobs, views details.
8. Sends location every 30 seconds.
9. On all jobs completed, shows EOD celebration.

### Conditional Logic
- Location permission is required. Without it, the app cannot be used.
- Off-route detection: reroutes if more than 120m from route line for two consecutive checks.
- Voice guidance only speaks when the page is visible and voice is enabled.
- Start/End buttons depend on job status.

---

## 8. `/portal/job` — Job Execution Flow

**File:** `app/portal/job/page.js`

### Purpose
Step-by-step job workflow. Handles the full job lifecycle from en route to completion and truck return.

### Steps
0. **En Route** — item list, "Mark En Route" button
1. **Arrived** — load size, item condition verification (good / damaged / missing per item)
2. **Payment** — payment method (card / cash), amount confirmed, resend payment link
3. **Load Truck** — checklist of items being loaded
4. **Route Decision** — landfill recommendation, storage facility count
5. **Drop Flow** — storage facility selection, item photos, capacity photo, capacity estimate
6. **Signature** — customer name, signature canvas, amount confirmed, "Complete Job"
7. **EOD Truck Return Check** — dashboard photo, odometer, fuel level, gas receipt, dump receipt

### Shared Elements
- Progress bar
- Back button
- Flag issue button
- Booking card with customer name, address, time, price
- Error banner
- Sticky primary action button
- Confirmation overlay

### Issue Flag Overlay
- Issue type grid: Access, Damage, Safety, Customer, Vehicle, Other
- Severity selector: Low, Medium, High
- Description textarea
- "Report Issue" / Cancel

### API Calls
| Endpoint | Method | Body |
|----------|--------|------|
| `/api/employee/me` | GET | |
| `/api/employee/schedule` | GET | |
| `/api/employee/job-clock` | POST | `{ booking_id, assignment_id, action: 'in' }` |
| `/api/crew/item-conditions` | POST | `{ booking_id, conditions }` |
| `/api/crew/resend-payment-link` | POST | `{ booking_id }` |
| `/api/employee/landfill?lat=&lng=` | GET | |
| `/api/employee/storage-drop` | GET | |
| `/api/employee/storage-drop` | POST | `{ assignment_id, facility_id, booking_id, item_photos, capacity_photo_url, capacity_estimate_pct }` |
| `/api/employee/signature` | POST | `{ booking_id, customer_name_typed, customer_signature_url, amount_confirmed, payment_method }` |
| `/api/employee/truck-check` | POST | `{ assignment_id, check_type: 'return', dashboard_photo_url, odometer_km, fuel_level, gas_receipt_url, gas_amount_cad }` |
| `/api/employee/receipts` | POST | `{ assignment_id, receipt_type: 'dump', amount_cad, receipt_photo_url }` |
| `/api/employee/issues` | POST | `{ booking_id, issue_type, severity, description }` |
| `/api/employee/logout` | POST | |

### State
- `loading`, `emp`, `data`, `error`, `busy`, `confirmMsg`
- `stepIdx`: 0–7
- `gps`, `landfill`, `storageFacilities`, `selectedFacility`
- `itemPhotos`, `capacityPhoto`, `capacityPct`
- `paymentMethod`, `amountConfirmed`, `loadConfirmed`, `checkedItems`, `itemConditions`
- `custName`, `sigDataUrl`, `jobComplete`
- `showIssueForm`, `issueType`, `issueSeverity`, `issueDesc`, `issueSubmitting`
- `dashPhoto`, `odometer`, `fuelLevel`, `gasReceipt`, `gasAmount`, `dumpReceipt`, `dumpAmount`

### User Flow
1. Arrives from schedule page with `?booking_id=...`.
2. Loads employee and schedule data.
3. If `check=return` → goes to EOD step.
4. Steps through En Route → Arrived → Payment → Load Truck → Route Decision → Drop Flow → Signature.
5. EOD: truck return check.
6. Returns to schedule.

### Conditional Logic
- All items must have a condition selected before continuing from Arrived.
- Facility selection required for Drop Flow unless skipped.
- Customer name and amount required for Signature.
- Issue flag available on any step.

---

## 9. `/portal/clock` — Shift Status

**File:** `app/portal/clock/page.js`

### Purpose
Read-only display of current shift status and pay period summary. Clock in/out is automatic based on job activity.

### UI Elements
- Header: employee name, calendar → schedule, documents → documents, wallet → paystubs, logout
- Circular progress ring (orange when clocked in, gray when off)
- Status: "ON SHIFT" / "OFF SHIFT"
- Live timer: HH:MM:SS
- Pay period summary: regular hours, overtime hours, gross pay
- Note: "Clock in/out is automatic based on job activity"

### API Calls
- `GET /api/employee/shifts`
- `GET /api/employee/me`
- `POST /api/employee/logout`

### State
- `loading`, `emp`, `openShift`, `period`, `now`

### User Flow
1. Loads shift data.
2. Displays live status and timer.
3. Timer updates every second.
4. Navigation buttons to other portal pages.

---

## 10. `/portal/documents` — Document Viewing

**File:** `app/portal/documents/page.js`

### Purpose
View and re-upload onboarding documents. Shows status and expiry dates.

### UI Elements
- Header with back → schedule and logout
- Status banner: green if all received, yellow if missing
- Error banner
- Document cards per document type:
  - Type-specific icon
  - Name and expiry date
  - Status pill (verified / uploaded / rejected / pending)
  - Upload / Reupload button
  - Rejection reason (expandable)

### API Calls
- `GET /api/employee/me`
- `POST /api/employee/documents`
- `POST /api/employee/logout`

### State
- `loading`, `data`, `error`, `uploading`, `revealedReason`

### Conditional Logic
- Verified (green), Uploaded (yellow), Rejected (red), Pending (gray).
- Expiry colors: expired (red), <30 days (orange), valid (gray).
- Rejected docs show reupload button instead of upload.
- Rejection reason shown only when clicked.

---

## 11. `/portal/paystubs` — Pay Stub Viewing

**File:** `app/portal/paystubs/page.js`

### Purpose
Employee pay stub history with expandable breakdown.

### UI Elements
- Header: calendar → schedule, "Pay Stubs" title, logout
- Empty state with wallet icon
- Pay stub cards (collapsed): date, status, hours, net pay
- Expanded card:
  - Earnings: regular hours/pay, overtime hours/pay, vacation pay (4%), gross
  - Deductions: CPP, CPP2, EI, income tax
  - Net pay highlight (orange background)
  - YTD: gross, CPP, EI, tax

### API Calls
- `GET /api/employee/me`
- `GET /api/employee/pay-stubs`
- `POST /api/employee/logout`

### State
- `loading`, `stubs`, `expanded`

### Conditional Logic
- Status pills: Sent (green), Failed (red), Pending (yellow).
- CPP2 shown only if > 0.

---

## 12. `/portal/notifications` — Notifications

**File:** `app/portal/notifications/page.js`

### Purpose
In-app notification center for job assignments, updates, and broadcasts.

### UI Elements
- Header: back → schedule, "Notifications" title, unread count, "Mark all read" button
- Empty state with bell icon
- Notification list items:
  - Unread orange dot
  - Type icon (info, warning, success, assignment, broadcast)
  - Title, body, time ago
  - Chevron if link present

### API Calls
- `GET /api/employee/notifications`
- `POST /api/employee/notifications` — `{ id }` or `{ markAll: true }`

### State
- `notifications`, `unread`, `loading`

### User Flow
1. Loads notifications.
2. Tapping marks as read and navigates to link if present.
3. "Mark all read" clears unread count.

---

## 13. `/portal/incidents` — Incident Reporting

**File:** `app/portal/incidents/page.js`

### Purpose
Report and view safety/operational incidents.

### UI Elements
- Header: back → schedule, "Incidents" title, "Report" button
- Report form (overlay):
  - Type grid: Injury, Vehicle Accident, Property Damage, Near Miss, Safety Hazard, Other
  - Severity row: Low, Medium, High, Critical
  - Description textarea
  - Location, reported to (optional)
  - Cancel / Submit
- Success state
- History list with severity color strip, status pill

### API Calls
- `GET /api/employee/incidents`
- `POST /api/employee/incidents`

### State
- `incidents`, `loading`, `showForm`, `submitted`, `type`, `severity`, `description`, `location`, `reportedTo`, `submitting`, `error`

### Conditional Logic
- Severity colors: Low (green), Medium (orange), High/Critical (red).
- Status styles: Reported (yellow), Investigating (blue), Resolved (green).
- Form auto-closes 2 seconds after successful submit.

---

## 14. `/portal/reset-password` — Password Reset

**File:** `app/portal/reset-password/page.js`

### Purpose
Set a new password from an admin-generated reset link.

### UI Elements
- Loading spinner
- Valid state: password input with show/hide, "Set password" button
- Expired state: lock icon, instructions to ask manager
- Invalid state: lock icon
- Done state: checkmark, "Go to login"

### API Calls
- `GET /api/employee/reset-password?token=...`
- `POST /api/employee/reset-password` — `{ token, password }`

### State
- `status`, `email`, `password`, `showPw`, `submitting`, `done`, `error`

### Validation
- Password: 8+ chars, 1 number, 1 special character.

---

## 15. Crew API Routes

### `/api/employee/me`
- **GET** — returns employee, documents, onboarding summary, drive_configured.
- **PUT** — updates `phone`, `address`, `td1_federal_claim`, `td1_ab_claim`, `onboarding_step`, or banking fields. `onboarding_step` cannot move backwards.
- Tables: `employees`, `employee_documents`.

### `/api/employee/login`
- **POST** — `{ email, password }`. Verifies password, rejects `terminated`/`rejected`, creates session, sets `httpOnly` cookie.
- Tables: `employees`, `employee_sessions`.

### `/api/employee/logout`
- **POST** — destroys session, clears cookie.
- Tables: `employee_sessions`.

### `/api/employee/signup`
- **POST** — `{ name, email, phone, password, sin, address }`. De-dupes by email, encrypts SIN, creates employee with `status='pending'`, seeds required documents, auto-logs in.
- Tables: `employees`, `employee_documents`.

### `/api/employee/reset-password`
- **GET** — validates `token`, returns email.
- **POST** — validates token, sets new password, clears token, destroys all sessions.
- Tables: `employees`, `employee_sessions`.

### `/api/employee/onboard/invite`
- **GET** — validates `token` from `employee_invites`.
- **POST** — accepts invite with `{ token, password, phone, address }`, creates/updates employee, seeds documents, marks invite accepted, sets session cookie.
- Tables: `employee_invites`, `employees`, `employee_documents`.

### `/api/employee/onboard/complete`
- **GET** — checks onboarding status.
- **POST** — verifies all required steps (contract, TD1, acknowledgments, selfie, documents), sets `onboarding_completed_at`, `status='pending_verification'`.
- Tables: `employees`, `employee_documents`.

### `/api/employee/onboard/td1`
- **POST** — `{ form_type: 'federal'|'ab', data }`. Saves TD1 data and marks document completed.
- Tables: `employees`, `employee_documents`.

### `/api/employee/onboard/contract`
- **POST** — `{ signature_typed, contract_version, contract_text_hash }`. Saves signature, marks `contract_signed`.
- Tables: `employees`, `employee_documents`.

### `/api/employee/onboard/banking`
- **POST** — `{ bank_name, institution_number, transit_number, account_number }`. Encrypts banking data and stores as `employee_documents`.
- Tables: `employee_documents`.

### `/api/employee/onboard/acknowledgments`
- **POST** — `{ tickets, phone, data, company_card }`. Saves acknowledgment checkboxes with timestamp.
- Tables: `employees`.

### `/api/employee/documents`
- **GET** — lists documents.
- **POST** — uploads file to Supabase Storage `employee-documents` bucket at `{employee_id}/{doc_type}-{timestamp}.{ext}`. Upserts `employee_documents`. For driver's license, runs OCR with Tesseract.js to extract fields and merges into `employee.license_data`.
- Allowed `doc_type`: `employment_contract`, `td1_federal`, `td1_ab`, `id`, `banking_info`, `sin_document`, `drivers_license_front`, `drivers_license_back`, `other`.
- Tables: `employee_documents`, `employees`.

### `/api/employee/selfie`
- **POST** — uploads selfie to `crew-photos` bucket at `selfies/{employee_id}.{ext}`, updates `employee.selfie_url`.
- **GET** — public endpoint `?booking_id=...` returns crew first names and selfie URLs for a booking.
- Tables: `employees`, `bookings`, `crew_assignments`.

### `/api/employee/clock-in`
- **POST** — `{ lat, lng }`. Employee must be `active` or `onboarded`. Prevents double clock-in. Creates `timesheets` row.
- Tables: `timesheets`.

### `/api/employee/clock-out`
- **POST** — `{ lat, lng }`. Finds open shift, calculates duration, regular/overtime hours, gross pay, updates `timesheets`.
- Tables: `timesheets`, `employees`.

### `/api/employee/job-clock`
- **POST** — `{ booking_id, assignment_id, action: 'in'|'out' }`.
- `action='in'`: creates `job_clock_sessions`, auto-creates shift timesheet if needed, updates `bookings.crew_status` to `in_progress`.
- `action='out'`: closes session, calculates duration, updates booking status, auto-clocks out shift if no more open sessions.
- Tables: `job_clock_sessions`, `timesheets`, `bookings`.

### `/api/employee/schedule`
- **GET** — `?date=...` or `?weekly=true`. Returns daily assignment, partner, bookings, open/completed job sessions, open shift, or weekly schedule grouped by day.
- Tables: `crew_assignments`, `bookings`, `employees`, `job_clock_sessions`, `timesheets`.

### `/api/employee/shifts`
- **GET** — returns open shift, recent 30 shifts, period totals (regular/overtime hours, gross).
- Tables: `timesheets`.

### `/api/employee/location`
- **POST** — `{ lat, lng, heading?, speed? }`. Upserts `crew_locations` by employee_id.
- **GET** — public `?booking_id=...` for customer tracking; returns most recent crew location with `en_route` flag if updated within 5 minutes.
- Tables: `crew_locations`, `bookings`, `crew_assignments`.

### `/api/employee/notifications`
- **GET** — last 50 crew notifications + unread count.
- **POST** — `{ id }` or `{ markAll: true }` marks as read.
- Tables: `crew_notifications`.

### `/api/employee/pay-stubs`
- **GET** — last 52 pay stubs with full deduction breakdown.
- Tables: `pay_stubs`.

### `/api/employee/incidents`
- **GET** — last 50 incidents.
- **POST** — `{ incident_type, severity, description, location, photo_urls, reported_to }`. Creates `incident_reports` and `crew_notifications`.
- Tables: `incident_reports`, `crew_notifications`.

### `/api/employee/issues`
- **GET** — `?booking_id=...` returns job issues.
- **POST** — `{ booking_id, issue_type, severity, description, photo_url }`. Creates `job_issues` and `crew_notifications`.
- Tables: `job_issues`, `crew_notifications`.

### `/api/employee/landfill`
- **GET** — `?lat=...&lng=...` returns recommended landfill by day of week, with distance and warnings.
- Tables: `landfills`.

### `/api/employee/storage-drop`
- **GET** — active `storage_facilities`.
- **POST** — `{ assignment_id, facility_id, booking_id, item_photos, capacity_photo_url, capacity_estimate_pct }`. Creates `storage_drops` and updates facility usage.
- Tables: `storage_drops`, `storage_facilities`.

### `/api/employee/signature`
- **POST** — `{ booking_id, customer_name_typed, customer_signature_url, amount_confirmed, payment_method }`. Creates `customer_signatures`, updates `bookings.payment_status` and `status`.
- Tables: `customer_signatures`, `bookings`.

### `/api/employee/truck-check`
- **POST** — `{ assignment_id, check_type, dashboard_photo_url, odometer_km, fuel_level, fuel_percent, truck_photos, damage_notes, gas_receipt_url, gas_amount_cad, gas_station }`. Creates `truck_checks`.
- Tables: `truck_checks`.

### `/api/employee/receipts`
- **POST** — `{ assignment_id, receipt_type, vendor, amount_cad, receipt_photo_url, notes }`.
- **GET** — `?assignment_id=...&date=...`.
- Tables: `transaction_receipts`.

### `/api/employee/push-subscribe`
- **POST** — `{ endpoint, keys: { p256dh, auth } }`. Upserts `push_subscriptions` by employee_id + endpoint.
- **DELETE** — `?endpoint=...` removes subscription.
- Tables: `push_subscriptions`.

### `/api/employee/gas-price`
- **GET** — returns Alberta gasoline price from cache or OilPriceAPI, default $1.55 CAD.
- Tables: `gas_price_cache`.

### `/api/crew/item-conditions`
- **POST** — `{ booking_id, conditions }`. Merges item condition per item into `bookings.itemized_items` and logs to `events`.
- Tables: `bookings`, `events`.

### `/api/crew/resend-payment-link`
- **POST** — `{ booking_id }`. Resends payment link to customer.
- Tables: `bookings`.

### `/api/crew/collect-payment`
- **POST** — records cash payment. Updates `bookings.payment_status`, `payment_method`, sends SMS receipt.
- Tables: `bookings`.

### `/api/crew/complete-job`
- **POST** — validates completion photos, sets `bookings.crew_status` and `status`, sends review SMS.
- Tables: `bookings`.

### `/api/crew/nearby-opportunities`
- **GET** — `?lat=&lng=&truck_fill=&bookings_today=&hour=`. Finds nearby waitlist, future bookings, and quoted leads. Applies discount curve based on truck fill and detour. Returns ranked opportunities.
- Tables: `crew_location`, `waitlist`, `bookings`, `leads`.

### `/api/crew/offer-nearby`
- **POST** — `{ type, id, lat, lng, phone }` or `{ lead_id, original_price, discounted_price }`. Creates `nearby_offers`, sends SMS, applies cooldowns.
- Tables: `nearby_offers`, `waitlist`, `leads`, `bookings`.

---

## 16. Admin API Routes That Affect Crew

### `/api/admin/crew`
- **GET** — full crew list with onboarding, clock, hours, pending invites.
- **POST** — invite new employee by email. Creates `employee_invites` token, sends Resend email with 7-day expiry.
- Tables: `employees`, `employee_invites`, `job_clock_sessions`, `timesheets`.

### `/api/admin/crew/[id]`
- **GET** — full employee profile with documents, invite, recent sessions, assignments.
- **PATCH** — update fields and optionally send password reset email.
- **DELETE** — terminate employee; ends open sessions, sets `status='terminated'`.
- Tables: `employees`, `employee_documents`, `employee_invites`, `job_clock_sessions`, `crew_assignments`.

### `/api/admin/crew/[id]/approve`
- **POST** — approve or reject. Sets `status` to `active` or `rejected`, records `verified_at`, sends SMS.
- Tables: `employees`.

### `/api/admin/crew/[id]/resend-invite`
- **POST** — refreshes invite token, sends new email.
- Tables: `employee_invites`, `employees`.

### `/api/admin/crew/assignments`
- **GET / POST** — manage `crew_assignments`. Sends push notifications to assigned crew.
- Tables: `crew_assignments`, `employees`.

### `/api/admin/crew/push`
- **GET** — list active employees with push subscription counts.
- **POST** — send push notification to `all` or `individual`.
- Tables: `employees`, `push_subscriptions`.

### `/api/admin/crew/donation-centers` and `/api/admin/crew/storage`
- CRUD for `donation_centers` and `storage_facilities`.

### `/api/admin/employees`
- **GET** — overview with clock status, pay period hours, document status.
- Tables: `employees`, `timesheets`, `employee_documents`.

### `/api/admin/employee-docs`
- **GET / POST** — verify/reject employee documents.
- Tables: `employee_documents`.

### `/api/admin/mark-arrived`
- **POST** — manually mark `bookings.crew_arrived_at`.
- Tables: `bookings`.

### `/api/admin/get-job-photos`
- **GET** — `?booking_id=` or `?phone=` returns customer and crew photos.
- Tables: `bookings`.

### `/api/admin/upload-crew-photo`
- **POST** — upload crew arrival/completion photo to `job-photos` bucket, appends to `bookings.crew_photos`.
- Tables: `bookings`.

### `/api/admin/run-migration`
- **POST** — `secret='jh-migrate-2026'`. Runs schema migrations for crew photos, call history, push subscriptions, employee document types, etc.

---

## 17. Supporting Libraries

### `/tmp/Junkhaul/lib/employeeAuth.js`
- `hashPassword`, `verifyPassword` — scrypt
- `encryptField`, `decryptField` — AES-256-GCM
- `createSession`, `getSessionEmployee`, `destroySession` — cookie session management
- `getAuthedEmployee` — request helper

### `/tmp/Junkhaul/lib/payroll.js`
Implements CRA T4127 payroll deduction formulas for Alberta.
- `calculatePaycheque` — full paycheque with CPP, CPP2, EI, federal and Alberta tax
- `calculatePayRun` — batch payroll
- `calcShiftGross` — regular / overtime split (daily >8hr OR weekly >44hr) with 3-hour minimum
- `splitOvertime` — overtime rules
- Alberta minimum wage $15/hr, 4% vacation pay
- YTD caps for CPP/EI

### `/tmp/Junkhaul/lib/pushNotifications.js`
- `sendPushToEmployee` and `sendPushToEmployees`
- Uses `web-push` with VAPID keys
- Cleans up expired subscriptions (410/404)

### `/tmp/Junkhaul/components/PWARegister.js`
- Registers `/sw.js`
- Shows iOS "Add to Home Screen" prompt on portal pages
- Subscribes to push notifications after login

### `/tmp/Junkhaul/components/portal/DocumentScanner.js`
- File upload UI for documents
- Drag and drop, preview, replace

### `/tmp/Junkhaul/components/portal/SelfieCapture.js`
- Selfie upload UI with `capture="user"` for mobile camera

---

## 18. Database Schema (Crew-Relevant Tables)

### `employees`
- Core employee record: `id`, `email`, `name`, `first_name`, `last_name`, `phone`, `address`, `status`, `hire_date`, `pay_rate`, `onboarded`, `onboarding_completed_at`, `pending_verification`, `password_hash`, `invite_id`, `selfie_url`, `license_data`, `td1_federal_data`, `td1_ab_data`, `contract_signed`, `acknowledgments`, `has_banking`, `has_sin`, `verified_at`, `verified_by`, `created_at`, `updated_at`, etc.

### `employee_invites`
- `id`, `email`, `token`, `first_name`, `last_name`, `phone`, `pay_rate`, `status`, `created_at`, `expires_at`, `accepted_at`

### `employee_documents`
- `id`, `employee_id`, `doc_type`, `status`, `file_url`, `storage_path`, `encrypted_data`, `expires_at`, `expiry_notified_at`, `verified_at`, `verified_by`, `notes`, `created_at`, `updated_at`

### `employee_sessions`
- `id`, `employee_id`, `token_hash`, `expires_at`, `created_at`, `ip_address`, `user_agent`

### `crew_assignments`
- `id`, `assignment_date`, `driver_employee_id`, `secondary_employee_id`, `uhaul_location`, `uhaul_location_lat`, `uhaul_location_lng`, `created_at`, `updated_at`

### `job_clock_sessions`
- `id`, `employee_id`, `booking_id`, `assignment_id`, `clock_in_at`, `clock_out_at`, `duration_minutes`, `created_at`, `updated_at`

### `timesheets`
- `id`, `employee_id`, `clock_in_at`, `clock_out_at`, `clock_in_lat`, `clock_in_lng`, `clock_out_lat`, `clock_out_lng`, `regular_hours`, `overtime_hours`, `total_hours`, `gross_pay`, `pay_rate`, `shift_date`, `created_at`, `updated_at`

### `pay_stubs`
- `id`, `employee_id`, `pay_run_id`, `period_start`, `period_end`, `regular_hours`, `overtime_hours`, `regular_pay`, `overtime_pay`, `vacation_pay`, `gross_pay`, `cpp`, `cpp2`, `ei`, `federal_tax`, `ab_tax`, `total_tax`, `net_pay`, `ytd_gross`, `ytd_cpp`, `ytd_ei`, `ytd_tax`, `status`, `created_at`

### `crew_locations`
- `id`, `employee_id`, `lat`, `lng`, `heading`, `speed`, `updated_at`, `created_at`

### `crew_notifications`
- `id`, `employee_id`, `title`, `body`, `type`, `link`, `read_at`, `created_at`

### `push_subscriptions`
- `id`, `employee_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `updated_at`

### `incident_reports`
- `id`, `employee_id`, `booking_id`, `incident_type`, `severity`, `description`, `location`, `reported_to`, `status`, `created_at`, `updated_at`

### `job_issues`
- `id`, `employee_id`, `booking_id`, `issue_type`, `severity`, `description`, `photo_url`, `status`, `created_at`, `updated_at`

### `customer_signatures`
- `id`, `booking_id`, `employee_id`, `customer_name_typed`, `customer_signature_url`, `amount_confirmed`, `payment_method`, `created_at`

### `truck_checks`
- `id`, `employee_id`, `assignment_id`, `check_type`, `dashboard_photo_url`, `odometer_km`, `fuel_level`, `fuel_percent`, `truck_photos`, `damage_notes`, `gas_receipt_url`, `gas_amount_cad`, `gas_station`, `created_at`

### `transaction_receipts`
- `id`, `employee_id`, `assignment_id`, `receipt_type`, `vendor`, `amount_cad`, `receipt_photo_url`, `notes`, `created_at`

### `storage_facilities`
- `id`, `name`, `address`, `lat`, `lng`, `access_code`, `capacity_sqft`, `is_active`, `created_at`, `updated_at`

### `storage_drops`
- `id`, `assignment_id`, `facility_id`, `booking_id`, `item_photos`, `capacity_photo_url`, `capacity_estimate_pct`, `created_at`

### `donation_centers`
- `id`, `name`, `address`, `lat`, `lng`, `phone`, `hours`, `accepted_items`, `is_active`, `created_at`, `updated_at`

### `landfills`
- `id`, `name`, `address`, `lat`, `lng`, `phone`, `hours`, `day_restrictions`, `is_active`, `created_at`, `updated_at`

### `gas_price_cache`
- `id`, `price_per_litre`, `currency`, `source`, `fetched_at`, `created_at`

### `bookings` (crew-relevant columns)
- `crew_status`, `payment_status`, `crew_photos`, `crew_photos_taken_at`, `crew_arrived_at`, `en_route_at`, `itemized_items`, `tracking_token`, `status`, `balance_due`, `total_price`, `photos`, `customer_name`, `phone`, `address`, `job_date`, `job_time`, `load_size`, `items`, `notes`, `customer_notes`, `payment_method`, `referral_code`, `surge_multiplier`, `surge_mode`

### `system_config` (admin control)
- `key`, `value`, `updated_at`. Includes `default_pay_rate`, `storage_facility_id`, `donation_center_id`, `kill_switch_*` flags, and many operational tunables.

---

## 19. Important Business Rules

### Onboarding
- Admin invites an employee by email.
- Employee receives an email with a link to `/portal/onboard?token=...`.
- Employee sets password, uploads documents, fills TD1 forms, signs contract, enters banking, accepts acknowledgments.
- On completion, status becomes `pending_verification`.
- Admin approves → `active`. Rejects → `rejected`.
- Only `active` or `onboarded` employees can clock in.

### Clock / Job Clock
- Clocking is primarily automatic when `job-clock` action `'in'` is triggered.
- `timesheets` tracks shift-level clock in/out.
- `job_clock_sessions` tracks per-job clock in/out.
- Ending the last job session auto-clocks out the shift.

### Payroll
- Alberta overtime: >8 hours in a day OR >44 hours in a week.
- 3-hour minimum pay for short shifts.
- 4% vacation pay paid each period.
- CPP, CPP2, EI, federal and Alberta tax per CRA T4127.

### Job Execution
- En route → Arrived → Payment → Load Truck → Route Decision → Drop Flow → Signature → Complete.
- EOD truck return check after all jobs.
- Issue flag can be raised at any step.

### Location
- Location permission is required.
- GPS sent every 30 seconds.
- Customer tracking page reads latest `crew_locations` for a booking.

### Notifications
- Push notifications require browser permission.
- In-app notifications appear in `/portal/notifications`.

---

## 20. File Index

### Portal Pages
- `app/portal/page.js`
- `app/portal/onboard/page.js`
- `app/portal/verification/page.js`
- `app/portal/schedule/page.js`
- `app/portal/job/page.js`
- `app/portal/clock/page.js`
- `app/portal/documents/page.js`
- `app/portal/paystubs/page.js`
- `app/portal/notifications/page.js`
- `app/portal/incidents/page.js`
- `app/portal/reset-password/page.js`
- `app/portal/layout.js`

### Crew API Routes
- `app/api/employee/me/route.js`
- `app/api/employee/login/route.js`
- `app/api/employee/logout/route.js`
- `app/api/employee/signup/route.js`
- `app/api/employee/reset-password/route.js`
- `app/api/employee/onboard/invite/route.js`
- `app/api/employee/onboard/complete/route.js`
- `app/api/employee/onboard/td1/route.js`
- `app/api/employee/onboard/contract/route.js`
- `app/api/employee/onboard/banking/route.js`
- `app/api/employee/onboard/acknowledgments/route.js`
- `app/api/employee/documents/route.js`
- `app/api/employee/selfie/route.js`
- `app/api/employee/clock-in/route.js`
- `app/api/employee/clock-out/route.js`
- `app/api/employee/job-clock/route.js`
- `app/api/employee/schedule/route.js`
- `app/api/employee/shifts/route.js`
- `app/api/employee/location/route.js`
- `app/api/employee/notifications/route.js`
- `app/api/employee/pay-stubs/route.js`
- `app/api/employee/incidents/route.js`
- `app/api/employee/issues/route.js`
- `app/api/employee/landfill/route.js`
- `app/api/employee/storage-drop/route.js`
- `app/api/employee/signature/route.js`
- `app/api/employee/truck-check/route.js`
- `app/api/employee/receipts/route.js`
- `app/api/employee/push-subscribe/route.js`
- `app/api/employee/gas-price/route.js`
- `app/api/crew/item-conditions/route.js`
- `app/api/crew/resend-payment-link/route.js`
- `app/api/crew/collect-payment/route.js`
- `app/api/crew/complete-job/route.js`
- `app/api/crew/nearby-opportunities/route.js`
- `app/api/crew/offer-nearby/route.js`

### Admin Crew API Routes
- `app/api/admin/crew/route.js`
- `app/api/admin/crew/[id]/route.js`
- `app/api/admin/crew/[id]/approve/route.js`
- `app/api/admin/crew/[id]/resend-invite/route.js`
- `app/api/admin/crew/assignments/route.js`
- `app/api/admin/crew/push/route.js`
- `app/api/admin/crew/donation-centers/route.js`
- `app/api/admin/crew/storage/route.js`
- `app/api/admin/employees/route.js`
- `app/api/admin/employee-docs/route.js`
- `app/api/admin/mark-arrived/route.js`
- `app/api/admin/get-job-photos/route.js`
- `app/api/admin/upload-crew-photo/route.js`
- `app/api/admin/run-migration/route.js`

### Shared Libraries
- `lib/employeeAuth.js`
- `lib/payroll.js`
- `lib/pushNotifications.js`
- `components/PWARegister.js`
- `components/portal/DocumentScanner.js`
- `components/portal/SelfieCapture.js`

---

*Generated for review of the Junk Haul Calgary crew application. Continued below.*

---

## 21. Detailed Portal Page Breakdown

### `/portal/schedule` — Detailed Operation

**File:** `app/portal/schedule/page.js`

#### Page Load Sequence
1. `useEffect` calls `/api/employee/me`.
2. If `me` returns 401, redirect to `/portal`.
3. If `onboarding_completed_at` is missing or `onboarded` is false, redirect to `/portal/onboard`.
4. If `pending_verification` is true, redirect to `/portal/verification`.
5. Request browser geolocation permission.
6. If permission is denied, render the location-denied screen.
7. If granted, start `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
8. `setTimeout` triggers `fetchSchedule()` to load the daily assignment.
9. `setInterval` polls `/api/employee/notifications` every 30 seconds.
10. `setInterval` sends GPS location to `/api/employee/location` every 30 seconds.

#### Map Implementation
- Mapbox GL JS is loaded from `mapbox-gl`.
- Map style is `mapbox://styles/mapbox/streets-v12`.
- Default camera center is Calgary `[ -114.0719, 51.0447 ]`.
- Once `crewPos` is available, map centers and zooms to the crew location.
- Once `jobCoords` are available, map fits bounds to include crew + all jobs.
- Route line is drawn from Mapbox Directions API with `overview=full`, `geometries=geojson`, `steps=true`, `voice_instructions=true`, `annotations=duration,distance,speed`, `alternatives=true`.
- Current speed is computed from the GPS `position.coords.speed` (m/s to km/h).
- Speed limit is taken from the Directions API annotation.
- If `speed > speed_limit + 10`, a warning message is shown.

#### Navigation Instruction Panel
- Shows `modifier` + `type` maneuver as human text.
- Shows distance to next maneuver.
- Shows current speed and speed limit.
- "Voice" toggle uses `SpeechSynthesisUtterance`.
- "Support" button opens phone dial to `(587) 325-0751`.
- Off-route detection: if `distanceFromRoute > 120` meters for two consecutive checks, a new route is requested.

#### Bottom Sheet Behavior
- Three snap states: `collapsed` (~15% visible), `half` (~45% visible), `full` (~85% visible).
- `handleDragStart`, `handleDragMove`, `handleDragEnd` manage touch and pointer events.
- Sheet shows either the current day's assignment or the weekly view.

#### Weekly View
- `showWeekly` toggles a 7-day horizontal scroll.
- Each day card shows date, day name, job count.
- Days before today without jobs are dimmed.
- Today is highlighted with a left orange border.
- Tapping a day switches to that day's schedule.

#### Assignment Card
- Shows pickup location name and address.
- Shows partner employee name and phone if a secondary is assigned.
- "Call partner" button dials the partner's phone.
- "Pickup location" button opens Mapbox directions to the U-Haul location.

#### Truck Check Section
- If no pickup check exists: "Truck Pickup Check" button.
- If a pickup check exists and no return check: "Truck Return Check" button.
- Buttons navigate to `/portal/job?check=pickup` or `/portal/job?check=return`.

#### Job Cards
- Sorted by `job_time` then `created_at`.
- Numbered badge from 1 to N.
- Status pill: `scheduled` (gray), `en_route` (blue), `arrived` (orange), `in_progress` (orange), `awaiting_payment` (green), `complete` (green).
- Tap to expand items/notes.
- "Start Job" / "End Job" buttons call `/api/employee/job-clock`.
- "View Details" navigates to `/portal/job?booking_id=...`.

#### End-of-Day Celebration
- When `allComplete` is true and `showEOD` is true, a confetti/success overlay appears.
- Overlay title: "All done!".
- Shows summary of completed jobs.
- "Close" button returns to the sheet.

---

### `/portal/job` — Detailed Operation

**File:** `app/portal/job/page.js`

#### URL Parameters
- `?booking_id=...` — required to load the job.
- `?check=pickup` — shows EOD truck pickup check instead of job flow.
- `?check=return` — shows EOD truck return check instead of job flow.

#### Data Load Sequence
1. `useEffect` with `booking_id` calls `/api/employee/me`.
2. Then calls `/api/employee/schedule?date=...` for the booking's job date.
3. Finds the booking in the returned data.
4. If `check` is set, skips to the EOD step.
5. Otherwise, sets `stepIdx` based on `booking.crew_status`:
   - `scheduled` → Step 0 (En Route)
   - `en_route` → Step 0 (En Route)
   - `arrived` → Step 1 (Arrived)
   - `in_progress` → Step 1 (Arrived)
   - `awaiting_payment` → Step 6 (Signature)
   - `complete` → Step 6 (Signature)
   - `payment_link_sent` → Step 2 (Payment)

#### Step 0: En Route
- Shows `booking.items` as a list.
- Items with `is_donate=true` show a green "DONATE" tag.
- Items with `is_freon=true` show a green "FREON" tag.
- "Mark En Route" button calls `/api/employee/job-clock` with `action='in'`.
- Also sends a push notification to the customer (via `/api/employee/location` does not notify; customer notification is server-side on `job-clock`.
- Advances to Step 1.

#### Step 1: Arrived / Item Conditions
- Shows load size and `itemized_items`.
- Each item has three buttons: Good, Damaged, Missing.
- If "Damaged" is selected, a note input appears.
- "Confirm & Continue" is disabled until all items have a condition.
- On continue, calls `/api/crew/item-conditions` and then `/api/employee/job-clock` (or marks `crew_status` arrived on the server).
- Advances to Step 2.

#### Step 2: Payment
- Toggles between Card and Cash.
- "Amount confirmed" defaults to `booking.total_price`.
- "Resend payment link" calls `/api/crew/resend-payment-link`.
- For Card, the crew does not collect money; the customer pays by link.
- For Cash, the crew collects and confirms the amount.
- "Confirm Payment" advances to Step 3.

#### Step 3: Load Truck
- Shows each item with a checkbox.
- Checked items are tracked in `checkedItems`.
- "Load Confirmed" requires all items to be checked.
- Advances to Step 4.

#### Step 4: Route Decision
- Fetches `/api/employee/landfill?lat=&lng=` using current GPS.
- Fetches `/api/employee/storage-drop` (storage facilities list).
- Shows landfill card with name, address, distance, hours, warnings.
- Shows storage facility count.
- "Continue to Drop Flow" advances to Step 5.

#### Step 5: Drop Flow
- Storage facility dropdown.
- Multiple item photo captures (base64 data URLs).
- Capacity photo capture.
- Capacity estimate input (%).
- "Record Drop" calls `/api/employee/storage-drop`.
- "No storage drop — landfill only" skips storage and advances.
- Advances to Step 6.

#### Step 6: Signature
- Customer name input.
- Crew name display.
- Amount confirmed input.
- Signature canvas using `react-signature-canvas` or native canvas.
- "Clear" resets the canvas.
- "Complete Job" calls `/api/employee/signature`.
- On success, shows success overlay and `jobComplete=true`.
- If payment is still cash outstanding, it prompts to collect.

#### EOD / Truck Check
- `check=pickup` or `check=return`.
- Dashboard photo capture.
- Odometer input (km).
- Fuel level selector: Empty, 1/4, 1/2, 3/4, Full.
- For return: gas receipt photo + amount, dump receipt photo + amount.
- "Submit Return Check" calls `/api/employee/truck-check` and `/api/employee/receipts`.
- On success, returns to `/portal/schedule`.

#### Issue Flag Overlay
- Accessible from any step via the top-right flag button.
- Issue type: `access`, `damage`, `safety`, `customer`, `vehicle`, `other`.
- Severity: `low`, `medium`, `high`.
- Description textarea.
- "Report Issue" calls `/api/employee/issues`.
- On success, closes the overlay and shows confirmation.

---

## 22. Detailed API Route Specifications

### Authentication Status Codes
- `401` — not logged in or session expired.
- `403` — logged in but not approved (`status` not `active` or `onboarded`).
- `400` — validation error.
- `500` — server/database error.

### `/api/employee/me`

**GET Response (200):**
```json
{
  "employee": {
    "id", "email", "name", "phone", "address", "status",
    "hire_date", "pay_rate", "onboarded", "pending_verification",
    "onboarding_completed_at", "onboarding_step", "has_password",
    "selfie_url", "td1_federal_done", "td1_ab_done", "contract_signed",
    "acknowledgments_done", "has_banking", "has_sin",
    "td1_federal_claim", "td1_ab_claim"
  },
  "documents": [ { "id", "doc_type", "status", "file_url", "expires_at", "verified_at", "notes" } ],
  "onboarding": {
    "complete": false,
    "required": ["sin_document", "drivers_license_front", "drivers_license_back"],
    "uploaded": ["drivers_license_front"],
    "missing": ["sin_document", "drivers_license_back"]
  },
  "drive_configured": false
}
```

**PUT Body:**
```json
{
  "phone": "(587) 555-0123",
  "address": "123 Main St, Calgary",
  "onboarding_step": 3
}
```

**Business Rules:**
- `onboarding_step` cannot move backwards.
- Banking fields are encrypted and stored as `encrypted_data` in `employee_documents`.

---

### `/api/employee/clock-in`

**POST Body:**
```json
{ "lat": 51.0447, "lng": -114.0719 }
```

**Business Rules:**
- Rejects if `status` not in `['active', 'onboarded']`.
- Rejects if an open `timesheets` row already exists for this employee.
- Creates `timesheets` with `clock_in_at`, `clock_in_lat`, `clock_in_lng`, `pay_rate`, `shift_date`.

**Response:**
```json
{ "ok": true, "shift": { "id", "clock_in_at", "shift_date" } }
```

---

### `/api/employee/clock-out`

**POST Body:**
```json
{ "lat": 51.0447, "lng": -114.0719 }
```

**Business Rules:**
- Finds the open `timesheets` row for the employee.
- Calculates `clock_out_at` and `duration_minutes`.
- Computes `regular_hours`, `overtime_hours`, `total_hours`, `gross_pay` using `calcShiftGross`.
- Updates `timesheets`.
- Overtime rule: >8 hours in the day or >44 hours in the week (whichever is greater).
- 3-hour minimum: if shift is shorter than 3 hours and no break, minimum 3 hours paid.

**Response:**
```json
{ "ok": true, "shift": { "id", "clock_out_at", "regular_hours", "overtime_hours", "gross_pay" } }
```

---

### `/api/employee/job-clock`

**POST Body:**
```json
{
  "booking_id": "uuid",
  "assignment_id": "uuid",
  "action": "in"
}
```

**Business Rules — `action='in':`**
- Rejects if already an open `job_clock_sessions` for this `booking_id`.
- If no open `timesheets` row, creates one (auto clock-in).
- Creates `job_clock_sessions` with `clock_in_at`.
- Updates `bookings.crew_status = 'in_progress'`.
- Sends customer notification that crew is en route.

**Business Rules — `action='out':`**
- Finds the open `job_clock_sessions` for this `booking_id`.
- Sets `clock_out_at` and `duration_minutes`.
- If no other open `job_clock_sessions` for this employee, clocks out the shift (`timesheets`.
- Updates `bookings.crew_status` based on payment status.
- Returns `duration_minutes`.

**Response:**
```json
{ "ok": true, "session": { "id", "clock_in_at", "clock_out_at", "duration_minutes" } }
```

---

### `/api/employee/schedule`

**Daily GET Response:**
```json
{
  "assignment": {
    "id", "assignment_date", "driver_employee_id", "secondary_employee_id",
    "uhaul_location", "uhaul_location_lat", "uhaul_location_lng",
    "driver": { "id", "name", "phone" },
    "secondary": { "id", "name", "phone" }
  },
  "partner": { "id", "name", "phone" },
  "bookings": [ { booking object } ],
  "open_sessions": [ { job_clock_sessions currently open } ],
  "completed_sessions": [ { job_clock_sessions closed today } ],
  "open_shift": { timesheets row currently open }
}
```

**Weekly GET Response:**
```json
{
  "week": [
    {
      "date": "2026-07-13",
      "day": "Mon",
      "bookings": [ { ... } ],
      "assignment": { ... }
    }
  ],
  "startDate": "2026-07-13",
  "endDate": "2026-07-19"
}
```

**Business Rules:**
- Daily view defaults to today if `date` is omitted.
- Returns only `crew_assignments` where driver or secondary is the logged-in employee.
- `open_sessions` are `job_clock_sessions` with `clock_out_at` null.
- `completed_sessions` are `job_clock_sessions` closed today.

---

### `/api/employee/location`

**POST Body:**
```json
{ "lat": 51.0447, "lng": -114.0719, "heading": 90, "speed": 15.5 }
```

**Business Rules:**
- Upserts `crew_locations` by `employee_id`.
- One row per employee; latest location overwrites.

**GET Public (customer tracking):**
- `?booking_id=...`
- Finds the booking date.
- Finds crew assigned to that date.
- Returns most recent `crew_locations` for those employees.
- `en_route` is `true` if location updated within 5 minutes.

**Response:**
```json
{
  "location": {
    "lat": 51.0447,
    "lng": -114.0719,
    "heading": 90,
    "updated_at": "2026-07-11T...",
    "crew_first_names": ["Hammad"],
    "en_route": true
  }
}
```

---

### `/api/employee/onboard/complete`

**POST Business Rules:**
- Verifies `contract_signed`.
- Verifies `td1_federal_data`.
- Verifies `td1_ab_data`.
- Verifies `acknowledgments` (at minimum `tickets`).
- Verifies `selfie_url`.
- Verifies all required documents uploaded (sin, license front, license back) with status `uploaded` or `verified`.
- If all checks pass: sets `onboarding_completed_at`, `status='pending_verification'`, `pending_verification=true`.
- If any check fails: returns `{ ok: false, missing: [...] }`.

**Response:**
```json
{ "ok": true, "completed_at": "2026-07-11T...", "status": "pending_verification" }
```

---

### `/api/employee/documents`

**POST Business Rules:**
- `doc_type` must be one of:
  `employment_contract`, `td1_federal`, `td1_ab`, `id`, `banking_info`, `sin_document`, `drivers_license_front`, `drivers_license_back`, `other`.
- File is uploaded to Supabase Storage bucket `employee-documents`.
- Path: `{employee_id}/{doc_type}-{timestamp}.{ext}`.
- Upserts `employee_documents` row.
- For `drivers_license_front` or `drivers_license_back`:
  - Runs OCR with Tesseract.js.
  - Extracts `date_of_birth`, `expiry_date`, `license_number`, `province`.
  - Merges into `employee.license_data`.
- If all required documents are uploaded and `status` is `pending`, updates `status` to `pending_verification`.

**Response:**
```json
{
  "ok": true,
  "document": { "id", "doc_type", "status", "file_url" },
  "extracted_data": { "date_of_birth", "expiry_date", "license_number" },
  "onboarding_complete": false
}
```

---

### `/api/employee/pay-stubs`

**GET Response:**
```json
{
  "pay_stubs": [
    {
      "id", "employee_id", "pay_run_id", "period_start", "period_end",
      "regular_hours", "overtime_hours", "regular_pay", "overtime_pay",
      "vacation_pay", "gross_pay", "cpp", "cpp2", "ei", "federal_tax",
      "ab_tax", "total_tax", "net_pay", "ytd_gross", "ytd_cpp", "ytd_ei",
      "ytd_tax", "status", "created_at"
    }
  ]
}
```

---

### `/api/employee/signature`

**POST Body:**
```json
{
  "booking_id": "uuid",
  "customer_name_typed": "John Smith",
  "customer_signature_url": "https://...png",
  "amount_confirmed": "250.00",
  "payment_method": "card"
}
```

**Business Rules:**
- Creates `customer_signatures` row.
- If `payment_method` is `cash` and `amount_confirmed` equals `balance_due`, updates `payment_status` to `paid`.
- If `payment_status` is `paid`, updates `bookings.status` to `completed` and `crew_status` to `complete`.
- If not paid, sets `crew_status` to `awaiting_payment`.

**Response:**
```json
{ "ok": true, "signature": { "id", "created_at" } }
```

---

### `/api/employee/truck-check`

**POST Body:**
```json
{
  "assignment_id": "uuid",
  "check_type": "return",
  "dashboard_photo_url": "https://...png",
  "odometer_km": "14250",
  "fuel_level": "half",
  "fuel_percent": "50",
  "truck_photos": ["https://...png"],
  "damage_notes": "",
  "gas_receipt_url": "https://...png",
  "gas_amount_cad": "45.00",
  "gas_station": "Shell"
}
```

**Business Rules:**
- `check_type` is `pickup` or `return`.
- Creates `truck_checks` row.

**Response:**
```json
{ "ok": true, "check": { "id", "created_at" } }
```

---

### `/api/employee/receipts`

**POST Body:**
```json
{
  "assignment_id": "uuid",
  "receipt_type": "dump",
  "vendor": "City Landfill",
  "amount_cad": "35.00",
  "receipt_photo_url": "https://...png",
  "notes": ""
}
```

**Business Rules:**
- `receipt_type` is `gas`, `dump`, `uhaul`, or `other`.
- Creates `transaction_receipts` row.

**Response:**
```json
{ "ok": true, "receipt": { "id", "created_at" } }
```

---

### `/api/employee/incidents`

**POST Body:**
```json
{
  "incident_type": "injury",
  "severity": "medium",
  "description": "Twisted ankle on stairs",
  "location": "123 Main St",
  "reported_to": "Hammad",
  "photo_urls": ["https://...png"]
}
```

**Business Rules:**
- `incident_type` is `injury`, `vehicle_accident`, `property_damage`, `near_miss`, `safety_hazard`, `other`.
- `severity` is `low`, `medium`, `high`, `critical`.
- Creates `incident_reports` row.
- Creates `crew_notifications` for admin.

**Response:**
```json
{ "incident": { "id", "created_at", "status": "reported" } }
```

---

### `/api/employee/issues`

**POST Body:**
```json
{
  "booking_id": "uuid",
  "issue_type": "access",
  "severity": "high",
  "description": "Customer not home",
  "photo_url": "https://...png"
}
```

**Business Rules:**
- `issue_type` is `access`, `damage`, `safety`, `customer`, `vehicle`, `other`.
- `severity` is `low`, `medium`, `high`.
- Creates `job_issues` row.
- Creates `crew_notifications` for admin with link to job.

**Response:**
```json
{ "issue": { "id", "created_at" } }
```

---

## 23. Admin Crew Endpoints in Detail

### `POST /api/admin/crew` (Invite New Employee)

**Body:**
```json
{
  "first_name": "Hammad",
  "last_name": "Bhatti",
  "phone": "5875550000",
  "email": "hammad@example.com",
  "pay_rate": 25.00
}
```

**Business Rules:**
- `first_name`, `last_name`, `email` required.
- Email normalized to lowercase.
- If an employee with that email exists and onboarding is incomplete, the old employee record is deleted so a fresh invite can be sent.
- If an employee exists and onboarding is complete, returns 409.
- Creates `employee_invites` row with 32-byte hex token and 7-day expiry.
- Sends email via Resend with link `/portal/onboard?token=...`.

**Response:**
```json
{ "ok": true, "invite": { "id", "token", "email", "expires_at" } }
```

---

### `POST /api/admin/crew/[id]/approve`

**Body:**
```json
{
  "action": "approve",
  "verification_notes": "Approved after review"
}
```

**Business Rules:**
- `action` is `approve` or `reject`.
- `approve`: sets `status='active'`, `pending_verification=false`, `verified_at`, `verified_by`.
- `reject`: sets `status='rejected'`, `verification_notes`.
- Sends SMS notification via `lib/sms`.

**Response:**
```json
{ "ok": true, "employee": { "id", "status", "verified_at" } }
```

---

### `POST /api/admin/crew/assignments`

**Body:**
```json
{
  "assignment_date": "2026-07-14",
  "driver_employee_id": "uuid",
  "secondary_employee_id": "uuid",
  "uhaul_location": "U-Haul 17 Ave",
  "uhaul_location_lat": 51.04,
  "uhaul_location_lng": -114.07
}
```

**Business Rules:**
- Upserts by `assignment_date` + `driver_employee_id`.
- Sends push notifications to driver and secondary.

**Response:**
```json
{ "ok": true, "assignment": { "id", "assignment_date", "driver_employee_id", "secondary_employee_id" } }
```

---

### `POST /api/admin/crew/push`

**Body:**
```json
{
  "target": "all",
  "title": "New Jobs Added",
  "body": "Check your schedule for tomorrow.",
  "url": "/portal/schedule"
}
```

**Business Rules:**
- `target` is `all` or `individual`.
- For `individual`, `employee_id` required.
- Sends web push to all subscriptions for target employees.
- Returns `sent`, `total`, `errors`.

**Response:**
```json
{ "ok": true, "sent": 5, "total": 6, "errors": 1 }
```

---

### `POST /api/admin/employee-docs`

**Body:**
```json
{
  "document_id": "uuid",
  "status": "verified",
  "notes": "ID verified"
}
```

**Business Rules:**
- `status` is `verified` or `rejected`.
- Updates `employee_documents` with `verified_at`, `verified_by`, `notes`.

**Response:**
```json
{ "ok": true, "document": { "id", "status", "verified_at" } }
```

---

### `POST /api/admin/mark-arrived`

**Body:**
```json
{ "booking_id": "uuid" }
```

**Business Rules:**
- Updates `bookings.crew_arrived_at` to current timestamp.

**Response:**
```json
{ "ok": true, "arrived_at": "2026-07-11T..." }
```

---

### `POST /api/admin/upload-crew-photo`

**Body:** Multipart FormData:
- `file` (image)
- `booking_id`
- `type` (`crew_arrival` or `crew_completion`)

**Business Rules:**
- Uploads to Supabase Storage `job-photos` bucket.
- Creates bucket if missing.
- Appends to `bookings.crew_photos` array with `url`, `type`, `path`, `uploaded_at`.
- Updates `crew_photos_taken_at`.

**Response:**
```json
{ "ok": true, "photo": { "url", "path", "type", "uploaded_at" } }
```

---

## 24. Service Worker / PWA

**File:** `public/sw.js` (not located in app, assumed public)

The `PWARegister` component:
- Registers the service worker at `/sw.js`.
- Detects iOS Safari not in standalone mode and shows an "Add to Home Screen" prompt.
- After login, requests push notification permission and subscribes to push.
- Uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the subscription.
- Posts subscription to `/api/employee/push-subscribe`.

**Push payload format:**
```json
{
  "title": "New Job",
  "body": "You have a new assignment for tomorrow.",
  "url": "/portal/schedule"
}
```

---

## 25. Environment Variables

Crew app uses these environment variables:

- `NEXT_PUBLIC_SITE_URL` — site base URL for email links.
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox GL access token.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public VAPID key for push notifications.
- `VAPID_PRIVATE_KEY` — private VAPID key.
- `VAPID_SUBJECT` — VAPID subject (mailto:).
- `RESEND_API_KEY` — sends invite, reset, and admin emails.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — database and storage.
- `ENCRYPTION_KEY` — AES-256-GCM key for sensitive fields.
- `OILPRICE_API_KEY` — gas price lookup.
- `MAPBOX_TOKEN` — server-side Mapbox API access ( Directions / Geocoding).
- `TWILIO_*` or `SMS_*` variables for SMS (used in `lib/sms`).

---

## 26. Database Migrations Summary

### `20260705_crew_app.sql`
- Adds `crew_status`, `payment_status`, `crew_photos`, `tracking_session_id`, `en_route_at` to `bookings`.
- Creates `crew_location` table for live GPS.
- Adds `lat`, `lng`, `offered_nearby_today` to `waitlist`.
- Creates `nearby_offers` and `gps_overrides` tables.
- Adds `crew_pin` to `employees`.
- Adds `pg_cron` job `crew-location-cleanup` (hourly).

### `20260706_crew_photos.sql`
- Adds `crew_photos`, `crew_photos_taken_at`, `crew_arrived_at` to `bookings`.
- Creates `call_history` table.

### `20260707_employee_portal.sql`
- Creates `employees`, `employee_documents`, `employee_sessions`, `timesheets`, `payroll_rates`, `pay_runs`, `pay_stubs`, `direct_deposits`, `remittances` tables.

### `20260708_growth_engine.sql`
- Creates `leads`, `referrals` tables.
- Adds `customer_id`, `referral_code`, `referred_by_phone` to `bookings`.
- Adds `lead_id`, `offer_type`, discount fields to `nearby_offers`.
- Creates analytics views.
- Adds `pg_cron` jobs for abandonment follow-up and opportunistic offers.

### `20260709_surge_pricing.sql`
- Creates `slot_demand_snapshots`.
- Adds `surge_multiplier`, `surge_mode` to `bookings`.
- Adds `pg_cron` demand snapshot job.

### `20260710_admin_control_center.sql`
- Creates `system_config`, `system_events`, `cron_health` tables.
- Seeds default config with 20+ kill switches and tunables.

### `20260711_edge_function_kill_switches.sql`
- Adds more kill switches.

### `20260711_employee_documents_doc_types.sql`
- Expands `employee_documents.doc_type` constraint to include `sin_document`, `drivers_license_front`, `drivers_license_back`, `other`.

### `20260712_ai_narrator.sql`
- Creates `ai_insights` table.

### `20260713_ai_agent.sql`
- Creates `ai_agent_actions` table.

### `20260713_leads_out_of_area.sql`
- Adds `out_of_area`, `out_of_area_notes` to `leads`.

### `20260714_crew_management.sql`
- Creates `employee_invites`, `crew_assignments`, `truck_checks`, `transaction_receipts`, `customer_signatures`, `storage_facilities`, `storage_drops`, `donation_centers`, `donation_runs`, `job_clock_sessions`, `landfills`, `gas_price_cache`.
- Adds `invite_id`, `first_name`, `last_name`, `td1_federal_data`, `td1_ab_data`, `contract_signed`, `acknowledgments`, `onboarding_completed_at` to `employees`.
- Seeds `landfills` table with Calgary data.

### `20260715_push_subscriptions.sql`
- Creates `push_subscriptions` table.

### `20260716_crew_tracking.sql`
- Creates `crew_locations` table.
- Adds `selfie_url` to `employees`.
- Adds `tracking_token` to `bookings`.

### `20260717_customer_tracking.sql`
- Creates `customer_feedback` and `crew_tips` tables.

### `20260718_portal_features.sql`
- Creates `crew_notifications`, `job_issues`, `incident_reports`.
- Adds `expires_at`, `expiry_notified_at` to `employee_documents`.
- Creates `offline_job_queue` table.

---

## 27. Edge Cases & Error Handling

### Onboarding
- Expired invite: `/portal/onboard` shows an "Invite problem" error and asks to contact the manager.
- Already completed onboarding: redirected to `/portal/verification` or `/portal/schedule`.
- Missing documents on completion: `/api/employee/onboard/complete` returns `missing` array.

### Clock / Schedule
- Double clock-in: `/api/employee/clock-in` returns 409.
- Clock-out without clock-in: `/api/employee/clock-out` returns 404.
- Job clock in when already clocked in for same booking: returns 409.

### Job Execution
- Item conditions not all selected: "Confirm & Continue" disabled.
- Storage drop without facility: form validation error.
- Signature missing name or amount: "Complete Job" disabled.

### Location
- Permission denied: schedule page shows location-denied screen.
- GPS unavailable: map defaults to Calgary and shows offline indicator.

### Notifications
- No push subscription: notifications still appear in `/portal/notifications`.
- Push permission denied: app continues with in-app notifications only.

---

## 28. Security Notes

- Session cookies are `httpOnly` and `SameSite=lax`.
- Sensitive fields (SIN, banking) are encrypted with AES-256-GCM.
- Passwords are hashed with scrypt.
- File uploads are stored in private Supabase Storage buckets and served via signed URLs.
- Public endpoints (`/api/employee/location` GET, `/api/employee/selfie` GET) are read-only and limited by `booking_id`.
- Admin routes are protected by `checkAuth()` in `lib/adminAuth.js`.

---

*End of crew app documentation. Additions can be appended below.*
