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


---

## 29. PWA / Service Worker / Offline Support

### `public/manifest.json`

The PWA manifest declares the app as installable.

```json
{
  "name": "Junk Haul Crew",
  "short_name": "JunkHaul",
  "description": "Junk Haul Calgary Crew Portal",
  "start_url": "/portal",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAFAFA",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" },
    { "src": "/crew-logo.png", "sizes": "1254x1254", "type": "image/png", "purpose": "any" }
  ]
}
```

**Behavior:**
- When a user installs the app from the browser, it opens in full-screen standalone mode with no browser chrome.
- Start URL is `/portal`.
- Theme color is orange (`#f97316`), background is light gray (`#FAFAFA`).

### `public/sw.js` — Service Worker

**Responsibilities:**
1. Push notification display.
2. Push notification click handling (focus existing window or open new).
3. Offline shell cache.

**Push Event (`self.addEventListener('push')`):**
- Receives push payload `{ title, body, url, actions }`.
- Displays notification with:
  - `title` (default: "Junk Haul Crew")
  - `body`
  - `icon`: `/icon-192.png`
  - `badge`: `/icon-192.png`
  - `vibrate`: `[100, 50, 100]`
  - `data.url`: deep link to `/portal/schedule` or provided URL
  - `actions`: any action buttons included in payload

**Notification Click (`notificationclick`):**
- Closes the notification.
- Tries to find an open window on `junkhaul.ca`.
- If found, focuses it and navigates to `data.url`.
- If not found, opens a new window to `data.url`.

**Cache Strategy:**
- Cache name: `junkhaul-portal-v3`.
- Pre-cached on install:
  - `/portal`
  - `/portal/schedule`
  - `/portal/clock`
  - `/portal/onboard`
  - `/manifest.json`
  - `/favicon-32.png`
  - `/crew-logo.png`
- On `fetch`:
  - Only handles same-origin GET requests.
  - Cache-first: if in cache, return cached; otherwise fetch, cache a copy, and return.
  - If fetch fails, return cached if available.
- On `activate`: deletes all old caches.

### `components/PWARegister.js`

**Responsibilities:**
- Registers `/sw.js`.
- Detects iOS Safari not in standalone mode.
- Shows an "Add to Home Screen" prompt on portal pages (not onboarding).
- Auto-subscribes to push notifications after login.

**iOS Prompt Logic:**
- `isIOS` = user agent matches `iPhone|iPad|iPod`.
- `isStandalone` = `navigator.standalone` or `display-mode: standalone`.
- `isPortal` = path starts with `/portal`.
- `isOnboarding` = path includes `/portal/onboard`.
- If iOS + not standalone + portal + not onboarding, and user hasn't dismissed it, show prompt after 2 seconds.
- Dismiss button stores `jh-ios-prompt-dismissed` in `localStorage`.

**Push Subscription Logic:**
- Runs on portal pages (not onboarding).
- Waits 2 seconds after mount.
- Requests notification permission if `default`.
- If denied, stops.
- If granted, gets service worker registration.
- Gets existing push subscription.
- If none, converts VAPID public key from base64url to Uint8Array and subscribes via `PushManager.subscribe`.
- Posts subscription to `/api/employee/push-subscribe`.

### `lib/offlineQueue.js`

**Functions:**
- `getOfflineQueue()` — reads `jh-offline-queue` from `localStorage`.
- `addToOfflineQueue(action, payload)` — appends action to queue.
- `removeFromOfflineQueue(index)` — removes item by index.
- `clearOfflineQueue()` — removes key.
- `syncOfflineQueue()` — iterates queue, POSTs each to `/api/crew/${action}`, keeps failed items.
- `isOnline()` — returns `navigator.onLine`.

**Usage:**
- `schedule/page.js` tracks `navigator.onLine` and shows an "OFFLINE" badge.
- The offline queue is not yet automatically wired into every action in the current code, but the utility exists for crew actions (`item-conditions`, `job-clock`, `storage-drop`, etc.).

### Current PWA / Offline Behavior

- The app is installable on both iOS (Add to Home Screen) and Android (Add to Home screen / Install).
- The onboarding flow is intentionally not behind an install gate (removed).
- The portal pages are cached for offline shell display.
- Real-time data (schedule, notifications) requires network.
- Push notifications work when the app is in the background or closed.

---

## 30. Mapbox Navigation (In-App)

### Map Implementation

**Library:** Mapbox GL JS (`mapbox-gl` / `mapbox-gl/dist/mapbox-gl.css`).
**Token:** `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`.
**Style:** `mapbox://styles/mapbox/streets-v12`.
**Default Center:** Calgary `[ -114.0719, 51.0447 ]`.

### Map Elements

1. **Crew Marker**
   - Custom HTML element (`truck-marker` CSS class).
   - Rotated by `liveHeading` degrees.
   - Centered on `crewPos`.

2. **Job Markers**
   - Numbered circular markers (`1`, `2`, `3`, ...).
   - Placed at geocoded coordinates.
   - Numbers match the order shown in the bottom sheet.

3. **Route Line**
   - Fetched from Mapbox Directions API.
   - Orange (`#f97316`) 5px line.
   - `overview=full`, `geometries=geojson`.
   - Includes `steps=true`, `voice_instructions=true`, `annotations=duration,distance,speed`.
   - `alternatives=true` for alternative routes.

4. **Camera**
   - When `crewPos` is known, centers on crew.
   - When `jobCoords` are known, fits bounds to include crew + all jobs.
   - Follows the crew in top-view with rotation.

### Directions API Request

**Parameters used:**
- `profile`: `mapbox/driving`
- `coordinates`: `[crewLng, crewLat];[jobLng, jobLat]`
- `overview=full`
- `geometries=geojson`
- `steps=true`
- `voice_instructions=true`
- `annotations=duration,distance,speed`
- `alternatives=true`
- `language=en`

### Turn-by-Turn Instruction Panel

**Displayed:**
- Maneuver text (e.g., "Turn right onto 17 Ave SW").
- Distance to next maneuver.
- Current speed (km/h from GPS).
- Speed limit (from Mapbox annotations).
- Voice toggle (mute/unmute).
- Support button (dials `(587) 325-0751`).

**Voice Guidance:**
- Uses `window.speechSynthesis` and `SpeechSynthesisUtterance`.
- Speaks the next maneuver text when it changes.
- Only speaks if `voiceEnabled` is true and page is visible (`document.visibilityState === 'visible'`).
- Uses `speechSynthesis.cancel()` to stop previous utterance.

### Off-Route Rerouting

- Computes distance from current position to the route polyline.
- If distance > 120 meters for two consecutive checks, it fetches a new route from the current position.
- Prevents excessive rerouting by checking time since last reroute.

### Speed Limit Warning

- If `liveSpeedKmh > speed_limit + 10`, a warning is shown.
- Uses `speed` annotation from Mapbox Directions.
- If no speed limit data, warning is not shown.

### Alternative Routes

- When `alternatives` are returned, badges are shown with route summaries.
- Tapping a badge switches the active route.
- Only the active route is highlighted; alternatives are gray.

---

## 31. Push Notifications in Detail

### Subscription Flow

1. `PWARegister` mounts on a portal page.
2. Registers service worker at `/sw.js`.
3. After 2 seconds, calls `requestPermissionAndSubscribe()`.
4. `Notification.requestPermission()` is called.
5. If granted, `PushManager.subscribe()` is called with VAPID key.
6. Subscription object is POSTed to `/api/employee/push-subscribe`.
7. Server stores endpoint in `push_subscriptions`.

### Sending Notifications

**Admin sends:**
- `POST /api/admin/crew/push` with `{ target: 'all' | 'individual', title, body, url }`.
- `lib/pushNotifications.js` uses `web-push` with VAPID keys.
- For each subscription, sends a payload.
- Expired subscriptions (HTTP 410/404) are removed from `push_subscriptions`.

### Payload Format

```json
{
  "title": "New Job",
  "body": "You have a new assignment for tomorrow.",
  "url": "/portal/schedule",
  "actions": []
}
```

### What Triggers Push Notifications

- New crew assignment created (`/api/admin/crew/assignments` POST).
- Admin broadcast (`/api/admin/crew/push` POST).
- Some server-side events (e.g., job status changes) may also trigger pushes through `sendPushToEmployee`.

### Notification Click

- Service worker receives `notificationclick`.
- Focuses existing window or opens `/portal/schedule` (or provided URL).

---

## 32. Schedule Page Deep Dive

### Header / Glass Bar

**Left side:**
- Crew name and status dot.
- Date in `MMMM d, yyyy` format.

**Right side:**
- Offline badge (when `!isOnline`).
- Notifications button with badge (unread count).
- Clock button → `/portal/clock`.
- Documents button → `/portal/documents`.
- Paystubs button → `/portal/paystubs`.
- Incidents button → `/portal/incidents`.
- Logout button → calls `/api/employee/logout`, redirects to `/portal`.

### Bottom Sheet

**Three snap states:**
- `collapsed` — only drag handle and ETA pill visible.
- `half` — shows assignments and first few job cards.
- `full` — shows full list and weekly view toggle.

**Drag logic:**
- Pointer events (mouse/touch) on the drag handle.
- `handleDragStart`, `handleDragMove`, `handleDragEnd`.
- Snap to nearest threshold based on `dragY`.

### Today View

- Assignment card (U-Haul pickup location, partner info).
- Truck check buttons (pickup/return).
- Job cards sorted by `job_time` then `created_at`.
- Each job card:
  - Number badge (1, 2, 3...)
  - Customer name and status pill
  - Address and phone link
  - Time slot and load size
  - Price
  - Items list (expandable)
  - Notes (expandable)
  - Live timer (if `in_progress`)
  - Start/End Job button
  - View Details button

### Weekly View

- 7-day horizontal scroll.
- Each day: day name, date, job count.
- Today highlighted with orange left border.
- Past days without jobs dimmed.
- Tap a day to load that day's schedule.

### Job Card Actions

**Start Job:**
- Calls `/api/employee/job-clock` with `action='in'`.
- Sets `busy` state to the booking ID.
- On success, refetches schedule.

**End Job:**
- Calls `/api/employee/job-clock` with `action='out'`.
- On success, refetches schedule.
- If no more jobs, shows EOD celebration.

**View Details:**
- Navigates to `/portal/job?booking_id=...`.

### Live Timer

- For `in_progress` jobs, computes elapsed time from `clock_in_at` to `now`.
- Updates every second.

### End of Day (EOD) Celebration

- Triggered when all `bookings` have `crew_status` in `['awaiting_payment', 'complete', 'completed']`.
- Shows a success overlay with confetti.
- Title: "All done!".
- Close button returns to schedule.

### Location Permission

- `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
- Sends `POST /api/employee/location` every 30 seconds.
- If permission denied, shows location-denied screen with iPhone/Android instructions.
- User must enable location and tap "Try again".

### Online / Offline

- Listens to `window.online` and `window.offline` events.
- `isOnline` state shown in header as "OFFLINE" badge when offline.
- Map and route still display cached data; API calls will fail until online.

---

## 33. Job Page Deep Dive

### URL Parameters

- `booking_id` (required) — loads the booking.
- `check=pickup` — shows truck pickup check.
- `check=return` — shows truck return check.

### Step Determination

Based on `booking.crew_status`:
- `scheduled` → Step 0
- `en_route` → Step 0
- `arrived` → Step 1
- `in_progress` → Step 1
- `awaiting_payment` or `complete` → Step 6
- `payment_link_sent` → Step 2

### Step 0: En Route

- Shows list of `itemized_items`.
- "DONATE" tag for items with `is_donate=true`.
- "FREON" tag for items with `is_freon=true`.
- "Mark En Route" button calls `/api/employee/job-clock` with `action='in'`.
- Moves to Step 1.

### Step 1: Arrived / Item Conditions

- Shows load size and itemized items.
- Each item has Good / Damaged / Missing buttons.
- Damaged reveals a note input.
- "Confirm & Continue" disabled until all items have a condition.
- Calls `/api/crew/item-conditions`.
- Moves to Step 2.

### Step 2: Payment

- Payment method toggle: Card / Cash.
- "Amount confirmed" input (defaults to `booking.total_price`).
- "Resend payment link" calls `/api/crew/resend-payment-link`.
- For Card, customer pays via link; crew confirms amount.
- For Cash, crew collects cash and confirms amount.
- "Confirm Payment" moves to Step 3.

### Step 3: Load Truck

- Shows itemized items with checkboxes.
- "Load Confirmed" disabled until all items checked.
- Moves to Step 4.

### Step 4: Route Decision

- Fetches landfill recommendation (`/api/employee/landfill?lat=&lng=`).
- Fetches storage facilities (`/api/employee/storage-drop`).
- Shows landfill card with distance and directions link.
- Shows storage facility count.
- "Continue to Drop Flow" moves to Step 5.

### Step 5: Drop Flow

- Storage facility dropdown.
- Multiple item photo captures (stored as base64 data URLs).
- Capacity photo capture.
- Capacity estimate percentage input.
- "Record Drop" calls `/api/employee/storage-drop`.
- "No storage drop — landfill only" skips to Step 6.

### Step 6: Signature

- Customer name input.
- Crew name display.
- Amount confirmed input.
- Signature canvas (draw with mouse/touch).
- "Clear" button resets canvas.
- "Complete Job" calls `/api/employee/signature`.
- On success, shows success overlay and `jobComplete=true`.

### EOD / Truck Check

- `check=pickup` or `check=return`.
- Dashboard photo capture.
- Odometer input (km).
- Fuel level selector: Empty, 1/4, 1/2, 3/4, Full.
- For return: gas receipt photo + amount, dump receipt photo + amount.
- "Submit Return Check" calls `/api/employee/truck-check` and `/api/employee/receipts`.
- Returns to `/portal/schedule`.

### Issue Flag Overlay

- Triggered from top-right flag button on any step.
- Issue type: access, damage, safety, customer, vehicle, other.
- Severity: low, medium, high.
- Description textarea.
- "Report Issue" calls `/api/employee/issues`.
- Vibration feedback on submit.

---

## 34. Operations & Field Features

### Truck Checks (`/api/employee/truck-check`)

**Pickup Check:**
- Dashboard photo.
- Odometer reading.
- Fuel level.
- Truck photos.
- Damage notes.

**Return Check:**
- Dashboard photo.
- Odometer reading.
- Fuel level.
- Gas receipt + amount.
- Dump receipt + amount.
- Damage notes.

**Database:** `truck_checks` table.

### Receipts (`/api/employee/receipts`)

**Types:** `gas`, `dump`, `uhaul`, `other`.
**Fields:** `assignment_id`, `receipt_type`, `vendor`, `amount_cad`, `receipt_photo_url`, `notes`.
**Database:** `transaction_receipts` table.

### Storage Drops (`/api/employee/storage-drop`)

**Flow:**
1. Crew selects storage facility from dropdown.
2. Takes photos of items being stored.
3. Takes photo of storage unit capacity.
4. Estimates capacity percentage used.
5. Submits to `/api/employee/storage-drop`.
6. Server creates `storage_drops` record and updates `storage_facilities.current_usage_pct`.

**Database:** `storage_drops`, `storage_facilities`.

### Donation Centers (`/api/employee/donation-centers`)

- Admin CRUD at `/api/admin/crew/donation-centers`.
- Crew app can view donation centers for donation runs.
- **Database:** `donation_centers`.

### Landfills (`/api/employee/landfill`)

- Server filters by `day_of_week` and season.
- Sunday: East Calgary landfill only (April–October).
- Calculates distance using Haversine formula.
- Returns recommended landfill, all options, and warnings.
- **Database:** `landfills`.

### Customer Signature (`/api/employee/signature`)

- Captures customer name (typed) and drawn signature.
- Confirms payment amount.
- Updates `bookings.payment_status` and `status`.
- Creates `customer_signatures` record.
- If paid, sends review request SMS.

### Customer Tracking (Public)

- `/track/[token]` is a public tracking page.
- Uses `booking.tracking_token`.
- Calls `/api/employee/location?booking_id=...` to get crew location.
- Shows "en route" if location updated within 5 minutes.
- Shows crew first names and selfies.

### Incident Reports (`/api/employee/incidents`)

- Types: `injury`, `vehicle_accident`, `property_damage`, `near_miss`, `safety_hazard`, `other`.
- Severity: `low`, `medium`, `high`, `critical`.
- Creates `incident_reports` and `crew_notifications`.

### Job Issues (`/api/employee/issues`)

- Types: `access`, `damage`, `safety`, `customer`, `vehicle`, `other`.
- Severity: `low`, `medium`, `high`.
- Creates `job_issues` and `crew_notifications`.

### Notifications (`/api/employee/notifications`)

- In-app notifications for crew.
- Types: `info`, `warning`, `success`, `assignment`, `broadcast`.
- Unread dot, mark all read, deep links.
- Polled every 30 seconds.

---

## 35. Payroll & Financial Features

### Pay Rate

- Stored in `employees.pay_rate` (hourly CAD).
- Default from `system_config.default_pay_rate`.

### Shift Calculation

- `calcShiftGross` in `lib/payroll.js`:
  - Regular hours: hours up to 8/day or 44/week, whichever gives less OT.
  - Overtime hours: 1.5× rate for hours >8/day or >44/week.
  - 3-hour minimum for short shifts.
  - Vacation pay: 4% of gross.

### Paycheque Calculation

- `calculatePaycheque` in `lib/payroll.js`:
  - CPP (first additional + CPP2).
  - EI premiums.
  - Federal income tax (CRA T4127 Steps 1-3).
  - Alberta income tax (CRA T4127 Steps 4-5).
  - YTD caps for CPP, CPP2, EI.

### Pay Stubs

- Stored in `pay_stubs` table.
- `pay_run_id` groups multiple pay stubs.
- Status: `pending`, `sent`, `failed`.
- Crew views in `/portal/paystubs`.

### Admin Payroll

- `/api/admin/payroll/preview` — preview payroll for a period.
- `/api/admin/payroll/run` — creates pay run and pay stubs.
- `/api/admin/payroll/approve` — approves pay run for payment.
- `/api/admin/t4s` — generates T4s.
- `/api/admin/remittance` — CRA remittance summary.

### Direct Deposit / Remittance

- `direct_deposits` table tracks bank transfer status.
- `remittances` table tracks CRA remittance amounts (CPP, EI, tax).

---

## 36. Growth Engine (Opportunistic Pickups)

### `/api/crew/nearby-opportunities`

**Inputs:** `lat`, `lng`, `truck_fill`, `bookings_today`, `hour`.
**Sources:**
1. `waitlist` entries within 3km.
2. Future `bookings` within 3km.
3. `leads` (quoted but unbooked) within 3km.

**Logic:**
- Computes truck fill from today's jobs.
- Applies discount curve based on truck fill, detour distance, hour of day, and bookings today.
- Ranks by profitability score.
- Returns deadhead leads first, then by distance.

### `/api/crew/offer-nearby`

**Types:** `waitlist`, `future_booking`, `deadhead`.
**Flow:**
1. Creates `nearby_offers` record with 5-minute expiry.
2. Sends SMS to customer with offer details.
3. Marks `waitlist` entry as `offered_today` or `leads` with 24-hour cooldown.

---

## 37. System Config / Kill Switches

The `system_config` table contains runtime toggles. Crew-relevant keys include:

- `default_pay_rate`
- `storage_facility_id`
- `donation_center_id`
- `uhaul_tank_capacity_litres`
- `oilpriceapi_key`
- `kill_switch_*` flags for various features

### Kill Switches (sample)

- `kill_switch_ai_narrator`
- `kill_switch_ai_agent`
- `kill_switch_lead_followup`
- `kill_switch_review_requests_edge`
- `kill_switch_risk_reminders`
- `kill_switch_day_summary`
- `kill_switch_generate_slots`
- Many pricing/surge/discount kill switches

**Usage:** Admin toggles these in the control center to disable features without deploying code.

---

## 38. Cron Jobs (Relevant to Crew)

- `crew-location-cleanup` — hourly cleanup of old `crew_location` records.
- `abandonment-followup` — follows up abandoned leads.
- `opportunistic-offer-live` / `opportunistic-offer-proactive` — sends nearby offers.
- `review-request` — sends review requests after completed jobs.
- `demand-snapshot` — every 6 hours, records slot fill rates for surge pricing.
- `ai-narrator` — refreshes AI briefings.

---

## 39. Admin Dashboard Integration

### Crew List (`/admin` → Crew tab)

- Calls `/api/admin/crew` (GET).
- Shows all employees, clock status, onboarding progress, hours, pending invites.
- Actions: invite, approve/reject, resend invite, edit, terminate.

### Employee Detail

- Calls `/api/admin/crew/[id]` (GET).
- Shows full profile, documents, invite, sessions, assignments.
- Admin can verify/reject documents.

### Crew Assignments

- Calls `/api/admin/crew/assignments`.
- Schedule who works which day.
- Assigns driver and secondary crew.
- Sets U-Haul pickup location.

### Push Notifications

- Calls `/api/admin/crew/push`.
- Broadcast or individual push.

### Payroll Panel

- Calls `/api/admin/payroll/*`, `/api/admin/t4s`, `/api/admin/remittance`.
- Preview, run, approve payroll.
- Generate T4s.
- View remittance.

### Command Center

- Calls `/api/admin/command-center`.
- Shows live crew status, job photos, dispatch actions.
- Mark arrived, upload crew photos, get job photos.

---

## 40. Every Little Detail

### Login / Signup

- The `/portal` page is both login and signup.
- Mode toggle persists in component state.
- Auto-redirect to onboarding if `jh-onboard-token` exists in `localStorage`.
- Password visibility toggle? Not in current code; password is type="password".
- Address autocomplete uses the `AddressAutocomplete` component (presumably Mapbox or similar).

### Onboarding

- Invite email is sent via Resend.
- Link expires in 7 days.
- Employee can resume from the first incomplete step.
- Documents are stored in Supabase Storage `employee-documents` bucket.
- Selfie is stored in `crew-photos` bucket.
- Driver's license OCR extracts DOB, expiry, license number, province.
- TD1 forms are stored as JSON in `employees.td1_federal_data` and `td1_ab_data`.
- Contract is stored in `employees.contract_data`.
- Banking is encrypted and stored as `employee_documents` with `doc_type='banking_info'`.
- Acknowledgments are stored in `employees.acknowledgments`.
- On completion, status is `pending_verification`.
- Admin approves → `active`.

### Schedule

- Map is interactive with pinch zoom, pan, rotate.
- Crew marker rotates with heading.
- Route line is orange.
- Job markers are numbered.
- Bottom sheet is draggable.
- Today/Week toggle.
- Weekly view shows 7 days.
- Assignment card shows U-Haul pickup location.
- Partner info with call button.
- Truck check buttons for pickup/return.
- Job cards show status, price, time, load size.
- Items and notes are expandable.
- Live timer for in-progress jobs.
- Start/End buttons.
- View Details navigates to job page.
- EOD celebration when all done.
- Location permission gate.
- Offline badge.
- Logout.

### Job Execution

- 7 steps + EOD.
- En Route → Arrived → Payment → Load → Route → Drop → Signature.
- EOD for truck return.
- Issue flag available on any step.
- Item conditions (good/damaged/missing).
- Payment method (card/cash).
- Resend payment link.
- Load checklist.
- Landfill recommendation.
- Storage drop with photos and capacity.
- Customer signature.
- Truck return with odometer, fuel, gas, dump receipts.

### Clock

- Shows live shift duration.
- Pay period summary.
- Clock is automatic via job clock.
- Manual clock-in/out also possible via `/api/employee/clock-in` and `/api/employee/clock-out`.

### Documents

- Lists all onboarding documents.
- Shows status (verified/uploaded/rejected/pending).
- Shows expiry dates.
- Reupload rejected docs.
- View rejection reasons.

### Paystubs

- List of pay stubs.
- Expand for full breakdown.
- Earnings, deductions, net pay, YTD.

### Notifications

- In-app list.
- Unread dot.
- Mark all read.
- Deep links.
- Push notifications.

### Incidents

- Report incidents.
- View history.
- Severity levels.
- Status tracking.

### Verification

- Pending approval screen.
- Polls every 10 seconds.
- Auto-redirect when approved.
- Rejected state with phone number.

### Reset Password

- Token-based.
- Validates token.
- Sets new password.
- Invalid/expired states.

---

## 41. Files & Assets

### Public Assets (PWA)
- `/public/manifest.json` — PWA manifest.
- `/public/sw.js` — service worker.
- `/public/icon-192.png` — app icon.
- `/public/icon-512.png` — app icon.
- `/public/crew-logo.png` — crew logo.
- `/public/apple-touch-icon.png` — iOS icon.
- `/public/favicon-32.png` — favicon.

### Portal Components
- `app/portal/page.js` — login/signup.
- `app/portal/onboard/page.js` — onboarding.
- `app/portal/verification/page.js` — verification pending.
- `app/portal/schedule/page.js` — schedule dashboard.
- `app/portal/job/page.js` — job execution.
- `app/portal/clock/page.js` — shift status.
- `app/portal/documents/page.js` — document viewing.
- `app/portal/paystubs/page.js` — pay stubs.
- `app/portal/notifications/page.js` — notifications.
- `app/portal/incidents/page.js` — incidents.
- `app/portal/reset-password/page.js` — password reset.
- `app/portal/layout.js` — force light theme.

### Shared Components
- `components/PWARegister.js` — PWA registration, iOS prompt, push subscription.
- `components/portal/DocumentScanner.js` — document upload UI.
- `components/portal/SelfieCapture.js` — selfie upload UI.

### Libraries
- `lib/employeeAuth.js` — auth, encryption, session.
- `lib/payroll.js` — payroll calculations.
- `lib/pushNotifications.js` — push sending.
- `lib/offlineQueue.js` — offline action queue.

---

## 42. Current Known Flows

### New Crew Member Flow
1. Admin invites via `/api/admin/crew` POST.
2. Employee receives email with `/portal/onboard?token=...`.
3. Employee creates password, uploads docs, fills TD1, signs contract, enters banking, accepts acknowledgments.
4. Employee lands on `/portal/verification`.
5. Admin approves via `/api/admin/crew/[id]/approve`.
6. Employee auto-redirects to `/portal/schedule`.

### Daily Work Flow
1. Employee logs in at `/portal`.
2. Redirected to `/portal/schedule`.
3. Allows location permission.
4. Sees assignment and jobs.
5. Taps "Start Job" on first job.
6. Navigates to job using in-app Mapbox navigation.
7. Marks arrived, verifies item conditions.
8. Handles payment.
9. Loads truck.
10. Goes to landfill/storage.
11. Records storage drop if applicable.
12. Gets customer signature.
13. Returns to schedule.
14. At end of day, submits truck return check.

### Clock Flow
1. Job clock `in` auto-creates a `timesheets` shift.
2. Job clock `out` ends the job session.
3. Last job clock `out` auto-clocks out the shift.
4. `timesheets` row has regular/overtime hours and gross pay.

### Payroll Flow
1. Admin runs payroll preview.
2. Admin runs payroll.
3. `pay_runs` and `pay_stubs` records created.
4. Pay stubs appear in `/portal/paystubs`.
5. Admin can generate T4s and remittance.

---

---

## 43. Detailed API Reference (Crew & Admin Routes)

# API Documentation: Crew and Admin Routes

## Crew API Routes (`/tmp/Junkhaul/app/api/crew/`)

### POST `/api/crew/arrived`
**File:** `/tmp/Junkhaul/app/api/crew/arrived/route.js`

**Business Logic:**
- Crew marks they have arrived at the job site
- Updates booking's `crew_status` to 'arrived' and sets `crew_arrived_at` timestamp
- Sends SMS notification to customer confirming crew arrival

**Request Body:**
```json
{
  "booking_id": "string (required)"
}
```

**Database Tables:**
- `bookings` - read and update

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates `booking_id` is present
- Returns 404 if booking not found

---

### GET `/api/crew/balance-payment/[booking_id]`
**File:** `/tmp/Junkhaul/app/api/crew/balance-payment/[booking_id]/route.js`

**Business Logic:**
- Returns balance payment information for customer-facing payment page
- If booking is already paid, returns payment status
- If unpaid, creates or retrieves Stripe PaymentIntent for balance payment
- Generates 1-year signed URL for payment

**Request Params:**
- `booking_id` (path parameter)

**Database Tables:**
- `bookings` - read and update

**External APIs:**
- Stripe PaymentIntents API

**Response Format (if unpaid):**
```json
{
  "paid": false,
  "clientSecret": "pi_...",
  "booking": {
    "booking_ref": "string",
    "name": "string",
    "address": "string",
    "job_date": "string",
    "job_time": "string",
    "total": number,
    "deposit_paid": number,
    "balance_due": number,
    "email": "string"
  }
}
```

**Response Format (if paid):**
```json
{
  "paid": true,
  "payment_status": "string",
  "booking": { ... }
}
```

**Validation/Auth:**
- No authentication required (public via booking UUID)
- Returns 404 if booking not found

---

### POST `/api/crew/balance-payment/[booking_id]`
**File:** `/tmp/Junkhaul/app/api/crew/balance-payment/[booking_id]/route.js`

**Business Logic:**
- Allows customer to declare cash payment on the payment page
- Updates booking payment status to 'cash_declared'

**Request Params:**
- `booking_id` (path parameter)

**Request Body:**
```json
{
  "action": "declare_cash"
}
```

**Database Tables:**
- `bookings` - update

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- No authentication required
- Returns 400 if action is not 'declare_cash'

---

### POST `/api/crew/clock-off`
**File:** `/tmp/Junkhaul/app/api/crew/clock-off/route.js`

**Business Logic:**
- Ends the tracking session and logs end of day
- Clears the active booking on the crew_location row
- Stops GPS tracking for the session

**Request Body:**
- None required

**Database Tables:**
- `crew_location` - read and update

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`

---

### POST `/api/crew/collect-payment`
**File:** `/tmp/Junkhaul/app/api/crew/collect-payment/route.js`

**Business Logic:**
- Records cash payment collected by crew on-site
- Only handles 'cash_crew' method (digital payments go through /pay/[booking_id])
- Validates amount matches balance_due
- Updates booking status to 'completed' and payment status to 'cash_crew'
- Sends SMS receipt confirmation to customer
- Triggers referral fulfillment if booking has referral code

**Request Body:**
```json
{
  "booking_id": "string (required)",
  "method": "cash_crew (required)",
  "amount": "number (required)"
}
```

**Database Tables:**
- `bookings` - read and update

**External APIs:**
- `/api/referral` (internal) - for referral fulfillment

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id, method, and amount are present
- Validates method is 'cash_crew'
- Validates amount matches balance_due
- Returns 404 if booking not found

---

### POST `/api/crew/complete-job`
**File:** `/tmp/Junkhaul/app/api/crew/complete-job/route.js`

**Business Logic:**
- Marks job as complete after completion photos are uploaded
- Requires at least 3 completion photos
- Sets crew_status to 'awaiting_payment' if unpaid, or 'complete' if paid
- If paid, sends review request SMS with tracking link
- Triggers referral fulfillment if booking has referral code

**Request Body:**
```json
{
  "booking_id": "string (required)"
}
```

**Database Tables:**
- `bookings` - read and update
- `events` - insert (for timeline logging)

**External APIs:**
- `/api/referral` (internal) - for referral fulfillment

**Response Format:**
```json
{
  "ok": true,
  "crew_status": "awaiting_payment" | "complete"
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id is present
- Validates at least 3 completion photos exist
- Returns 404 if booking not found

---

### POST `/api/crew/en-route`
**File:** `/tmp/Junkhaul/app/api/crew/en-route/route.js`

**Business Logic:**
- Crew marks they are heading to the job
- Generates a unique `tracking_session_id`
- Updates booking's crew_status to 'en_route' and sets `en_route_at` timestamp
- Sends customer SMS with live tracking link and ETA

**Request Body:**
```json
{
  "booking_id": "string (required)"
}
```

**Database Tables:**
- `bookings` - read and update

**Response Format:**
```json
{
  "tracking_session_id": "ts_bookingId_timestamp"
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id is present
- Returns 404 if booking not found

---

### POST `/api/crew/item-conditions`
**File:** `/tmp/Junkhaul/app/api/crew/item-conditions/route.js`

**Business Logic:**
- Saves crew-verified item conditions (good/damaged/missing) upon arrival
- Merges conditions into existing itemized_items array
- Attaches condition and notes to each item
- Logs item check to events timeline

**Request Body:**
```json
{
  "booking_id": "string (required)",
  "conditions": {
    "0": "good" | "damaged" | "missing",
    "0_note": "optional note",
    "1": "good",
    ...
  }
}
```

**Database Tables:**
- `bookings` - read and update
- `events` - insert (for timeline logging)

**Response Format:**
```json
{
  "ok": true,
  "summary": "Crew verified X items, Y damaged, Z missing"
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id and conditions are present
- Returns 404 if booking not found

---

### GET `/api/crew/jobs`
**File:** `/tmp/Junkhaul/app/api/crew/jobs/route.js`

**Business Logic:**
- Returns today's jobs in optimized route order
- Separates incomplete jobs (to be optimized) from completed jobs
- Computes day statistics (total jobs, completed, remaining, payment totals)
- Uses route optimization library for incomplete jobs

**Query Params:**
- None

**Database Tables:**
- `bookings` - read

**External Libraries:**
- `@/lib/route` - optimiseRoute function
- `@/lib/dates` - edmontonNowParts function

**Response Format:**
```json
{
  "jobs": [
    {
      // booking objects in optimized order
    }
  ],
  "stats": {
    "total_jobs": number,
    "completed": number,
    "remaining": number,
    "expected_total": number,
    "collected_total": number,
    "collected_cash": number,
    "collected_card": number
  }
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`

---

### POST `/api/crew/location`
**File:** `/tmp/Junkhaul/app/api/crew/location/route.js`

**Business Logic:**
- Updates crew GPS position for live tracking
- Upserts location by tracking_session_id
- Stores coordinates, heading, speed, accuracy, and active booking

**Request Body:**
```json
{
  "latitude": "number (required)",
  "longitude": "number (required)",
  "heading": "number (optional)",
  "speed_kmh": "number (optional)",
  "accuracy_meters": "number (optional)",
  "active_booking_id": "string (optional)",
  "tracking_session_id": "string (required)"
}
```

**Database Tables:**
- `crew_location` - upsert

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates latitude, longitude, and tracking_session_id are present
- Validates lat/lng are numbers

---

### GET `/api/crew/nearby-opportunities`
**File:** `/tmp/Junkhaul/app/api/crew/nearby-opportunities/route.js`

**Business Logic:**
- Finds nearby opportunities within 3km of crew's current position
- Queries three sources:
  1. Waitlist entries (not offered today, not converted)
  2. Future-day confirmed bookings (not opportunistic)
  3. Quoted-but-unbooked leads (not on cooldown)
- Computes truck fill percentage from today's jobs
- For leads, calculates discounted prices using discount engine
- Ranks leads by profitability score
- Returns sorted opportunities (deadhead leads first by profitability, then others by distance)

**Query Params:**
- None

**Database Tables:**
- `crew_location` - read (for crew position)
- `waitlist` - read
- `bookings` - read (future bookings and today's jobs)
- `leads` - read

**External Libraries:**
- `@/lib/discountEngine` - computeTruckFill, computeDiscountedPrice, rankLeads
- `@/lib/dates` - edmontonNowParts

**Response Format:**
```json
{
  "opportunities": [
    {
      "waitlist_id": "string | null",
      "booking_id": "string | null",
      "lead_id": "string | null",
      "customer_type": "waitlist" | "future_booking" | "lead",
      "name": "string",
      "phone": "string",
      "address": "string",
      "lat": number,
      "lng": number,
      "distance_km": number,
      "load_size": "string",
      "joined_at": "string (ISO date)",
      "offer_type": "waitlist" | "future_booking" | "deadhead",
      "truck_fill_pct": number,
      // For leads only:
      "original_price": number,
      "discounted_price": number,
      "discount_percent": number,
      "savings": number,
      "profitability_score": number
    }
  ],
  "truck_fill": {
    "fillPct": number,
    "totalVolume": number,
    "usedVolume": number
  }
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Returns empty opportunities array if no crew location found

---

### POST `/api/crew/offer-nearby`
**File:** `/tmp/Junkhaul/app/api/crew/offer-nearby/route.js`

**Business Logic:**
- Sends opportunistic pickup offer SMS to nearby customer
- Creates nearby_offers record with 5-minute expiry
- Supports three customer types: waitlist, future booking, or lead
- For waitlist: marks as offered_today
- For leads: sets opportunistic_offer_sent and 24-hour cooldown
- Sends different SMS message for deadhead-discount leads (shows savings)

**Request Body:**
```json
{
  "booking_id": "string (optional)",
  "waitlist_id": "string (optional)",
  "lead_id": "string (optional)",
  "distance_km": "number (optional, for SMS)",
  "original_price": "number (optional, for leads)",
  "discounted_price": "number (optional, for leads)",
  "discount_percent": "number (optional, for leads)"
}
```
*(One of booking_id, waitlist_id, or lead_id is required)*

**Database Tables:**
- `bookings` - read (for future bookings)
- `waitlist` - read and update
- `leads` - read and update
- `nearby_offers` - insert

**Response Format:**
```json
{
  "offer_id": "string"
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates at least one of booking_id, waitlist_id, or lead_id is present
- Returns 404 if customer not found
- Returns 500 if SMS fails

---

### GET `/api/crew/photos/[booking_id]`
**File:** `/tmp/Junkhaul/app/api/crew/photos/[booking_id]/route.js`

**Business Logic:**
- Returns crew photos for customer photo viewer page
- Public endpoint accessible via booking UUID

**Request Params:**
- `booking_id` (path parameter)

**Database Tables:**
- `bookings` - read

**Response Format:**
```json
{
  "photos": [
    {
      "url": "string",
      "type": "arrival" | "completion",
      "taken_at": "string (ISO date)",
      "lat": number,
      "lng": number
    }
  ]
}
```

**Validation/Auth:**
- No authentication required (public via booking UUID)
- Returns 404 if booking not found

---

### POST `/api/crew/resend-payment-link`
**File:** `/tmp/Junkhaul/app/api/crew/resend-payment-link/route.js`

**Business Logic:**
- Sends customer an SMS with link to payment page
- Allows customer to pay on their own device
- Includes balance due amount in SMS

**Request Body:**
```json
{
  "booking_id": "string (required)"
}
```

**Database Tables:**
- `bookings` - read

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id is present
- Returns 404 if booking not found
- Returns 500 if SMS fails

---

### GET `/api/crew/route`
**File:** `/tmp/Junkhaul/app/api/crew/route/route.js`

**Business Logic:**
- Returns driving route geometry and navigation details
- Calls Mapbox Directions API for route calculation
- Returns GeoJSON LineString, distance, duration, ETA, and turn-by-turn steps

**Query Params:**
- `from` (required): "lat,lng" format
- `to` (required): booking_id

**Database Tables:**
- `bookings` - read (for destination coordinates)

**External APIs:**
- Mapbox Directions API v5

**Response Format:**
```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [[lng, lat], ...]
  },
  "distance_meters": number,
  "duration_seconds": number,
  "eta_minutes": number,
  "steps": [
    {
      // Mapbox step objects with voice instructions
    }
  ],
  "destination": {
    "name": "string",
    "address": "string",
    "lat": number,
    "lng": number
  }
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates from and to parameters are present
- Returns 404 if booking not found
- Returns 400 if booking has no coordinates
- Returns 502 if Mapbox API fails

---

### POST `/api/crew/start-job`
**File:** `/tmp/Junkhaul/app/api/crew/start-job/route.js`

**Business Logic:**
- Marks job as in_progress after arrival photos are uploaded
- Requires at least 3 arrival photos
- Updates crew_status to 'in_progress' and sets job_started_at timestamp
- Sends customer SMS with link to view pre-job photos

**Request Body:**
```json
{
  "booking_id": "string (required)"
}
```

**Database Tables:**
- `bookings` - read and update

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id is present
- Validates at least 3 arrival photos exist
- Returns 404 if booking not found

---

### GET `/api/crew/track/[booking_id]`
**File:** `/tmp/Junkhaul/app/api/crew/track/[booking_id]/route.js`

**Business Logic:**
- Returns booking details and latest crew location for customer tracking page
- Public endpoint accessible via booking UUID
- Fetches crew location filtered by active_booking_id

**Request Params:**
- `booking_id` (path parameter)

**Database Tables:**
- `bookings` - read
- `crew_location` - read

**Response Format:**
```json
{
  "booking": {
    "id": "string",
    "name": "string",
    "address": "string",
    "lat": number,
    "lng": number,
    "crew_status": "string",
    "job_time": "string",
    "job_date": "string"
  },
  "crew_location": {
    "latitude": number,
    "longitude": number,
    "heading": number,
    "speed_kmh": number,
    "updated_at": "string (ISO date)"
  } | null
}
```

**Validation/Auth:**
- No authentication required (public via booking UUID)
- Returns 404 if booking not found

---

### POST `/api/crew/upload-photo`
**File:** `/tmp/Junkhaul/app/api/crew/upload-photo/route.js`

**Business Logic:**
- Uploads crew photo to Supabase Storage
- Accepts multipart/form-data with photo file and metadata
- Generates 1-year signed URL for legal protection
- Appends photo metadata to booking's crew_photos JSONB array

**Request Body (multipart/form-data):**
- `booking_id` (required)
- `type` (required): 'arrival' or 'completion'
- `lat` (optional)
- `lng` (optional)
- `taken_at` (optional)
- `photo` (required): file

**Database Tables:**
- `bookings` - read and update

**Storage:**
- Supabase Storage bucket: 'job-photos'
- Path: `crew/{booking_id}/{type}_{timestamp}.jpg`

**Response Format:**
```json
{
  "url": "string (signed URL)"
}
```

**Validation/Auth:**
- Requires crew authentication via `crewAuth()`
- Validates booking_id, type, and photo are present
- Validates type is 'arrival' or 'completion'
- Returns 500 if upload or URL generation fails

---

### POST `/api/crew/verify-pin`
**File:** `/tmp/Junkhaul/app/api/crew/verify-pin/route.js`

**Business Logic:**
- Verifies crew PIN hash for authentication
- App hashes 4-digit PIN with SHA-256 locally and sends hash
- Server compares with constant-time comparison

**Request Body:**
```json
{
  "pin_hash": "string (required)"
}
```

**Database Tables:**
- None (uses constant comparison)

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- No authentication required (this is the auth endpoint)
- Validates pin_hash is present
- Returns 401 if PIN is invalid

---

## Admin API Routes

### POST `/api/admin/payroll/preview`
**File:** `/tmp/Junkhaul/app/api/admin/payroll/preview/route.js`

**Business Logic:**
- Calculates payroll preview without saving
- Gathers un-paid shifts for a period (shifts with null pay_run_id)
- Aggregates hours and pay per employee
- Calculates full payroll run with deductions (CPP, EI, tax, vacation)
- Returns preview for review before committing

**Request Body:**
```json
{
  "period_start": "string (ISO date, required)",
  "period_end": "string (ISO date, required)",
  "P": "string (optional, default: biweekly)"
}
```

**Database Tables:**
- `timesheets` - read

**External Libraries:**
- `@/lib/payroll` - calculatePayRun, PAY_PERIODS

**Response Format:**
```json
{
  "pay_run": {
    "edition": "string",
    "period_start": "string",
    "period_end": "string",
    "pay_date": "string",
    "stubs": [
      {
        "employee_id": "string",
        "regular_hours": number,
        "overtime_hours": number,
        "total_hours": number,
        "gross_pay": number,
        "cpp": number,
        "cpp2": number,
        "ei": number,
        "fed_tax": number,
        "vacation_pay": number,
        "net_pay": number
      }
    ],
    "totals": {
      "total_gross": number,
      "total_cpp": number,
      "total_cpp2": number,
      "total_ei": number,
      "total_fed_tax": number,
      "total_vacation": number,
      "total_net": number,
      "total_cra_remittance": number,
      "remittance_due_date": "string"
    }
  }
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie
- Validates period_start and period_end are present
- Returns message if no un-paid shifts in period

---

### POST `/api/admin/payroll/run`
**File:** `/tmp/Junkhaul/app/api/admin/payroll/run/route.js`

**Business Logic:**
- Calculates AND persists the pay run and pay stubs
- Marks included shifts as paid (sets pay_run_id)
- Creates pay_run record with status 'calculated'
- Creates pay_stubs records for each employee
- Creates remittance record for CRA payments
- Supports both cron secret (automated) and admin cookie (manual) auth

**Request Body:**
```json
{
  "period_start": "string (ISO date, required)",
  "period_end": "string (ISO date, required)",
  "P": "string (optional, default: biweekly)"
}
```

**Database Tables:**
- `timesheets` - read and update
- `pay_runs` - insert
- `pay_stubs` - insert
- `remittances` - insert

**External Libraries:**
- `@/lib/payroll` - calculatePayRun, PAY_PERIODS
- `@/lib/cronAuth` - checkCronSecret

**Response Format:**
```json
{
  "ok": true,
  "pay_run_id": "string",
  "pay_run": {
    // full pay run object with id
  }
}
```

**Validation/Auth:**
- Requires admin cookie OR cron secret authentication
- Validates period_start and period_end are present
- Returns 400 if no un-paid shifts in period

---

### GET `/api/admin/payroll/approve` (list)
**File:** `/tmp/Junkhaul/app/api/admin/payroll/approve/route.js`

**Business Logic:**
- Lists all pay runs in reverse chronological order
- Returns up to 50 most recent pay runs

**Query Params:**
- None

**Database Tables:**
- `pay_runs` - read

**Response Format:**
```json
{
  "pay_runs": [
    {
      "id": "string",
      "period_start": "string",
      "period_end": "string",
      "status": "calculated" | "approved" | "paid",
      "total_gross": number,
      "total_net": number,
      "created_at": "string",
      // ... other pay run fields
    }
  ]
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie

---

### POST `/api/admin/payroll/approve`
**File:** `/tmp/Junkhaul/app/api/admin/payroll/approve/route.js`

**Business Logic:**
- Approves a calculated pay run
- Updates status to 'approved' with timestamp and approver
- Optionally triggers direct deposit for each pay stub
- If direct deposit configured and successful, updates status to 'paid'
- Requires employee bank account info for direct deposit

**Request Body:**
```json
{
  "pay_run_id": "string (required)",
  "send_direct_deposit": "boolean (optional)"
}
```

**Database Tables:**
- `pay_runs` - read and update
- `pay_stubs` - read
- `employees` - read

**External Libraries:**
- `@/lib/directDeposit` - sendDirectDeposit, isDirectDepositConfigured

**Response Format:**
```json
{
  "ok": true,
  "approved": true,
  "deposits": [
    {
      "employee_id": "string",
      "ok": boolean,
      "error": "string | null"
    }
  ]
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie
- Validates pay_run_id is present
- Returns 404 if pay run not found
- Returns 400 if pay run status is not 'calculated'
- Returns warning if direct deposit not configured

---

### GET `/api/admin/t4s`
**File:** `/tmp/Junkhaul/app/api/admin/t4s/route.js`

**Business Logic:**
- Returns all T4 slips for a specified tax year
- Defaults to previous year if not specified
- Includes employee name and email in response

**Query Params:**
- `year` (optional): defaults to previous calendar year

**Database Tables:**
- `t4_slips` - read with join to employees

**Response Format:**
```json
{
  "t4_slips": [
    {
      "id": "string",
      "tax_year": number,
      "employee_id": "string",
      "income": number,
      "cpp_contributed": number,
      "ei_contributed": number,
      "income_tax_deducted": number,
      "employees": {
        "name": "string",
        "email": "string"
      },
      // ... other T4 fields
    }
  ],
  "tax_year": number
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie

---

### GET `/api/admin/remittance`
**File:** `/tmp/Junkhaul/app/api/admin/remittance/route.js`

**Business Logic:**
- Lists all CRA remittances with pay run information
- Orders by due_date descending
- Calculates total owed amount and count
- Identifies next due remittance

**Query Params:**
- None

**Database Tables:**
- `remittances` - read with join to pay_runs

**Response Format:**
```json
{
  "remittances": [
    {
      "id": "string",
      "pay_run_id": "string",
      "due_date": "string",
      "amount": number,
      "status": "owed" | "paid",
      "paid_at": "string | null",
      "paid_method": "string | null",
      "pay_runs": {
        "period_start": "string",
        "period_end": "string",
        "total_cra_remittance": number,
        "status": "string"
      }
    }
  ],
  "owed_total": number,
  "owed_count": number,
  "next_due": {
    // remittance object or null
  }
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie

---

### POST `/api/admin/remittance`
**File:** `/tmp/Junkhaul/app/api/admin/remittance/route.js`

**Business Logic:**
- Marks a remittance as paid
- Updates status, paid_at timestamp, and payment method

**Request Body:**
```json
{
  "remittance_id": "string (required)",
  "paid_method": "string (optional, default: 'manual')"
}
```

**Database Tables:**
- `remittances` - update

**Response Format:**
```json
{
  "ok": true
}
```

**Validation/Auth:**
- Requires admin authentication via admin cookie
- Returns 500 if update fails

---

## Summary

**Crew Routes (17 files):**
- All crew routes (except public customer-facing endpoints) require `crewAuth()` authentication
- Public endpoints: balance-payment, photos, track (accessible via booking UUID)
- Key workflows: job lifecycle (arrived → start-job → complete-job), payment collection, GPS tracking, photo uploads, nearby opportunities

**Admin Routes (5 files):**
- All admin routes require admin cookie authentication
- Payroll routes also support cron secret for automated runs
- Key workflows: payroll calculation, approval, direct deposit, T4 management, CRA remittance tracking

**Database Tables Used:**
- `bookings` - crew routes
- `crew_location` - crew routes
- `waitlist` - crew routes
- `leads` - crew routes
- `nearby_offers` - crew routes
- `events` - crew routes
- `timesheets` - payroll routes
- `pay_runs` - payroll routes
- `pay_stubs` - payroll routes
- `remittances` - payroll routes
- `t4_slips` - admin routes
- `employees` - payroll routes

---

---

## Crew API Reference

This section documents the crew-facing (`/api/employee/*`) and admin crew-management (`/api/admin/crew/*` and related admin) route handlers used by the Junk Haul crew portal.

### Part 1 — Employee Authentication & Profile

#### `POST /api/employee/login`

**Business Logic:** Authenticates an employee with email and password. Creates a server-side session and returns a `Set-Cookie` header for the portal.

**Request Body:** `{ email: string, password: string }`

**Database Tables Accessed:** `employees` (lookup, status, password_hash), `employee_sessions` (session created via `createSession`)

**Response Format:** `{ employee: { id, email, name, status, onboarding_complete, pending_verification } }` with a `Set-Cookie: employee_session=...` header.

**Validation/Auth:** Email and password are required; status `terminated` returns 403 "Account inactive"; status `rejected` returns 403 with `verification_notes`; invalid credentials return 401.

---

#### `POST /api/employee/logout`

**Business Logic:** Destroys the employee session from the cookie and clears it.

**Request Body:** None (reads request cookie)

**Database Tables Accessed:** `employee_sessions` (deleted by `destroySession`)

**Response Format:** `{ ok: true }` with a cleared `Set-Cookie` header.

**Validation/Auth:** No explicit auth; cookie is parsed and removed if present.

---

#### `GET /api/employee/me`

**Business Logic:** Returns the current employee profile, onboarding checklist, required document list, and uploaded document status.

**Request Body/Query:** None

**Database Tables Accessed:** `employees` (full row), `employee_documents` (doc_type, status, uploaded_at, verified_at)

**Response Format:** `{ employee: { id, email, name, phone, address, status, hire_date, pay_rate, onboarded, pending_verification, onboarding_completed_at, onboarding_step, has_password, selfie_url, td1_federal_done, td1_ab_done, contract_signed, acknowledgments_done, has_banking, has_sin, td1_federal_claim, td1_ab_claim }, documents: [...], onboarding: { complete, required, uploaded, missing }, drive_configured: false }`

**Validation/Auth:** Requires valid employee session (`getAuthedEmployee`). Returns 401 if not logged in.

---

#### `PUT /api/employee/me`

**Business Logic:** Updates employee profile fields. Optionally saves encrypted banking details and advances `onboarding_step` (never backwards).

**Request Body:** `{ phone?, address?, td1_federal_claim?, td1_ab_claim?, onboarding_step?, bank_institution?, bank_transit?, bank_account? }`

**Database Tables Accessed:** `employees`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session. Allowed profile fields are whitelisted; `onboarding_step` is maxed with current value; `bank_account` is encrypted to `bank_account_enc`.

---

#### `POST /api/employee/signup`

**Business Logic:** Creates a new employee account from the legacy self-signup flow. Seeds required document rows and auto-logs the user in.

**Request Body:** `{ name, email, phone?, password, sin?, address? }`

**Database Tables Accessed:** `employees` (insert), `employee_documents` (seed pending rows)

**Response Format:** `{ employee: { id, email, name, status } }` with `Set-Cookie` session header.

**Validation/Auth:** No pre-auth; email is de-duped; `status` is set to `pending`.

---

#### `GET /api/employee/reset-password`

**Business Logic:** Verifies a password-reset token and returns the employee email and first name.

**Query Params:** `token`

**Database Tables Accessed:** `employees` (reset_token, reset_expires_at)

**Response Format:** `{ ok: true, email: string, first_name: string }`

**Validation/Auth:** Token must exist and `reset_expires_at` must be in the future.

---

#### `POST /api/employee/reset-password`

**Business Logic:** Sets a new password using the reset token, clears all existing sessions, and removes the token.

**Request Body:** `{ token, password }`

**Database Tables Accessed:** `employees`, `employee_sessions` (delete all for the employee)

**Response Format:** `{ ok: true, email: string }`

**Validation/Auth:** Password must be at least 8 characters, contain one number, and one special character; token must not be expired.

---

### Part 2 — Employee Onboarding

#### `POST /api/employee/onboard/acknowledgments`

**Business Logic:** Saves the employee acknowledgment flags (tickets, phone, data, company_card) to the employee record.

**Request Body:** `{ tickets?, phone?, data?, company_card? }` (all booleans)

**Database Tables Accessed:** `employees`

**Response Format:** `{ ok: true, acknowledgments: { tickets, phone, data, company_card, acknowledged_at } }`

**Validation/Auth:** Requires employee session.

---

#### `GET /api/employee/onboard/acknowledgments`

**Business Logic:** Returns the current acknowledgment flags for the employee.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`

**Response Format:** `{ acknowledgments: {} }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/onboard/banking`

**Business Logic:** Saves encrypted banking information as an `employee_documents` row of type `banking_info`.

**Request Body:** `{ bank_name?, institution_number?, transit_number?, account_number }`

**Database Tables Accessed:** `employee_documents`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session. `account_number` is required; JSON payload is encrypted with `encryptField`.

---

#### `POST /api/employee/onboard/complete`

**Business Logic:** Validates that all onboarding steps (contract, TD1 forms, acknowledgments, selfie, all required documents) are complete and marks the employee as `pending_verification`.

**Request Body:** `{ license_data? }`

**Database Tables Accessed:** `employees`, `employee_documents`

**Response Format:** `{ ok: true, completed_at: ISOString, status: 'pending_verification' }` or `{ error: 'Onboarding incomplete', missing: [...], docStatus: {...} }` with 400.

**Validation/Auth:** Requires employee session; checks required docs are `uploaded` or `verified`, `contract_signed`, `td1_federal_data`, `td1_ab_data`, `acknowledgments.tickets`, `selfie_url`.

---

#### `GET /api/employee/onboard/complete`

**Business Logic:** Checks and returns the onboarding completion status and document status map.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`, `employee_documents`

**Response Format:** `{ employee, onboarding: { contract_signed, td1_federal, td1_ab, acknowledgments, completed, documents: { doc_type: { status, uploaded } } } }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/onboard/contract`

**Business Logic:** Records the typed signature for the employment contract and updates the `employment_contract` document status.

**Request Body:** `{ signature_typed, contract_version?, contract_text_hash? }`

**Database Tables Accessed:** `employees`, `employee_documents`

**Response Format:** `{ ok: true, signed_at: ISOString }`

**Validation/Auth:** Requires employee session; `signature_typed` required; stores IP and signature metadata.

---

#### `GET /api/employee/onboard/contract`

**Business Logic:** Returns the contract signature status and metadata.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`

**Response Format:** `{ signed: boolean, signed_at: string|null, data: object|null }`

**Validation/Auth:** Requires employee session.

---

#### `GET /api/employee/onboard/invite`

**Business Logic:** Public pre-auth endpoint that returns invite details by token for the onboarding page.

**Query Params:** `token`

**Database Tables Accessed:** `employee_invites`

**Response Format:** `{ invite: { id, email, first_name, last_name, phone, pay_rate, status, expires_at, created_at } }`

**Validation/Auth:** No auth; token must exist, not expired, and not already `accepted`.

---

#### `POST /api/employee/onboard/invite`

**Business Logic:** Accepts an invite and creates or updates the employee record. Seeds document rows for new accounts and auto-logs in the user.

**Request Body:** `{ token, password, phone, address }`

**Database Tables Accessed:** `employee_invites`, `employees`, `employee_documents`

**Response Format:** `{ employee: { id, email, name, status } }` with `Set-Cookie` session header.

**Validation/Auth:** No pre-auth; password must be at least 8 chars, one number, one special character; phone and address required; existing completed employee returns 409.

---

#### `POST /api/employee/onboard/td1`

**Business Logic:** Stores TD1 Federal or TD1AB form data on the employee and marks the corresponding document as completed.

**Request Body:** `{ form_type: 'federal' | 'ab', data: object }`

**Database Tables Accessed:** `employees`, `employee_documents`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session; `form_type` and `data` required.

---

#### `GET /api/employee/onboard/td1`

**Business Logic:** Returns the current TD1 form data for both federal and Alberta.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`

**Response Format:** `{ federal: object|null, ab: object|null }`

**Validation/Auth:** Requires employee session.

---

### Part 3 — Employee Documents & Selfie

#### `GET /api/employee/documents`

**Business Logic:** Lists the current employee's onboarding document rows and statuses.

**Request Body/Query:** None

**Database Tables Accessed:** `employee_documents`

**Response Format:** `{ documents: [...] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/documents`

**Business Logic:** Uploads an onboarding document to the `employee-documents` Supabase Storage bucket. OCRs driver's license images, updates the `employee_documents` table, and merges extracted license data into the employee profile. If all required docs are present, moves status to `pending_verification`.

**Request Body:** Multipart form with `doc_type` and `file`.

**Allowed `doc_type` values:** `employment_contract`, `td1_federal`, `td1_ab`, `id`, `banking_info`, `sin_document`, `drivers_license_front`, `drivers_license_back`, `other`

**Database Tables Accessed:** `employee_documents` (upsert), `employees` (license_data merge, status update), `employee-documents` storage bucket

**Response Format:** `{ ok: true, document: {...}, extracted_data: object, onboarding_complete: boolean }`

**Validation/Auth:** Requires employee session; `doc_type` and `file` required; `doc_type` must be in allowed list.

---

#### `POST /api/employee/selfie`

**Business Logic:** Uploads a crew selfie to the `crew-photos` bucket and stores the public URL on the employee row.

**Request Body:** Multipart form with `file` (image).

**Database Tables Accessed:** `employees`, `crew-photos` storage bucket

**Response Format:** `{ ok: true, selfie_url: string }`

**Validation/Auth:** Requires employee session; storage bucket is created if missing.

---

#### `GET /api/employee/selfie`

**Business Logic:** Public endpoint that returns the crew first names and selfie URLs for a booking based on the booking's `job_date` crew assignments.

**Query Params:** `booking_id`

**Database Tables Accessed:** `bookings`, `crew_assignments`, `employees`

**Response Format:** `{ crew: [{ first_name, selfie_url }] }`

**Validation/Auth:** No auth; `booking_id` required.

### Part 4 — Employee Clock, Schedule & Operations

#### `POST /api/employee/clock-in`

**Business Logic:** Starts a new shift for the employee. Prevents double clock-in if an open shift already exists.

**Request Body:** `{ lat?, lng? }` (optional GPS coordinates)

**Database Tables Accessed:** `timesheets`

**Response Format:** `{ ok: true, shift: { id, employee_id, clock_in_at, clock_in_lat, clock_in_lng } }`

**Validation/Auth:** Requires employee session; status must be `active` or `onboarded`; `terminated` blocked. Returns 409 if an open shift exists.

---

#### `POST /api/employee/clock-out`

**Business Logic:** Closes the current open shift, calculates regular/overtime hours and gross pay based on weekly and daily hours, and the employee's `pay_rate`.

**Request Body:** `{ lat?, lng? }`

**Database Tables Accessed:** `timesheets`, `employees` (pay_rate)

**Response Format:** `{ ok: true, shift: { id, clock_in_at, clock_out_at, regular_hours, overtime_hours, total_hours, gross_pay } }`

**Validation/Auth:** Requires employee session; must have an open shift or returns 404. Uses `calcShiftGross` and `splitOvertime`.

---

#### `POST /api/employee/job-clock`

**Business Logic:** Clocks in or out for a specific booking (`action: 'in' | 'out'`). Auto-starts a shift timesheet when first job is clocked in and auto-closes the shift when the last open job session ends.

**Request Body:** `{ booking_id, assignment_id?, action }`

**Database Tables Accessed:** `job_clock_sessions`, `timesheets`, `bookings`

**Response Format:** `{ ok: true, session: {...} }` for `in`; `{ ok: true, duration_minutes: number }` for `out`

**Validation/Auth:** Requires employee session; status must be `active` or `onboarded`; `booking_id` and `action` required.

---

#### `GET /api/employee/shifts`

**Business Logic:** Returns the current open shift, recent 30 closed shifts, and aggregated pay-period hours (current calendar month, un-paid).

**Request Body/Query:** None

**Database Tables Accessed:** `timesheets`

**Response Format:** `{ open_shift: {...}|null, recent: [...], period: { regular_hours, overtime_hours, total_hours, gross } }`

**Validation/Auth:** Requires employee session.

---

#### `GET /api/employee/schedule`

**Business Logic:** Returns the employee's crew assignment for a given date, the day's bookings, partner info, and open/completed job sessions. Supports `weekly=true` for a Mon-Sun view.

**Query Params:** `date?` (YYYY-MM-DD, default today), `weekly?` (`true` for week view)

**Database Tables Accessed:** `crew_assignments`, `bookings`, `employees`, `job_clock_sessions`, `timesheets`

**Response Format:** For a single day: `{ assignment, partner, bookings, open_sessions, completed_sessions, open_shift }`. For weekly: `{ week: [{ date, dayName, dayNum, isToday, assignment, bookings }], startDate, endDate }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/location`

**Business Logic:** Upserts the employee's current GPS location (with optional heading and speed) for the admin live tracking dashboard.

**Request Body:** `{ lat: number, lng: number, heading?, speed? }`

**Database Tables Accessed:** `crew_locations`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session; `lat` and `lng` must be numbers.

---

#### `GET /api/employee/location`

**Business Logic:** Public customer-tracking endpoint. Returns the most recent crew location for the date of a given booking.

**Query Params:** `booking_id`

**Database Tables Accessed:** `bookings`, `crew_assignments`, `crew_locations`, `employees`

**Response Format:** `{ location: { lat, lng, heading, updated_at, crew_first_names, en_route } | null }`

**Validation/Auth:** No auth; `booking_id` required; `en_route` is true if location updated within the last 5 minutes.

---

#### `GET /api/employee/landfill`

**Business Logic:** Returns landfills open today based on day-of-week and season rules, sorted by distance from crew GPS if provided.

**Query Params:** `lat?, lng?`

**Database Tables Accessed:** `landfills`

**Response Format:** `{ recommended: {...}, all: [...], warnings: [...], day_of_week, is_sunday }`

**Validation/Auth:** Requires employee session.

---

#### `GET /api/employee/gas-price`

**Business Logic:** Returns the current cached Alberta gas price, or fetches a fresh price from OilPriceAPI and caches it for up to 7 days.

**Request Body/Query:** None

**Database Tables Accessed:** `gas_price_cache`

**Response Format:** `{ price_per_litre, currency, source, fetched_at, from_cache, warning? }`

**Validation/Auth:** Requires employee session. Falls back to default `1.55 CAD` if API key is missing or fetch fails.

---

#### `GET /api/employee/notifications`

**Business Logic:** Lists the employee's notifications and counts unread messages.

**Request Body/Query:** None

**Database Tables Accessed:** `crew_notifications`

**Response Format:** `{ notifications: [...], unread: number }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/notifications`

**Business Logic:** Marks notifications as read by `id` or marks all as read.

**Request Body:** `{ id? }` or `{ markAll: true }`

**Database Tables Accessed:** `crew_notifications`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session.

---

#### `GET /api/employee/pay-stubs`

**Business Logic:** Returns the employee's pay stubs (newest first, up to 52).

**Request Body/Query:** None

**Database Tables Accessed:** `pay_stubs`

**Response Format:** `{ pay_stubs: [{ id, pay_run_id, created_at, regular_hours, overtime_hours, total_hours, regular_pay, overtime_pay, gross_pay, vacation_pay, cpp, cpp2, ei, fed_tax, total_deductions, net_pay, ytd_gross, ytd_cpp, ytd_cpp2, ytd_ei, ytd_vacation, direct_deposit_status, direct_deposit_sent_at }] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/push-subscribe`

**Business Logic:** Saves a Web Push subscription for the employee so admin can send push notifications.

**Request Body:** `{ endpoint, keys?: { p256dh?, auth? } }`

**Database Tables Accessed:** `push_subscriptions`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session; `endpoint` required.

---

#### `DELETE /api/employee/push-subscribe`

**Business Logic:** Removes a Web Push subscription by endpoint.

**Query Params:** `endpoint`

**Database Tables Accessed:** `push_subscriptions`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/receipts`

**Business Logic:** Records a transaction receipt (U-Haul, gas, dump, or other) for an assignment or general expense.

**Request Body:** `{ assignment_id?, receipt_type: 'uhaul'|'gas'|'dump'|'other', vendor?, amount_cad, receipt_photo_url?, notes? }`

**Database Tables Accessed:** `transaction_receipts`

**Response Format:** `{ ok: true, receipt: {...} }`

**Validation/Auth:** Requires employee session; `receipt_type` and `amount_cad` required.

---

#### `GET /api/employee/receipts`

**Business Logic:** Lists the employee's receipts, optionally filtered by `assignment_id` or `date`.

**Query Params:** `assignment_id?`, `date?` (YYYY-MM-DD)

**Database Tables Accessed:** `transaction_receipts`

**Response Format:** `{ receipts: [...] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/signature`

**Business Logic:** Captures a customer signature for a completed booking and updates the booking payment/status.

**Request Body:** `{ booking_id, customer_name_typed, customer_signature_url?, amount_confirmed, payment_method? ('cash'|'card') }`

**Database Tables Accessed:** `customer_signatures`, `bookings`

**Response Format:** `{ ok: true, signature: {...} }`

**Validation/Auth:** Requires employee session; `booking_id`, `customer_name_typed`, and `amount_confirmed` required. Sets `bookings.status` to `completed` and `payment_status` to `paid`.

---

#### `GET /api/employee/signature`

**Business Logic:** Returns signatures for a booking.

**Query Params:** `booking_id`

**Database Tables Accessed:** `customer_signatures`

**Response Format:** `{ signatures: [...] }`

**Validation/Auth:** Requires employee session; `booking_id` required.

---

#### `POST /api/employee/storage-drop`

**Business Logic:** Records items dropped at a storage facility and updates facility capacity if an estimate is provided.

**Request Body:** `{ assignment_id?, facility_id, booking_id?, item_photos?, capacity_photo_url?, capacity_estimate_pct? }`

**Database Tables Accessed:** `storage_drops`, `storage_facilities`

**Response Format:** `{ ok: true, drop: {...} }`

**Validation/Auth:** Requires employee session; `facility_id` required.

---

#### `GET /api/employee/storage-drop`

**Business Logic:** Lists active storage facilities for the crew to select.

**Request Body/Query:** None

**Database Tables Accessed:** `storage_facilities`

**Response Format:** `{ facilities: [{ id, name, address, lat, lng, access_code, capacity_sqft, current_usage_pct }] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/truck-check`

**Business Logic:** Records a pickup or return truck check (odometer, fuel, damage, gas receipt).

**Request Body:** `{ assignment_id, check_type: 'pickup'|'return', dashboard_photo_url?, odometer_km?, fuel_level?, fuel_percent?, truck_photos?, damage_notes?, gas_receipt_url?, gas_amount_cad?, gas_station? }`

**Database Tables Accessed:** `truck_checks`

**Response Format:** `{ ok: true, check: {...} }`

**Validation/Auth:** Requires employee session; `assignment_id` and `check_type` required.

---

#### `GET /api/employee/truck-check`

**Business Logic:** Lists truck checks for an assignment.

**Query Params:** `assignment_id`

**Database Tables Accessed:** `truck_checks`

**Response Format:** `{ checks: [...] }`

**Validation/Auth:** Requires employee session; `assignment_id` required.

---

#### `GET /api/employee/incidents`

**Business Logic:** Lists incident reports filed by the employee.

**Request Body/Query:** None

**Database Tables Accessed:** `incident_reports`, `crew_notifications`

**Response Format:** `{ incidents: [...] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/incidents`

**Business Logic:** Files a new incident report and creates a warning notification.

**Request Body:** `{ booking_id?, incident_type?, severity?, description, location?, photo_urls?, reported_to? }`

**Database Tables Accessed:** `incident_reports`, `crew_notifications`

**Response Format:** `{ incident: {...} }`

**Validation/Auth:** Requires employee session; `description` required.

---

#### `GET /api/employee/issues`

**Business Logic:** Lists job issues raised by the employee, optionally filtered by `booking_id`.

**Query Params:** `booking_id?`

**Database Tables Accessed:** `job_issues`

**Response Format:** `{ issues: [...] }`

**Validation/Auth:** Requires employee session.

---

#### `POST /api/employee/issues`

**Business Logic:** Creates a new job issue flag and notifies admin.

**Request Body:** `{ booking_id?, issue_type?, severity?, description?, photo_url? }`

**Database Tables Accessed:** `job_issues`, `crew_notifications`

**Response Format:** `{ issue: {...} }`

**Validation/Auth:** Requires employee session.

### Part 5 — Admin Crew Management API

All admin routes require a valid admin cookie (`ADMIN_COOKIE` token matching `adminToken()` from `@/lib/adminAuth`). They return `{ error: 'Unauthorized' }` with status 401 when not authenticated.

---

#### `GET /api/admin/crew`

**Business Logic:** Returns a full list of employees with live clock-in status, current-month job-clock hours, onboarding completion flags, and pending invites.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`, `job_clock_sessions`, `employee_invites`

**Response Format:** `{ employees: [{ ...employee, clocked_in, clock_in_at, clock_in_duration_min, current_booking_id, period: { total_hours, total_minutes }, onboarding: { contract_signed, td1_federal, td1_ab, acknowledgments, completed } }], pending_invites: [...], summary: { total, onboarded, pending, pending_verification, clocked_in_now, pending_invites } }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew`

**Business Logic:** Creates a fresh onboarding invite for a new crew member. If an incomplete employee record or pending invite already exists, it refreshes/deletes the old record and re-sends the email via Resend.

**Request Body:** `{ first_name, last_name, email, phone?, pay_rate? }`

**Database Tables Accessed:** `employee_invites`, `employees` (and cascades `employee_documents`, `employee_sessions`, `job_clock_sessions` when removing old incomplete accounts)

**Response Format:** `{ ok: true, invite }` (status 201)

**Validation/Auth:** Admin cookie required; `first_name`, `last_name`, and `email` required. `pay_rate` defaults to 18.

---

#### `GET /api/admin/crew/[id]`

**Business Logic:** Returns a single employee with full onboarding data, documents, invite, recent job clock sessions, and crew assignments.

**Path Params:** `id` (employee UUID)

**Database Tables Accessed:** `employees`, `employee_documents`, `employee_invites`, `job_clock_sessions`, `crew_assignments`

**Response Format:** `{ employee, documents, invite, recent_sessions, assignments }`

**Validation/Auth:** Admin cookie required.

---

#### `PATCH /api/admin/crew/[id]`

**Business Logic:** Updates an employee's admin-editable fields. Optionally sends a password-reset email if the admin changed email or set `send_reset: true`.

**Path Params:** `id`

**Request Body:** `{ status?, pay_rate?, first_name?, last_name?, name?, phone?, email?, hire_date?, onboarding_completed_at?, address?, onboarded_at?, send_reset? }`

**Database Tables Accessed:** `employees`

**Response Format:** `{ ok: true, employee, reset_sent: boolean }`

**Validation/Auth:** Admin cookie required; email is lower-cased and trimmed; name is derived from first/last if needed.

---

#### `DELETE /api/admin/crew/[id]`

**Business Logic:** Soft-terminates an employee by setting `status` to `terminated`, clocks out any open job sessions, and revokes all sessions.

**Path Params:** `id`

**Database Tables Accessed:** `employees`, `job_clock_sessions`, `employee_sessions`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew/[id]/approve`

**Business Logic:** Admin approves or rejects an employee's onboarding. On approve, status becomes `active` and an SMS is sent. On reject, status becomes `rejected` and an SMS with reason is sent.

**Path Params:** `id`

**Request Body:** `{ action: 'approve' | 'reject', notes? }`

**Database Tables Accessed:** `employees`

**Response Format:** `{ ok: true, status: 'active' | 'rejected' }`

**Validation/Auth:** Admin cookie required; `action` must be `approve` or `reject`.

---

#### `POST /api/admin/crew/[id]/resend-invite`

**Business Logic:** Resends an onboarding invite with a fresh token. If the employee already completed onboarding, returns 400.

**Path Params:** `id`

**Database Tables Accessed:** `employees`, `employee_invites`

**Response Format:** `{ ok: true, invite }`

**Validation/Auth:** Admin cookie required.

---

#### `GET /api/admin/crew/assignments`

**Business Logic:** Lists crew assignments, optionally filtered by a single date or a date range.

**Query Params:** `date?`, `from?`, `to?`

**Database Tables Accessed:** `crew_assignments`, `employees` (driver and secondary foreign relations)

**Response Format:** `{ assignments: [{ ...assignment, driver: {...}, secondary: {...} }] }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew/assignments`

**Business Logic:** Creates or updates a crew assignment for a date and sends push notifications to the assigned crew members.

**Request Body:** `{ assignment_date, driver_employee_id, secondary_employee_id?, uhaul_location?, uhaul_location_lat?, uhaul_location_lng?, id? }`

**Database Tables Accessed:** `crew_assignments`, `employees` (for push notification)

**Response Format:** `{ ok: true, assignment }`

**Validation/Auth:** Admin cookie required; `assignment_date` and `driver_employee_id` required. Uses upsert on `(assignment_date, driver_employee_id)` uniqueness.

---

#### `GET /api/admin/crew/donation-centers`

**Business Logic:** Lists donation centers.

**Request Body/Query:** None

**Database Tables Accessed:** `donation_centers`

**Response Format:** `{ centers: [...] }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew/donation-centers`

**Business Logic:** Creates or updates a donation center.

**Request Body:** `{ id?, name, address, lat?, lng?, phone?, hours?, accepted_items? }`

**Database Tables Accessed:** `donation_centers`

**Response Format:** `{ center: {...} }`

**Validation/Auth:** Admin cookie required; `name` and `address` required.

---

#### `GET /api/admin/crew/push`

**Business Logic:** Lists active employees with their push-subscription counts.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`, `push_subscriptions`

**Response Format:** `{ employees: [{ id, name, push_subscriptions }], total_subscriptions }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew/push`

**Business Logic:** Sends a push notification to all active employees or one specific employee.

**Request Body:** `{ target: 'all' | 'individual', employee_id?, title, body, url? }`

**Database Tables Accessed:** `employees`, `push_subscriptions`

**Response Format:** `{ ok: true, sent, totalSubs, message?, errors? }`

**Validation/Auth:** Admin cookie required; `title` and `body` required; `employee_id` required when `target` is `individual`.

---

#### `GET /api/admin/crew/storage`

**Business Logic:** Lists active storage facilities.

**Request Body/Query:** None

**Database Tables Accessed:** `storage_facilities`

**Response Format:** `{ facilities: [...] }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/crew/storage`

**Business Logic:** Creates or updates a storage facility.

**Request Body:** `{ id?, name, address, lat?, lng?, access_code?, capacity_sqft? }`

**Database Tables Accessed:** `storage_facilities`

**Response Format:** `{ facility: {...} }`

**Validation/Auth:** Admin cookie required; `name` and `address` required.

---

### Part 6 — Related Admin APIs

#### `GET /api/admin/employee-docs`

**Business Logic:** Returns all uploaded documents for a given employee.

**Query Params:** `employee_id`

**Database Tables Accessed:** `employee_documents`

**Response Format:** `{ documents: [...] }`

**Validation/Auth:** Admin cookie required; `employee_id` required.

---

#### `POST /api/admin/employee-docs`

**Business Logic:** Verifies or rejects a document and records the admin verification timestamp.

**Request Body:** `{ document_id, status: 'verified' | 'rejected', notes? }`

**Database Tables Accessed:** `employee_documents`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Admin cookie required; `status` must be `verified` or `rejected`.

---

#### `GET /api/admin/employees`

**Business Logic:** Admin overview of employees: who is clocked in, pay-period hours (current calendar month, un-paid), onboarding doc completion, and summary counts.

**Request Body/Query:** None

**Database Tables Accessed:** `employees`, `timesheets`, `employee_documents`

**Response Format:** `{ employees: [{ ...employee, clocked_in, clock_in_at, clock_in_duration_min, clock_in_gps, period: { regular_hours, overtime_hours, total_hours, gross }, onboarding: { complete, uploaded, missing } }], summary: { total, onboarded, pending, clocked_in_now } }`

**Validation/Auth:** Admin cookie required.

---

#### `POST /api/admin/mark-arrived`

**Business Logic:** Records the crew arrival timestamp on a booking.

**Request Body:** `{ booking_id }`

**Database Tables Accessed:** `bookings`

**Response Format:** `{ ok: true }`

**Validation/Auth:** Admin cookie required; `booking_id` required.

---

#### `GET /api/admin/get-job-photos`

**Business Logic:** Returns crew and customer photos for a booking, filtered by booking ID or customer phone.

**Query Params:** `booking_id` or `phone`

**Database Tables Accessed:** `bookings`

**Response Format:** `{ booking_id, customer_name, job_date, address, status, crew_arrived_at, customer_photos, crew_arrival_photos, crew_completion_photos, total_crew_photos }`

**Validation/Auth:** Admin cookie required; `booking_id` or `phone` required.

---

#### `POST /api/admin/upload-crew-photo`

**Business Logic:** Uploads a crew arrival or completion photo to the `job-photos` storage bucket and appends the photo record to the booking's `crew_photos` JSONB array.

**Request Body:** Multipart form with `file`, `booking_id`, `type` (`crew_arrival` or `crew_completion`)

**Database Tables Accessed:** `bookings`, `job-photos` storage bucket

**Response Format:** `{ url: string }`

**Validation/Auth:** Admin cookie required; `file`, `booking_id`, and `type` required; `type` must be `crew_arrival` or `crew_completion`.

## Comprehensive Database Schema (Crew App)

This section provides the full `CREATE TABLE` definitions, constraints, foreign keys, and indexes for the Supabase tables used by the crew app and employee portal. The definitions are consolidated from the migration files in `supabase/migrations/` and are shown in their final effective form.

---

### Core Job & Waitlist Tables

#### `bookings`

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref text UNIQUE NOT NULL DEFAULT
    'JH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  unit text,
  city text DEFAULT 'Calgary',
  postal_code text,
  quadrant text CHECK (quadrant IN ('NW','NE','SW','SE')),
  lat double precision,
  lng double precision,
  load_size text NOT NULL CHECK (load_size IN ('single_item','quarter','half','full')),
  base_price integer NOT NULL,
  same_day boolean DEFAULT false,
  same_day_fee integer DEFAULT 0,
  stairs integer DEFAULT 0,
  stairs_fee integer DEFAULT 0,
  has_freon boolean DEFAULT false,
  freon_fee integer DEFAULT 0,
  total_price integer NOT NULL,
  dynamic_multiplier decimal DEFAULT 1.0,
  deposit_amount integer DEFAULT 50,
  deposit_paid boolean DEFAULT false,
  deposit_paid_at timestamp,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  balance_due integer,
  job_date date NOT NULL,
  job_time text NOT NULL,
  job_datetime timestamp,
  photos text[],
  photo_skipped boolean DEFAULT false,
  description_text text,
  ai_load_estimate text,
  ai_weight_estimate_kg integer,
  ai_confidence text CHECK (ai_confidence IN ('high','medium','low')),
  has_hazmat boolean DEFAULT false,
  hazmat_description text,
  flag_for_review boolean DEFAULT false,
  flag_reason text,
  upgrade_pending boolean DEFAULT false,
  suggested_load_size text,
  suggested_price integer,
  source text DEFAULT 'web' CHECK (source IN ('web','phone','kijiji','marketplace','referral','vapi')),
  status text DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment','confirmed','completed','cancelled','rescheduled','no_show'
  )),
  no_show_risk_score integer DEFAULT 0,
  extra_reminder_sent boolean DEFAULT false,
  cancellation_reason text,
  cancelled_by text CHECK (cancelled_by IN ('customer','operator')),
  cancelled_at timestamp,
  refund_amount integer DEFAULT 0,
  refund_processed boolean DEFAULT false,
  refund_stripe_id text,
  original_job_date date,
  original_job_time text,
  reschedule_count integer DEFAULT 0,
  confirmation_sms_sent boolean DEFAULT false,
  morning_reminder_sent boolean DEFAULT false,
  extra_reminder_sent_at timestamp,
  review_requested boolean DEFAULT false,
  review_requested_at timestamp,
  review_completed boolean DEFAULT false,
  notes text,
  operator_notes text,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now(),
  is_apartment boolean DEFAULT false,
  customer_notes text,
  -- Crew app additions (20260705, 20260706, 20260716)
  crew_status text DEFAULT 'confirmed' CHECK (crew_status IN (
    'confirmed','en_route','arrived','in_progress','awaiting_payment','complete'
  )),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid','paid_card','paid_apple_pay','paid_google_pay','cash_declared','cash_crew'
  )),
  payment_method text CHECK (payment_method IS NULL OR payment_method IN (
    'tap','card_manual','cash','apple_pay','google_pay'
  )),
  payment_collected_at timestamp WITH TIME ZONE,
  receipt_sent boolean DEFAULT false,
  tracking_session_id text,
  opportunistic boolean DEFAULT false,
  en_route_at timestamp WITH TIME ZONE,
  crew_photos jsonb DEFAULT '[]'::jsonb,
  crew_photos_taken_at timestamp,
  crew_arrived_at timestamp WITH TIME ZONE,
  job_started_at timestamp WITH TIME ZONE,
  tracking_token text
);
```

**Indexes:**
- `bookings_job_date_idx` ON bookings (job_date)
- `bookings_status_idx` ON bookings (status)
- `bookings_phone_idx` ON bookings (phone)
- `bookings_crew_status_idx` ON bookings (crew_status)
- `bookings_payment_status_idx` ON bookings (payment_status)

---

#### `waitlist`

```sql
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  preferred_date date,
  preferred_day_type text CHECK (preferred_day_type IN ('thursday','sunday','either')),
  load_size text,
  address text,
  notified boolean DEFAULT false,
  notified_at timestamp,
  converted_to_booking_id uuid REFERENCES bookings(id),
  expires_at timestamp DEFAULT (now() + interval '30 days'),
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  -- Opportunistic scheduling additions (20260705)
  lat double precision,
  lng double precision,
  offered_nearby_today boolean DEFAULT false,
  last_nearby_offer_at timestamp WITH TIME ZONE
);
```

**Indexes:**
- `waitlist_lat_lng_idx` ON waitlist (lat, lng)

---

### Employee & Onboarding Tables

#### `employees`

```sql
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  phone text,
  sin text,
  sin_enc text,
  address text,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','onboarded','active','terminated')),
  onboarded_at timestamptz,
  terminated_at timestamptz,
  pay_rate numeric(8,2) NOT NULL DEFAULT 15.00,
  td1_federal_claim numeric(10,2) NOT NULL DEFAULT 15705,
  td1_ab_claim numeric(10,2) NOT NULL DEFAULT 22159,
  vacation_pct numeric(5,2) NOT NULL DEFAULT 4.00,
  bank_institution text,
  bank_transit text,
  bank_account text,
  bank_account_enc text,
  drive_folder_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Later additions (20260714, 20260716)
  selfie_url text,
  invite_id uuid REFERENCES employee_invites(id),
  first_name text,
  last_name text,
  td1_federal_data jsonb,
  td1_ab_data jsonb,
  contract_signed boolean DEFAULT false,
  contract_signed_at timestamptz,
  contract_data jsonb,
  acknowledgments jsonb DEFAULT '{}',
  onboarding_completed_at timestamptz
);
```

**Indexes:** none additional

---

#### `employee_invites`

```sql
CREATE TABLE IF NOT EXISTS employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  token TEXT NOT NULL UNIQUE,
  pay_rate NUMERIC DEFAULT 18.00,
  status TEXT DEFAULT 'pending',
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);
```

**Indexes:**
- `idx_employee_invites_token` ON employee_invites (token)
- `idx_employee_invites_email` ON employee_invites (email)

---

#### `employee_documents`

```sql
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'employment_contract','td1_federal','td1_ab','id','banking_info',
    'sin_document','drivers_license_front','drivers_license_back','other'
  )),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','uploaded','verified','rejected')),
  drive_file_id text,
  drive_file_url text,
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  notes text,
  expires_at date,
  expiry_notified_at timestamptz,
  UNIQUE (employee_id, doc_type)
);
```

**Indexes:** none additional

---

#### `employee_sessions`

```sql
CREATE TABLE IF NOT EXISTS employee_sessions (
  token text PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `employee_sessions_employee_idx` ON employee_sessions (employee_id)
- `employee_sessions_expires_idx` ON employee_sessions (expires_at)

---

### Time & Payroll Tables

#### `timesheets`

```sql
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  clock_in_lat float,
  clock_in_lng float,
  clock_out_lat float,
  clock_out_lng float,
  regular_hours numeric(6,2),
  overtime_hours numeric(6,2),
  total_hours numeric(6,2),
  gross_pay numeric(10,2),
  pay_run_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `timesheets_employee_idx` ON timesheets (employee_id)
- `timesheets_clock_in_idx` ON timesheets (clock_in_at)
- `timesheets_pay_run_idx` ON timesheets (pay_run_id)

---

#### `job_clock_sessions`

```sql
CREATE TABLE IF NOT EXISTS job_clock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  assignment_id UUID REFERENCES crew_assignments(id),
  employee_id UUID REFERENCES employees(id),
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_job_clock_booking` ON job_clock_sessions (booking_id)
- `idx_job_clock_employee` ON job_clock_sessions (employee_id)

---

#### `payroll_rates`

```sql
CREATE TABLE IF NOT EXISTS payroll_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  cpp_rate numeric(6,4) NOT NULL,
  cpp_basic_exemption numeric(10,2) NOT NULL,
  cpp_max_pensionable numeric(10,2) NOT NULL,
  cpp_max_contribution numeric(10,2) NOT NULL,
  cpp2_rate numeric(6,4) NOT NULL,
  cpp2_lower_ceiling numeric(10,2) NOT NULL,
  cpp2_upper_ceiling numeric(10,2) NOT NULL,
  cpp2_max_contribution numeric(10,2) NOT NULL,
  ei_rate numeric(6,4) NOT NULL,
  ei_max_insurable numeric(10,2) NOT NULL,
  ei_max_premium numeric(10,2) NOT NULL,
  fed_brackets jsonb NOT NULL,
  fed_basic_personal_amount numeric(10,2) NOT NULL,
  ab_brackets jsonb NOT NULL,
  ab_basic_personal_amount numeric(10,2) NOT NULL,
  fed_cpp_base numeric(10,2),
  fed_cpp2_base numeric(10,2),
  fed_ei_base numeric(10,2),
  fed_ab_tax_reduction numeric(10,2),
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (edition)
);
```

**Indexes:**
- `payroll_rates_effective_idx` ON payroll_rates (effective_from)

---

#### `pay_runs`

```sql
CREATE TABLE IF NOT EXISTS pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','calculated','approved','paid','closed')),
  run_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  paid_at timestamptz,
  total_gross numeric(12,2),
  total_cpp numeric(12,2),
  total_cpp2 numeric(12,2),
  total_ei numeric(12,2),
  total_fed_tax numeric(12,2),
  total_ab_tax numeric(12,2),
  total_vacation numeric(12,2),
  total_net numeric(12,2),
  total_cra_remittance numeric(12,2),
  remittance_due_date date,
  remittance_paid boolean DEFAULT false,
  remittance_paid_at timestamptz,
  edition text,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `pay_runs_status_idx` ON pay_runs (status)
- `pay_runs_period_idx` ON pay_runs (period_start, period_end)

---

#### `pay_stubs`

```sql
CREATE TABLE IF NOT EXISTS pay_stubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  regular_hours numeric(6,2),
  overtime_hours numeric(6,2),
  total_hours numeric(6,2),
  regular_pay numeric(10,2),
  overtime_pay numeric(10,2),
  gross_pay numeric(10,2),
  vacation_pay numeric(10,2),
  cpp numeric(10,2),
  cpp2 numeric(10,2),
  ei numeric(10,2),
  fed_tax numeric(10,2),
  ab_tax numeric(10,2),
  total_deductions numeric(10,2),
  net_pay numeric(10,2),
  ytd_gross numeric(10,2),
  ytd_cpp numeric(10,2),
  ytd_cpp2 numeric(10,2),
  ytd_ei numeric(10,2),
  ytd_fed_tax numeric(10,2),
  ytd_ab_tax numeric(10,2),
  ytd_vacation numeric(10,2),
  ytd_insurable_earnings numeric(10,2),
  ytd_pensionable_earnings numeric(10,2),
  direct_deposit_status text DEFAULT 'pending'
    CHECK (direct_deposit_status IN ('pending','sent','settled','failed','n/a')),
  direct_deposit_id text,
  direct_deposit_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (pay_run_id, employee_id)
);
```

**Indexes:**
- `pay_stubs_run_idx` ON pay_stubs (pay_run_id)
- `pay_stubs_employee_idx` ON pay_stubs (employee_id)

---

#### `remittances`

```sql
CREATE TABLE IF NOT EXISTS remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'owed'
    CHECK (status IN ('owed','paid','late')),
  paid_at timestamptz,
  paid_method text,
  reference text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `remittances_due_idx` ON remittances (due_date)
- `remittances_status_idx` ON remittances (status)

---

#### `direct_deposit_log`

```sql
CREATE TABLE IF NOT EXISTS direct_deposit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_stub_id uuid REFERENCES pay_stubs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_txn_id text,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','settled','failed')),
  raw_response jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);
```

**Indexes:**
- `dd_log_employee_idx` ON direct_deposit_log (employee_id)
- `dd_log_status_idx` ON direct_deposit_log (status)

---

#### `t4_slips`

```sql
CREATE TABLE IF NOT EXISTS t4_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  tax_year int NOT NULL,
  employment_income numeric(12,2),
  cpp_pensionable_earnings numeric(12,2),
  cpp_contribution numeric(12,2),
  ei_insurable_earnings numeric(12,2),
  ei_premium numeric(12,2),
  income_tax_deducted numeric(12,2),
  cpp2_pensionable_earnings numeric(12,2),
  cpp2_contribution numeric(12,2),
  vacation_pay_included numeric(12,2),
  generated_at timestamptz DEFAULT now(),
  status text DEFAULT 'generated'
    CHECK (status IN ('generated','filed')),
  UNIQUE (employee_id, tax_year)
);
```

**Indexes:**
- `t4_slips_year_idx` ON t4_slips (tax_year)

---

### Crew Assignment & Operations Tables

#### `crew_assignments`

```sql
CREATE TABLE IF NOT EXISTS crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date DATE NOT NULL,
  driver_employee_id UUID REFERENCES employees(id),
  secondary_employee_id UUID REFERENCES employees(id),
  uhaul_location TEXT,
  uhaul_location_lat FLOAT,
  uhaul_location_lng FLOAT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_date, driver_employee_id)
);
```

**Indexes:**
- `idx_crew_assignments_date` ON crew_assignments (assignment_date)

---

#### `truck_checks`

```sql
CREATE TABLE IF NOT EXISTS truck_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  check_type TEXT NOT NULL,
  dashboard_photo_url TEXT,
  odometer_km INTEGER,
  fuel_level TEXT,
  fuel_percent NUMERIC,
  truck_photos JSONB DEFAULT '[]',
  damage_notes TEXT,
  gas_receipt_url TEXT,
  gas_amount_cad NUMERIC,
  gas_station TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);
```

**Indexes:** none additional

---

#### `transaction_receipts`

```sql
CREATE TABLE IF NOT EXISTS transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  employee_id UUID REFERENCES employees(id),
  receipt_type TEXT NOT NULL,
  vendor TEXT,
  amount_cad NUMERIC NOT NULL,
  receipt_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_receipts_assignment` ON transaction_receipts (assignment_id)
- `idx_receipts_employee` ON transaction_receipts (employee_id)

---

#### `customer_signatures`

```sql
CREATE TABLE IF NOT EXISTS customer_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  customer_name_typed TEXT NOT NULL,
  customer_signature_url TEXT,
  crew_member_typed TEXT NOT NULL,
  crew_member_id UUID REFERENCES employees(id),
  amount_confirmed NUMERIC NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional

---

#### `storage_facilities`

```sql
CREATE TABLE IF NOT EXISTS storage_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  access_code TEXT,
  capacity_sqft NUMERIC,
  current_usage_pct NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional

---

#### `storage_drops`

```sql
CREATE TABLE IF NOT EXISTS storage_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  facility_id UUID REFERENCES storage_facilities(id),
  booking_id UUID REFERENCES bookings(id),
  item_photos JSONB DEFAULT '[]',
  capacity_photo_url TEXT,
  capacity_estimate_pct NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);
```

**Indexes:** none additional

---

#### `donation_centers`

```sql
CREATE TABLE IF NOT EXISTS donation_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional

---

#### `donation_runs`

```sql
CREATE TABLE IF NOT EXISTS donation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  facility_id UUID REFERENCES storage_facilities(id),
  center_id UUID REFERENCES donation_centers(id),
  item_photos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

**Indexes:** none additional

---

#### `landfills`

```sql
CREATE TABLE IF NOT EXISTS landfills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  sunday_open BOOLEAN DEFAULT false,
  summer_only_sunday BOOLEAN DEFAULT false,
  monday_to_friday BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional

---

#### `gas_price_cache`

```sql
CREATE TABLE IF NOT EXISTS gas_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT DEFAULT 'AB',
  price_per_litre NUMERIC NOT NULL,
  currency TEXT DEFAULT 'CAD',
  source TEXT DEFAULT 'OilPriceAPI',
  fetched_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional

---

### Tracking, Location, Notifications, Issues & Feedback

#### `crew_locations`

```sql
CREATE TABLE IF NOT EXISTS crew_locations (
  employee_id UUID PRIMARY KEY REFERENCES employees(id),
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  heading FLOAT,
  speed FLOAT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:** none additional (primary key on `employee_id`)

---

#### `crew_location`

```sql
CREATE TABLE IF NOT EXISTS crew_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_session_id text UNIQUE NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  heading float,
  speed_kmh float,
  accuracy_meters float,
  active_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  crew_pin_hash text,
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);
```

**Indexes:**
- `crew_location_active_booking_idx` ON crew_location (active_booking_id)
- `crew_location_session_idx` ON crew_location (tracking_session_id)

---

#### `crew_pin`

```sql
CREATE TABLE IF NOT EXISTS crew_pin (
  id integer PRIMARY KEY DEFAULT 1,
  pin_hash text NOT NULL,
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);
```

**Indexes:** none additional

---

#### `nearby_offers`

```sql
CREATE TABLE IF NOT EXISTS nearby_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  waitlist_id uuid REFERENCES waitlist(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  offered_at timestamp WITH TIME ZONE DEFAULT now(),
  accepted boolean,
  responded_at timestamp WITH TIME ZONE,
  offer_expires_at timestamp WITH TIME ZONE,
  crew_lat float,
  crew_lng float,
  distance_km float,
  converted_booking_id uuid REFERENCES bookings(id)
);
```

**Indexes:**
- `nearby_offers_phone_idx` ON nearby_offers (customer_phone)

---

#### `gps_overrides`

```sql
CREATE TABLE IF NOT EXISTS gps_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'gps_unavailable',
  crew_lat float,
  crew_lng float,
  job_lat float,
  job_lng float,
  distance_meters float,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);
```

**Indexes:** none additional

---

#### `push_subscriptions`

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, endpoint)
);
```

**Indexes:**
- `idx_push_subs_employee` ON push_subscriptions (employee_id)

---

#### `crew_notifications`

```sql
CREATE TABLE IF NOT EXISTS crew_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_crew_notif_emp` ON crew_notifications (employee_id, created_at DESC)

---

#### `job_issues`

```sql
CREATE TABLE IF NOT EXISTS job_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  photo_url TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_job_issues_booking` ON job_issues (booking_id)
- `idx_job_issues_unresolved` ON job_issues (resolved_at) WHERE resolved_at IS NULL

---

#### `incident_reports`

```sql
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  location TEXT,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  reported_to TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_incident_emp` ON incident_reports (employee_id, created_at DESC)
- `idx_incident_status` ON incident_reports (status)

---

#### `offline_job_queue`

```sql
CREATE TABLE IF NOT EXISTS offline_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  booking_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_offline_queue_emp` ON offline_job_queue (employee_id, synced_at)

---

#### `customer_feedback`

```sql
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_customer_feedback_booking` ON customer_feedback (booking_id)

---

#### `crew_tips`

```sql
CREATE TABLE IF NOT EXISTS crew_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  assignment_id UUID REFERENCES crew_assignments(id),
  amount_cad NUMERIC NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_crew_tips_booking` ON crew_tips (booking_id)
- `idx_crew_tips_assignment` ON crew_tips (assignment_id)

---

### Supporting Configuration Tables

#### `system_config`

```sql
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  value_type text DEFAULT 'string' CHECK (value_type IN ('string','number','boolean','json')),
  description text,
  category text DEFAULT 'general',
  updated_by text,
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);
```

**Notes:** Used for crew-management runtime values such as `default_pay_rate`, `uhaul_tank_capacity_litres`, `storage_facility_id`, `donation_center_id`, and `kill_switch_*` flags.

**Indexes:** none additional (`key` is unique)

---

## A. Component Inventory — Crew App & Admin UI

This section inventories the shared and admin-facing React components that power the crew portal, onboarding, and admin controls. Each component is documented with its purpose, props/state, handlers, API calls, rendered UI, dependencies, and notable edge cases.

---

### A.1 `components/PWARegister.js`

**Purpose:** Registers the service worker, subscribes the device to push notifications, and shows an iOS "Add to Home Screen" banner on crew portal pages. Rendered once in the root layout.

**Props:** None — self-contained.

**State:**
- `showIosPrompt` (`boolean`) — controls visibility of the iOS install banner.

**Hooks:**
- `useEffect` on mount: registers `/sw.js`, detects iOS/Safari, conditionally shows the iOS prompt after 2s, and requests push permission/subscription on portal pages.

**Key handlers:**
- `requestPermissionAndSubscribe()` — requests `Notification.permission` if `default`; if granted, calls `subscribeToPush()`.
- `subscribeToPush()` — waits for `navigator.serviceWorker.ready`, reuses an existing `pushManager` subscription or creates a new one with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, then POSTs the subscription JSON to `/api/employee/push-subscribe`.
- `dismissIosPrompt()` — hides the banner and persists `jh-ios-prompt-dismissed` in `localStorage`.

**API calls:**
- `POST /api/employee/push-subscribe` — sent once a valid `PushSubscription` exists.

**UI rendered:**
- Fixed bottom banner with app branding, instructions to use Share → Add to Home Screen, and a dismiss × button.

**External dependencies:**
- Browser `serviceWorker`, `PushManager`, `Notification` APIs.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` environment variable.

**Edge cases:**
- Silently returns if APIs are unavailable.
- iOS prompt is skipped on `/portal/onboard`, in standalone mode, or if previously dismissed.
- All failures are logged with `console.warn` and not surfaced to the user.

---

### A.2 `components/portal/DocumentScanner.js`

**Purpose:** File upload card for onboarding documents (SIN, driver license front/back). Accepts images and PDFs via tap, drag/drop, or file input.

**Props:**
- `label` (`string`) — display label for the document.
- `onCapture(file)` (`function`) — callback invoked with the selected `File`.
- `uploaded` (`boolean`) — whether the document has already been uploaded.
- `previewUrl` (`string`) — thumbnail URL to show after upload.
- `uploading` (`boolean`) — shows spinner state and disables replace actions.

**State:**
- `dragOver` (`boolean`) — visual drag highlight.

**Hooks:**
- `useRef` for the hidden `file` input.

**Key handlers:**
- `handleFile(e)` — reads `e.target.files[0]` and calls `onCapture`.
- `onDrop(e)` — prevents default, grabs `e.dataTransfer.files[0]`, and calls `onCapture`.

**API calls:** None directly; the parent page posts to `/api/employee/documents`.

**UI rendered:**
- Two modes:
  1. Uploaded: green-bordered row with checkmark/thumbnail, "Uploaded" text, and "Replace" button.
  2. Not uploaded: dashed drop zone with upload icon, label, and helper text.

**External dependencies:** None.

**Edge cases:**
- Accepts `image/*,.pdf`.
- Uploading state blocks the replace action but shows a spinner in the thumbnail slot.

---

### A.3 `components/portal/SelfieCapture.js`

**Purpose:** File upload component specifically for the crew onboarding selfie. Identical in behavior to `DocumentScanner` but uses `capture="user"` and a circular avatar preview.

**Props:**
- `onCapture(file)` (`function`) — callback invoked with the selected `File`.
- `uploaded` (`boolean`) — whether the selfie has already been uploaded.
- `previewUrl` (`string`) — circular avatar preview.
- `uploading` (`boolean`) — spinner state.

**State:**
- `dragOver` (`boolean`) — drag highlight.

**Hooks:**
- `useRef` for the hidden `file` input.

**Key handlers:**
- `handleFile(e)` — reads `e.target.files[0]` and calls `onCapture`.
- `onDrop(e)` — reads dropped file and calls `onCapture`.

**API calls:** None directly; parent page posts to `/api/employee/selfie`.

**UI rendered:**
- Uploaded: green row with circular thumbnail/avatar, "Crew selfie" label, status, and "Replace" button.
- Not uploaded: dashed drop zone with camera icon and "Upload selfie" text.

**External dependencies:** None.

**Edge cases:**
- `input` uses `accept="image/*" capture="user"` to open the front-facing camera on mobile.
- Accepts images only.

---

### A.4 `components/AddressAutocomplete.js`

**Purpose:** Mapbox-powered address search input with debounced suggestions, keyboard navigation, and light/dark theme support.

**Props:**
- `value` (`string`) — controlled input value.
- `onChange(value)` (`function`) — fires on every keystroke.
- `onSelect(feature)` (`function`) — fires when a suggestion is selected; receives the full Mapbox feature object.
- `placeholder` (`string`, default `Start typing address...`)
- `className` (`string`)
- `dark` (`boolean`, default `false`) — swaps theme tokens.
- `style` (`object`)

**State:**
- `suggestions` (`array`) — Mapbox `features`.
- `showDropdown` (`boolean`)
- `loading` (`boolean`)
- `highlighted` (`number`) — keyboard-selected index.
- `hasSearched` (`boolean`) — used to show "No addresses found" only after a search.

**Hooks:**
- `useRef` debounce timer.
- `useEffect` cleanup clears the debounce timer on unmount.

**Key handlers:**
- `fetchSuggestions(query)` — calls Mapbox Geocoding API with Calgary bbox/proximity and `country=ca`.
- `handleChange(val)` — debounces 250ms before fetching.
- `selectSuggestion(s)` — updates `value`, calls `onSelect`, and closes dropdown.
- `handleKeyDown(e)` — supports ArrowDown/ArrowUp/Enter/Escape navigation.

**API calls:**
- `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json` (with `NEXT_PUBLIC_MAPBOX_TOKEN`)

**UI rendered:**
- Styled text input, absolute-positioned dropdown with loading row, "No addresses found" row, and list of suggestions with `MapPin` icon and two-line address.

**External dependencies:**
- `lucide-react` (`MapPin`, `Search`)
- Mapbox Geocoding API and `NEXT_PUBLIC_MAPBOX_TOKEN`.

**Edge cases:**
- Skips API if `query.length < 2` or `NEXT_PUBLIC_MAPBOX_TOKEN` missing.
- `onBlur` uses a 200ms timeout so `onMouseDown` on a suggestion can fire before the dropdown closes.

---

### A.5 `components/admin/CrewView.js`

**Purpose:** Comprehensive admin crew management page. Displays summaries, pending invites, an invite form, employee list, broadcast messaging, crew assignments, storage/donation centers, and an employee detail slide-over for approval/editing.

**Main component state:**
- `data` — full payload from `/api/admin/crew`.
- `loading`, `selectedId`, `assignments`, `facilities`, `centers`, `message`.

**Hooks:**
- `useState`, `useEffect`, `useCallback`, `useMemo`.

**Key handlers/data fetching:**
- `fetchAll()` — loads `data`, `assignments`, `facilities`, and `centers` in parallel via `Promise.all`.
- `flash(type, text)` — temporary success/error message.

**Sub-components and their APIs:**

| Sub-component | API calls | Notes |
|---|---|---|
| `PendingInvitesSection` | `POST /api/admin/crew` (resend) | Lists pending invites; resend recreates the invite. |
| `InviteForm` | `POST /api/admin/crew` | First name, last name, email, phone, pay rate. |
| `BroadcastSection` | `GET /api/admin/crew/push`, `POST /api/admin/crew/push` | Send push notifications to all or one employee. |
| `EmployeeList` | none | Roster with status, clocked-in pulse, onboarding badges, and period minutes. |
| `EmployeeDetailSlideOver` | `GET /api/admin/crew/${id}`, `PATCH /api/admin/crew/${id}`, `DELETE /api/admin/crew/${id}`, `POST /api/admin/crew/${id}/resend-invite`, `POST /api/admin/crew/${id}/approve`, `GET /api/admin/employee-docs?employee_id=${id}`, `POST /api/admin/employee-docs` | Edit, terminate, approve/reject, resend invite, verify/reject documents. |
| `AssignmentsSection` | `POST /api/admin/crew/assignments` | Create driver/secondary/U-Haul assignments for a date. |
| `StorageSection` | `POST /api/admin/crew/storage` | Add/edit storage facilities; uses `AddressAutocomplete`. |
| `DonationSection` | `POST /api/admin/crew/donation-centers` | Add/edit donation centers; uses `AddressAutocomplete`. |

**UI rendered:**
- Loading spinner, summary stat cards with ring indicators, pending verification alert, pending invites, invite form, broadcast panel, employee list, assignments, storage facilities, donation centers, and a right-side slide-over for the selected employee.

**External dependencies:**
- `lucide-react` icons
- `AddressAutocomplete` (Mapbox)
- Custom `formatDateLong` helper

**Edge cases:**
- `fetchAll` runs in `finally` so `loading` always ends.
- `save` in `EmployeeDetailSlideOver` sends a password reset when email/name changes.
- `terminate` confirms via `window.confirm` and closes open clock sessions on the server.

---

### A.6 `components/admin/CommandCenter.js`

**Purpose:** Admin operations dashboard: live AI chat agent, AI-generated narrative briefing, today’s job/revenue stats, urgent calls, stale cron jobs, pending opportunistic offers, and real-time crew status.

**Main component state:**
- `data`, `loading`, `insight`, `insightLoading`, `insightError`.

**Hooks:**
- `useEffect` loads `fetchData` and `fetchInsight` on mount; polls `fetchData` every 60s.

**Key handlers:**
- `fetchData()` — `GET /api/admin/command-center`.
- `fetchInsight(force)` — `GET /api/admin/insights` (or `?force=1`); handles `skipped` state.

**Sub-components:**

| Sub-component | API calls | Purpose |
|---|---|---|
| `AgentChat` | `POST /api/admin/agent` | Interactive chat that can take actions (SMS, calls, etc.). |
| `NarratorCard` | (data from parent) | Displays cached AI briefing with age and regenerate button. |
| `CrewStatusWidget` | `GET /api/admin/employees` (polls every 30s) | Shows currently clocked-in crew. |

**UI rendered:**
- AI agent chat card, AI briefing card, four stat cards, urgent calls list, stale cron list, pending offers grid, and crew status list.

**External dependencies:**
- None besides admin API.

**Edge cases:**
- `fetchData` polling auto-refreshes dashboard data every minute.
- `AgentChat` keeps last 20 action results and scrolls to bottom on new messages.

---

### A.7 `components/admin/PayrollPanel.js`

**Purpose:** Payroll admin UI with four tabs: Overview, Pay Runs, Remittances, and T4s. Allows previewing, running, approving, and direct-depositing pay runs.

**Main component state:**
- `tab` (`'overview' | 'runs' | 'remittance' | 't4s'`)

**Sub-components:**

| Sub-component | API calls | Notes |
|---|---|---|
| `OverviewTab` | `GET /api/admin/employees` | Summary cards + employee period table + "New Pay Run" button. |
| `RunPayrollModal` | `POST /api/admin/payroll/preview`, `POST /api/admin/payroll/run` | Date range picker, preview totals, then confirm. |
| `PayRunsTab` | `GET /api/admin/payroll/approve`, `POST /api/admin/payroll/approve` | Lists historical runs; supports `Approve` and `Approve + Deposit` with `send_direct_deposit: true`. |
| `RemittanceTab` | `GET /api/admin/remittance`, `POST /api/admin/remittance` | Shows CRA remittances owed and marks them paid. |
| `T4sTab` | `GET /api/admin/t4s?year={year}` | T4 slips by year for the last six years. |

**UI rendered:**
- Tab bar, overview stats, employee table, modal for payroll preview/run, pay run list, remittance cards, T4 table.

**External dependencies:**
- Date formatting helpers.

**Edge cases:**
- `RunPayrollModal` defaults to a 14-day period ending today.
- `approveWithDeposit` confirms before sending direct deposits.

---

### A.8 `components/admin/ConfigPanel.js`

**Purpose:** Admin control panel for `system_config` values grouped by category, plus a Stripe branding utility.

**Main component state:**
- `config`, `edits`, `loading`, `saving`, `message`.

**Hooks:**
- `useEffect` fetches `/api/admin/config` on mount with `mounted` guard.
- `useMemo` groups config by category.

**Key handlers:**
- `handleChange(key, value)` — writes local edits.
- `save()` — builds `updates` from `edits`, preserves original metadata, and `POST /api/admin/config`.

**Sub-component:**

| Sub-component | API calls | Notes |
|---|---|---|
| `StripeBrandingCard` | `POST /api/admin/stripe-branding` (actions `check` and `update`) | Requires admin password; updates logo, colors, statement descriptor. |

**UI rendered:**
- Section heading, save button, unsaved changes warning, grouped config cards with `ConfigField` inputs (boolean selects or text/number), and Stripe branding card.

**External dependencies:**
- Stripe API (server-side through admin API).

**Edge cases:**
- Boolean fields are keyed by `value_type === 'boolean'` or `key.startsWith('kill_switch_')`.
- `inferType` guesses value type when saving a new value.

---

### A.9 `components/admin/RouteMap.js`

**Purpose:** Leaflet map showing the U-Haul depot and numbered job stops for a route.

**Props:**
- `stops` (`array` of `{ id, lat, lng, position, name, address, job_time }`)

**State:** None.

**Key handlers:**
- `numberIcon(label, color)` — builds a `divIcon` with a colored circular marker.
- Filters `stops` to only those with numeric `lat`/`lng`.

**API calls:**
- OpenStreetMap tile server (`https://{s}.tile.openstreetmap.org/...`).

**UI rendered:**
- `MapContainer` with `TileLayer`, depot marker, and numbered stop markers with popups showing `position`, `name`, `address`, and `job_time`.

**External dependencies:**
- `leaflet`, `react-leaflet`, `leaflet/dist/leaflet.css`
- OpenStreetMap tiles

**Edge cases:**
- If no stops are geocoded, map centers on the depot (`51.0595, -114.0447`).

---

### A.10 `components/admin/GrowthPanel.js`

**Purpose:** Marketing/growth dashboard: abandonment funnel, opportunistic offers, surge snapshots, and cron health.

**State:**
- `data`, `loading`.

**Hooks:**
- `useEffect` with `mounted` guard fetches `/api/admin/growth`.

**API calls:**
- `GET /api/admin/growth`

**UI rendered:**
- Abandonment funnel bar chart (quoted → touch1 → touch2 → touch3 → converted)
- Offers table (latest 20)
- Surge snapshots table (latest 20)
- Cron health cards

**External dependencies:**
- Admin growth API only.

**Edge cases:**
- Empty datasets show friendly "No ... yet" messages.

---

### A.11 `components/admin/ReferralsPanel.js`

**Purpose:** Admin referrals dashboard with leaderboard and a list of all referral statuses.

**State:**
- `referrals`, `leaderboard`, `loading`.

**Hooks:**
- `useEffect` with `mounted` guard fetches `/api/admin/referrals`.

**API calls:**
- `GET /api/admin/referrals`

**UI rendered:**
- Leaderboard grid (top 6 referrers by completed count and total earned)
- Referrals table: referrer, referee, status badge, reward split, date

**External dependencies:**
- None.

**Edge cases:**
- `statusBadge` maps `pending`, `completed`, and `expired` to colored badges.

---

### A.12 `components/admin/CallsPanel.js`

**Purpose:** Admin view of call history with sentiment sorting and a call-detail modal.

**State:**
- `calls`, `loading`, `selected`.

**Hooks:**
- `useEffect` with `mounted` guard fetches `/api/admin/call-history`.

**API calls:**
- `GET /api/admin/call-history`

**UI rendered:**
- Calls table sorted by sentiment risk (frustrated/negative first)
- Clicking a row opens a modal with phone, name, sentiment, ended reason, summary, transcript, and a "Call back" button using `window.open(`tel:${...}`)`.

**External dependencies:**
- None.

**Edge cases:**
- Empty states and missing fields show `-` or "No summary".

---

### A.13 `components/admin/BookingTimeline.js`

**Purpose:** Modal timeline of events for a single booking.

**Props:**
- `bookingId` (`string`)
- `onClose()` (`function`)

**State:**
- `data`, `loading`, `error`.

**Hooks:**
- `useEffect` with `mounted` guard fetches timeline when `bookingId` changes.

**API calls:**
- `GET /api/admin/bookings/{bookingId}/timeline`

**UI rendered:**
- Centered modal with booking summary (created, status, total, balance, surge, no-show risk)
- Vertical timeline with icons, timestamps, event type, payload JSON, and optional body

**External dependencies:**
- None.

**Edge cases:**
- Errors surface as red text in the modal body.
- Empty timelines show "No timeline events found."

---

### A.14 `components/admin/AuditTrail.js`

**Purpose:** Filterable admin audit trail of system events.

**State:**
- `events`, `loading`, `filter` (default `'All'`), `limit` (default `50`).

**Hooks:**
- `useEffect` with `mounted` guard refetches when `filter` or `limit` changes.

**API calls:**
- `GET /api/admin/events?type={filter}&limit={limit}`

**UI rendered:**
- Filter select for event type and limit select
- Events table: time, event type, booking/lead reference, payload JSON

**External dependencies:**
- None.

**Edge cases:**
- `EVENT_TYPES` includes a fixed list (surge, abandonment touches, SMS, offers, etc.).

---

### A.15 `components/admin/IntelPanel.js`

**Purpose:** Quadrant profit summary dashboard for geographic revenue/profit analysis.

**State:**
- `summary`, `days` (default `30`), `loading`.

**Hooks:**
- `useEffect` with `mounted` guard fetches when `days` changes.

**API calls:**
- `GET /api/admin/quadrant-profit?days={days}&summary=true`

**UI rendered:**
- Day-range select (7/30/90)
- Per-quadrant cards with revenue/profit progress bars, job counts, completed/cancelled/no-show breakdown, and average margin/job value

**External dependencies:**
- None.

**Edge cases:**
- `maxRevenue` and `maxProfit` are at least `1` to avoid division by zero.
- Empty summary shows "No data available."

---

## Environment Variables, Theming, and PWA Configuration

### 1. Environment Variables

The crew app, portal, and PWA use the environment variables below. Public variables are exposed to the browser via the `NEXT_PUBLIC_` prefix; server-only variables are used in API routes and server libraries.

#### Public variables (`NEXT_PUBLIC_*`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Base site URL for metadata, OG tags, and crew invite links (`app/layout.js` line 8). |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL access token for the map on `/portal/schedule`, address autocomplete in `/portal/onboard`, and the customer `/track/[token]` page. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key used by `components/PWARegister.js` to subscribe the crew device to push notifications. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for the payment form on the customer `/track/[token]` page. |

#### Server-only variables

| Variable | Purpose |
|----------|---------|
| `EMPLOYEE_ENC_KEY` | AES-256-GCM encryption key for sensitive employee fields (SIN, banking) in `lib/employeeAuth.js`. |
| `VAPID_PUBLIC_KEY` | VAPID public key for the server-side push notification `sendNotification` calls in `lib/pushNotifications.js`. |
| `VAPID_PRIVATE_KEY` | VAPID private key for the server-side push notification `sendNotification` calls. |
| `VAPID_SUBJECT` | VAPID subject/contact address (defaults to `mailto:crew@junkhaul.ca`). |
| `RESEND_API_KEY` | Resend API key used by `/api/admin/crew` routes to send employee invite emails. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON credentials for the Google service account used to upload employee onboarding documents. |
| `GOOGLE_DRIVE_EMPLOYEE_ROOT` | Google Drive folder ID where employee documents are stored. |
| `GOOGLE_DRIVE_OWNER_EMAIL` | Email address that receives writer access to the employee document folder. |
| `OILPRICEAPI_KEY` | API key for the `/api/employee/gas-price` route. |
| `QUO_API_KEY` / `QUO_USER_ID` / `QUO_PHONE_NUMBER` | Quo API credentials and sender number for SMS notifications. |
| `HAMMAD_PHONE` / `BROTHER_PHONE` | Operator phone numbers for inbound alerts and forwarding. |
| `CRON_SECRET` | Shared secret for authenticating cron routes (e.g., `/api/cron/run-payroll`). |
| `EFT_PROVIDER` | Direct deposit provider selector (`vopay`, `peoples`, `plooto`). |
| `VOPAY_API_KEY` / `VOPAY_API_TOKEN` / `VOPAY_BUSINESS_ACCOUNT` | VoPay direct deposit credentials. |
| `PEOPLES_API_KEY` / `PEOPLES_MERCHANT` | Peoples Group direct deposit credentials. |
| `PLOOTO_API_KEY` / `PLOOTO_BUSINESS_ID` | Plooto direct deposit credentials. |

### 2. CSS Theme Strategy

**Default theme:** `app/globals.css` defines a light default in `:root` with `color-scheme: light` (`app/globals.css` lines 9-29). The `track` page intentionally overrides this via `data-theme="dark"`.

**Theme switching:**
- `app/portal/layout.js` sets `document.documentElement` to `data-theme="light"` in a `useEffect`, so the crew portal always renders light regardless of the device dark-mode setting. It restores the previous theme on unmount.
- `app/track/layout.js` sets `data-theme="dark"` for the customer tracking page, also restoring the previous theme on unmount.

**CSS variables (`globals.css` lines 9-29):** The `:root` block defines:
- `--bg-base`, `--bg-card`, `--bg-elevated`, `--bg-input` — background surfaces.
- `--accent` (`#f97316`), `--accent-dark` (`#ea580c`) — orange primary.
- `--text-primary`, `--text-secondary`, `--text-disabled` — text colors.
- `--status-green`, `--status-amber`, `--status-gray`, `--status-red` — status indicators.
- `--border-subtle`, `--border-card` — borders.

The `[data-theme="dark"]` block overrides these to dark values (`app/globals.css` lines 32-43).

**Important utility classes used in the portal/track UI:**
- `.glass-bar` — translucent, blurred floating bar; background inverts on `data-theme="dark"`.
- `.glass-btn` — circular, translucent button with blur, active scale, and dark-mode invert.
- `.dark-card` — background `var(--bg-card)`, border `var(--border-card)`, 16 px radius.
- `.dark-input` — background `var(--bg-input)`, `var(--text-primary)`, 12 px radius, accent focus ring.
- `.btn-primary` — orange button using `var(--accent)` and `var(--accent-dark)` on active.
- `.btn-ghost` — secondary button with subtle border and `var(--text-secondary)`.
- `.status-dot` — 8 px colored circle for status indicators.
- `.pulse-ring`, `.bounce-pin`, `.slide-up`, `.slide-in-right`, `.fade-in`, `.celebrate` — motion utilities.
- `.safe-top`, `.safe-bottom`, `.safe-left`, `.safe-right` — iOS safe-area insets.
- `.no-scrollbar`, `.border-3`, `.tabular`, `.sheet-handle`, `.progress-line` / `.progress-line-fill`.

### 3. Manifest, Theme Color, and Viewport

**`public/manifest.json`** (PWA manifest):
- `name`: "Junk Haul Crew"
- `short_name`: "JunkHaul"
- `description`: "Junk Haul Calgary Crew Portal"
- `start_url`: `/portal`
- `scope`: `/`
- `display`: `standalone`
- `orientation`: `portrait`
- `background_color`: `#FAFAFA`
- `theme_color`: `#f97316`
- Icons: `/icon-192.png`, `/icon-512.png`, `/crew-logo.png` (all `any maskable` or `any`).

**`app/layout.js` viewport** (lines 36-42):
- `themeColor`: `#FAFAFA`
- `width`: `device-width`, `initialScale`: 1, `maximumScale`: 1, `viewportFit`: `cover`

The root `<head>` also sets `<meta name="color-scheme" content="light" />` (`app/layout.js` line 126). The manifest is referenced in metadata (`app/layout.js` line 9).

**PWA registration:** `app/layout.js` renders `<PWARegister />` (line 133). `components/PWARegister.js` registers `/sw.js`, shows an iOS "Add to Home Screen" prompt on `/portal` pages (excluding onboarding), and auto-subscribes to push notifications using `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### 4. Tailwind Config

**`tailwind.config.cjs`**: content globs are `app/**/*.{js,jsx}` and `components/**/*.{js,jsx}`. Relevant theme overrides:
- `theme.extend.colors.orange.500`: `#f97316`
- `theme.extend.colors.orange.600`: `#ea580c`
- `theme.extend.fontFamily.sans`: `['var(--font-sans)', 'system-ui', 'sans-serif']`

### 5. Layout Hierarchy

- **Root layout (`app/layout.js`)**: Wraps the whole app. Imports `globals.css`, sets metadata, viewport, `/manifest.json`, and renders `<PWARegister />` before children. The `<head>` declares `<meta name="color-scheme" content="light" />`.
- **Portal layout (`app/portal/layout.js`)**: Client layout under `/portal/*` that forces `data-theme="light"` so the crew portal stays light even on devices in dark mode.
- **Track layout (`app/track/layout.js`)**: Client layout under `/track/*` that forces `data-theme="dark"` for the customer tracking page.

### 6. Next.js Config

**`next.config.mjs`**: Minimal Next.js config. It does not include a PWA plugin, custom headers, or rewrites for the crew app. It only enables:
- `reactStrictMode: true`
- `images.remotePatterns` allowing `**.supabase.co` (for Supabase-hosted images).

*Documentation continues below. More sections can be added as needed.*
