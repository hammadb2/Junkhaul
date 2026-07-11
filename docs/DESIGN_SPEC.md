# JunkHaul ÔÇö Complete UI Specification for Designer

## BRAND COLORS

| Token | Hex | Usage |
|---|---|---|
| **Accent (Orange)** | `#f97316` | Primary buttons, active states, highlights, links |
| **Accent Dark** | `#ea580c` | Button press/active state |
| **Background Base** | `#0A0A0B` | App background (near-black) |
| **Background Card** | `#161618` | Cards, panels, bottom sheet |
| **Background Elevated** | `#1E1E22` | Modals, popovers |
| **Background Input** | `#1A1A1E` | Input fields |
| **Text Primary** | `rgba(255,255,255,0.90)` | Headlines, body text |
| **Text Secondary** | `rgba(255,255,255,0.60)` | Labels, captions |
| **Text Disabled** | `rgba(255,255,255,0.40)` | Placeholders, disabled |
| **Border Subtle** | `rgba(255,255,255,0.08)` | Input borders, dividers |
| **Border Card** | `rgba(255,255,255,0.06)` | Card borders |
| **Status Green** | `#22C55E` | Success, completed, active, verified |
| **Status Amber** | `#F59E0B` | Pending, in-progress, warnings |
| **Status Red** | `#EF4444` | Errors, rejected, terminated, critical |
| **Status Blue** | `#60A5FA` | Confirmed, scheduled, info |
| **Status Gray** | `#6B7280` | Neutral, off-shift |

### Glass Effects
- Glass bar: `rgba(10,10,11,0.65)` + `backdrop-filter: blur(20px) saturate(180%)`
- Glass button: `rgba(255,255,255,0.08)` + `backdrop-filter: blur(12px)`

### Light Theme (auto-switches via `prefers-color-scheme`)
- Background: `#FAFAFA`, Cards: `#FFFFFF`, Elevated: `#F5F5F7`, Input: `#F0F0F2`
- Text: `rgba(0,0,0,0.90)` / `rgba(0,0,0,0.60)` / `rgba(0,0,0,0.40)`
- Borders: `rgba(0,0,0,0.08)` / `rgba(0,0,0,0.06)`
- Orange accent stays the same `#f97316`

---

## TYPOGRAPHY

- **Font**: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- **Tabular numerals**: `font-variant-numeric: tabular-nums` on all numbers/timers/prices
- **Touch targets**: minimum 48px height for all interactive elements

---

## BORDER RADIUS

| Element | Radius |
|---|---|
| Cards | 16px (`rounded-2xl`) |
| Buttons (primary) | 14px |
| Inputs | 12px |
| Pills/badges | full (`rounded-full`) |
| Small buttons | 10px (`rounded-lg`) |

---

## ANIMATIONS

| Name | Duration | Easing | Usage |
|---|---|---|---|
| `slide-up` | 0.3s | `cubic-bezier(0.16,1,0.3,1)` | Bottom sheet entering |
| `slide-in-right` | 0.25s | `cubic-bezier(0.16,1,0.3,1)` | Slide-over panel |
| `fade-in` | 0.2s | `ease-out` | Modals, popups |
| `celebrate` | 0.6s | `cubic-bezier(0.16,1,0.3,1)` | EOD completion |
| `pulse-ring` | 2s | `ease-out infinite` | GPS location marker |
| `spin` | 1s | `linear infinite` | Loading spinners |
| Button tap | ÔÇö | spring (stiffness:260, damping:20) | `scale(0.97)` on press |

---

## ICON LIBRARY

All icons from **lucide-react**. Full list used across the app:

`Mail, Lock, User, Phone, MapPin, FileText, AlertCircle, Clock, Wallet, LogOut, Navigation, Truck, Calendar, CheckCircle, ChevronDown, ChevronUp, ChevronRight, StickyNote, MapPinOff, Bell, AlertTriangle, ArrowLeft, Upload, Calculator, IdCard, Landmark, FileCheck, Car, TrendingUp, CheckCheck, Info, Radio, Camera, Check, Eraser, CreditCard, Banknote, Trash2, Warehouse, Flag, Send, X, Circle, UserPlus, Heart, PenTool, Sparkles, Plus, Share`

---

# CREW APP (9 SCREENS)

## Screen 1: Login (`/portal`)

**Purpose**: Employee login or signup

**Layout**: Centered card on dark background

**Elements**:
- Logo image (hat) + "Junk Haul" wordmark + "Employee Portal" subtitle
- Tab toggle: **Log In** | **Sign Up** (pill-style tabs)
- Inputs (Log In mode): Email (icon: Mail), Password (icon: Lock)
- Inputs (Sign Up mode): Full Name (icon: User), Email (icon: Mail), Phone (icon: Phone), Password (icon: Lock), SIN optional (icon: FileText), Address (icon: MapPin, with Mapbox autocomplete dropdown)
- Primary button: "Log In" / "Create Account"
- Error banner (icon: AlertCircle, red background)
- Privacy notice: "SIN and banking info are encrypted"
- Auto-redirect to onboarding if not onboarded

---

## Screen 2: Onboarding (`/portal/onboard`)

**Purpose**: 9-step new hire onboarding flow

**Step indicator**: Horizontal progress dots (9 dots, orange = completed)

**Step 0 ÔÇö Welcome / Install App**
- Invite validation (shows: "You're invited to join" + name + email + pay rate)
- "Add to Home Screen" button (icon: Share) ÔÇö PWA install
- "Continue" button

**Step 1 ÔÇö Create Account**
- Password input (icon: Lock) with live validation rules (8+ chars, uppercase, number, special)
- Phone input (icon: Phone)
- Home address input (icon: MapPin) with Mapbox autocomplete dropdown
- "Create Account" button

**Step 2 ÔÇö Document Uploads**
- 4 upload cards, each with icon + label + status:
  - SIN document (icon: FileCheck)
  - Driver's license front (icon: Car)
  - Driver's license back (icon: Car)
  - Selfie (icon: Camera) ÔÇö camera viewfinder
- Each card: tap to upload ÔåÆ shows thumbnail preview ÔåÆ status pill (Uploaded/Verified/Rejected)
- Rejection reason shown if rejected
- "Continue" button (enabled when all uploaded)

**Step 3 ÔÇö TD1 Federal Tax Form**
- Fields: Total income from other employers, Spousal amount, Number of dependents, Other deductions
- Auto-calculated: Total claim amount (basic personal amount $15,705 + additions)
- "Save TD1 Federal" button

**Step 4 ÔÇö TD1 Alberta Tax Form**
- Same fields as Step 3 but provincial amounts
- "Save TD1 Alberta" button

**Step 5 ÔÇö Contract Signature**
- Full contract text (scrollable)
- Signature input (typed name, icon: PenTool)
- "Agree & Sign Contract" button

**Step 6 ÔÇö Banking Info (for direct deposit)**
- Fields: Bank name (icon: Landmark), Institution number, Transit number, Account number
- "Save Banking Info" button

**Step 7 ÔÇö Acknowledgments**
- 4 checkboxes:
  - "I understand I'm responsible for traffic tickets"
  - "I agree to the phone usage policy"
  - "I agree to the data privacy policy"
  - "I acknowledge company card responsibility"
- "Complete Onboarding" button

**Step 8 ÔÇö Done**
- Celebration animation (icon: Sparkles)
- "You're all set, [Name]!"
- "Go to Schedule" button

---

## Screen 3: Schedule (`/portal/schedule`)

**Purpose**: Main hub ÔÇö Uber-driver-style map + job cards

**Layout**: Full-screen dark map (Mapbox dark theme) with glass header bar + draggable bottom sheet

**Glass Header Bar** (floating, blur):
- Left: Employee name + email + online status dot (green/gray)
- Right: Icon buttons ÔÇö Clock (ÔåÆ /portal/clock), FileText (ÔåÆ /portal/documents), Wallet (ÔåÆ /portal/paystubs), Bell with unread badge (ÔåÆ /portal/notifications), LogOut

**Map**:
- Dark theme Mapbox map
- Crew location marker (pulsing orange dot)
- Job location markers (orange pins)
- Route line between jobs

**Bottom Sheet** (draggable, slides up):
- Drag handle (36px gray bar)
- **Today view** (default):
  - Job card per assignment:
    - Address (icon: MapPin)
    - Time window (e.g., "9:00 AM ÔÇô 12:00 PM")
    - Status badge: Confirmed (blue), In Progress (amber), Completed (green)
    - Items list (e.g., "Sofa, mattress, boxes")
    - Customer name
    - "Start Job" button (orange, full width)
    - Expandable: Navigation button (icon: Navigation, opens Apple/Google Maps), Call button (icon: Phone), Notes (icon: StickyNote, expandable)
  - Route info: total distance + duration
  - Earnings estimator: hours ├ù pay_rate = estimated pay
- **Weekly view** (toggle):
  - 7-day horizontal scroll of job cards
  - Each day shows date + number of jobs + condensed cards
- **Bottom toolbar**:
  - Weekly toggle (icon: Calendar)
  - Online/Offline toggle (icon: Circle, green/gray)
  - Report Incident (icon: AlertTriangle, ÔåÆ /portal/incidents)
- **End of Day section** (when all jobs done):
  - Celebration animation
  - EOD summary: total jobs, hours, earnings
  - "Complete EOD" button

**Location permission prompt** (if denied):
- "Enable location" button
- "Allow" / "Not now" buttons

---

## Screen 4: Job Workflow (`/portal/job`)

**Purpose**: 8-step job execution flow

**Step indicator**: 8 dots at top, orange = completed, current = pulsing

**Header**: Back button (icon: ArrowLeft ÔåÆ /portal/schedule), "Report Issue" button (icon: Flag)

**Step 1 ÔÇö En Route**
- Job address (icon: MapPin)
- Customer name
- Items list
- "Mark En Route" button (icon: Navigation) ÔÇö triggers GPS tracking
- GPS coordinates display

**Step 2 ÔÇö Arrived**
- "Mark Arrived" button (icon: MapPin) ÔÇö captures GPS, auto clock-in
- Landfill recommendation (nearest landfill with distance)

**Step 3 ÔÇö Payment**
- Estimated amount display
- Payment method toggle: Card (icon: CreditCard) | Cash (icon: Banknote)
- Amount input (confirmed amount)
- "Confirm Payment" button (icon: Check)

**Step 4 ÔÇö Load Truck**
- "Mark Loaded" button (icon: Truck)
- Take item photos (icon: Camera) ÔÇö camera viewfinder, multiple photos
- Photo thumbnails preview

**Step 5 ÔÇö Route to Drop**
- "Route to Landfill" button (icon: Navigation, opens maps)
- "Route to Storage" button (icon: Warehouse, opens maps)
- Storage facility dropdown (select from list)
- Capacity percentage input (0-100%)

**Step 6 ÔÇö Record Drop**
- "Record Drop" button (icon: Trash2)
- Take capacity photo (icon: Camera) ÔÇö photo of truck after dump
- Photo preview

**Step 7 ÔÇö Customer Signature**
- Customer name input
- Signature canvas (finger/stylus drawing)
- "Clear" button (icon: Eraser)
- "Submit Signature" button (icon: Check)

**Step 8 ÔÇö End of Day (EOD)**
- Odometer reading input
- Fuel level input
- Take dash photo (icon: Camera) ÔÇö dashboard odometer
- Take gas receipt photo (icon: Camera)
- Take dump receipt photo (icon: Camera)
- Gas amount input ($)
- Dump amount input ($)
- "Submit EOD" button (icon: Send) ÔÇö auto clock-out

**Issue Flag Modal** (overlay, accessible from header):
- Issue type selector: Access, Damage, Safety, Customer, Vehicle, Other
- Severity selector: Low, Medium, High
- Description textarea
- "Submit Issue" button
- "Cancel" button

---

## Screen 5: Clock (`/portal/clock`)

**Purpose**: Shift status with live timer

**Layout**: Centered, single-focus

**Elements**:
- Employee name + email
- Status dot (green = on shift, gray = off shift)
- **Activity Ring** (circular progress, like Apple Watch):
  - Live timer inside ring (HH:MM:SS, tabular nums)
  - Ring fills based on shift progress
- "ON SHIFT" / "OFF SHIFT" label
- Shift start time
- Pay period summary card:
  - Total hours (regular)
  - Overtime hours
  - Gross pay (estimated)
- Caption: "Clock in/out is automatic based on job activity"
- Header buttons: Today (ÔåÆ /portal/schedule), Docs (ÔåÆ /portal/documents), Pay (ÔåÆ /portal/paystubs), LogOut

---

## Screen 6: Documents (`/portal/documents`)

**Purpose**: View and manage onboarding documents

**Header**: Back (icon: ArrowLeft ÔåÆ /portal/schedule), LogOut

**Onboarding status strip**: "Onboarding complete" or "Missing: [doc names]"

**Document cards** (one per doc type):
- Icon (varies by type): FileText (contract), Calculator (TD1), IdCard (ID), Landmark (banking), FileCheck (SIN), Car (license)
- Document type label
- Status pill: Verified (green, icon: CheckCircle), Uploaded (amber, icon: Clock), Rejected (red, icon: AlertCircle), Pending (gray)
- Expiry badge (if applicable): color-coded ÔÇö green (>30 days), amber (<30 days), red (<7 days), "Expired" (red)
- Rejection reason (if rejected, expandable)
- Upload button (icon: Upload) ÔÇö file picker (image or PDF)
- Loading spinner during upload

---

## Screen 7: Pay Stubs (`/portal/paystubs`)

**Purpose**: Pay history with expandable details

**Header**: Today (icon: Calendar ÔåÆ /portal/schedule), LogOut

**Empty state**: Wallet icon + "No pay stubs yet"

**Pay stub cards** (accordion, tap to expand):
- Collapsed: Date, deposit status badge (Sent=green, Failed=red, Pending=amber), total hours, net pay amount
- Expanded:
  - Earnings: Regular (hours + $), Overtime (hours + $), Vacation 4% ($), Gross ($)
  - Deductions: CPP, CPP2 (if applicable), EI, Income Tax
  - Net pay (large)
  - YTD section (icon: TrendingUp): YTD gross, YTD CPP, YTD EI, YTD income tax
- Expand/collapse indicator: ChevronDown / ChevronUp

---

## Screen 8: Notifications (`/portal/notifications`)

**Purpose**: In-app notification center

**Header**: Back (icon: ArrowLeft ÔåÆ /portal/schedule), "Mark all read" button (icon: CheckCheck, only when unread > 0)

**Unread count** in header

**Empty state**: Bell icon + "No notifications yet"

**Notification cards**:
- Type icon: Info (icon: Info, blue), Warning (icon: AlertTriangle, amber), Success (icon: CheckCircle, green), Assignment (icon: Calendar, blue), Broadcast (icon: Radio, orange)
- Title
- Body text
- Timestamp (time ago: "5m ago", "2h ago")
- Unread indicator (orange dot, left border)
- ChevronRight (if has link)
- Tap ÔåÆ marks read + navigates to link

---

## Screen 9: Incidents (`/portal/incidents`)

**Purpose**: Report and view safety incidents

**Header**: Back (icon: ArrowLeft ÔåÆ /portal/schedule), "+ Report" button (icon: AlertTriangle)

**Report form** (expandable):
- Incident type selector (6 options with emoji):
  - ­ƒ®╣ Injury
  - ­ƒÜù Vehicle Accident
  - ­ƒÅá Property Damage
  - ÔÜá´©Å Near Miss
  - ­ƒª║ Safety Concern
  - ­ƒôï Other
- Severity selector (4 levels, color-coded):
  - Low (green), Medium (amber), High (red), Critical (red, bold)
- Description (textarea, required)
- Location (optional input)
- Reported to (optional input, e.g., "Supervisor", "911")
- "Submit Report" button
- "Cancel" button

**Success state**: CheckCircle + "Report Filed" confirmation

**Incident history** (list):
- Each card: type emoji + type label, severity color indicator, description, timestamp (time ago), status badge (Reported=amber, Investigating=blue, Resolved=green)
- ChevronRight indicator
- Tap to view details

---

# ADMIN DASHBOARD (13 VIEWS)

## Navigation

Horizontal tab bar at top: Home, Dispatch, Schedule, Earnings, Waitlist, Leads, Growth, Calls, Intel, Referrals, Crew, Config, Audit

**Color scheme**: Same dark theme as crew app. Admin uses Tailwind utility classes with hardcoded hex values matching the crew app palette.

---

## View 1: Home (Command Center)

**Purpose**: AI-powered operations overview

**Sections**:
1. **Stat cards** (4 cards in a row):
   - Today's Jobs (count)
   - To Collect ($ balance due)
   - Collected ($ deposited)
   - Surge bookings (count)
2. **AI Agent Chat**:
   - ­ƒñû header + "can take actions" badge
   - Quick action buttons: "What's happening today?", "Call last frustrated customer", "Send reminder SMS to all confirmed", "Show today's revenue", "Check cron health"
   - Chat input field + "Send" button
   - Message history (user + assistant bubbles)
   - Action results with Ô£ô/Ô£ù indicators
3. **AI Briefing**:
   - Ô£ª header + "cached" badge + age ("5 min ago")
   - "Regenerate" button
   - Briefing text (auto-generated summary)
4. **Urgent Calls (24h)**:
   - Caller phone, sentiment badge, summary
5. **Cron Health**:
   - Job name, minutes since last run
6. **Pending Opportunistic Offers**:
   - Customer phone, discounted price, original price, discount %, expiration

---

## View 2: Dispatch

**Purpose**: Daily route management and booking operations

**Top bar**: Date selector (horizontal scroll of dates), "­ƒù║´©Å Optimise route" button

**Route summary card**:
- Jobs count, Revenue, Est. Profit, Margin %

**Route order list**:
- Each row: position number, customer name, quadrant (N/S/E/W), address, total price, est. profit
- Drag to reorder

**Booking actions** (per booking):
- Confirm, Cancel, Reschedule, Flag/Unflag, Mark No-Show, Mark Paid, Collect Payment, Send SMS, View Timeline
- Booking details: name, phone, address, time, load size, price, balance, status, quadrant, surge mode, no-show risk, lead source

**Manual booking modal**:
- Name, Phone, Email, Address (with autocomplete), Unit, Load size dropdown, Job date, Job time, Same-day checkbox, Stairs input, Freon checkbox + count, Notes
- "Book now" button

---

## View 3: Schedule

**Purpose**: Operating days and time slot management

**Stats bar**: Operating days, Booked, Capacity, Fill rate

**Schedule grid**:
- Each operating day card:
  - Date, day type (Thursday/Sunday)
  - Booked/Max indicator
  - Time slots (9:00, 11:00, 13:00, 15:00) with availability
  - Slot toggle buttons (open/close individual slots)
  - "Remove" button
- "Add operating day" button (date picker)
- Max jobs per slot dropdown (1, 2, 3)
- "Bulk update all" button
- "Apply to all future slots" button
- "Open all" / "Close day" buttons

---

## View 4: Earnings

**Purpose**: Revenue and earnings overview

**Stat cards**: Total earned, In pipeline, Avg job value, Total + pipeline

**Source breakdown**: Bar chart of bookings by source (web, admin, waitlist, referral, etc.)

**Revenue by work day**: Table with date, jobs, revenue, profit

---

## View 5: Waitlist

**Purpose**: Waitlist entries for overflow demand

**Table columns**: Name, Phone, Address, Preferred day (Thursday/Sunday/Either), Load size, Joined date, Notified status

**Actions**: "Notify" button (sends SMS when slot opens)

---

## View 6: Leads

**Purpose**: Captured leads and conversion tracking

**Table columns**: Phone, Session ID, Action (init/convert/out_of_area), Source, UTM params, Created date

---

## View 7: Growth

**Purpose**: Marketing funnel and system health

**Sections**:
1. **Abandonment funnel** (visual bars):
   - Quoted ÔåÆ T+1hr touch ÔåÆ T+20hr touch ÔåÆ T+47hr touch ÔåÆ Booked (converted)
2. **Opportunistic offers table**: Time, Phone, Type, Original price, Discounted price, Discount %
3. **Surge snapshots table**: Slot, Day type, Booked/Max, Fill %, Bucket (days out)
4. **Cron health**: Job name, Last status (finished/failed), Last run time

---

## View 8: Calls

**Purpose**: Phone call history with AI sentiment

**Table columns**: Sentiment badge (frustrated=red, negative=orange, neutral=gray, positive=green), Phone, Caller name, Summary, Date

**Detail modal**: Phone, Name, Sentiment, Ended reason, Date, Full summary, Full transcript, "Call back" button

---

## View 9: Intel (Quadrant Profit)

**Purpose**: Geographic profit analysis by Calgary quadrant (NE, NW, SE, SW)

**Filter**: Time range dropdown (7/30/90 days)

**Quadrant cards** (4):
- Quadrant name
- Total jobs, Revenue (progress bar), Profit (progress bar)
- Completed/Cancelled/No-show counts
- Avg margin %, Avg job value

---

## View 10: Referrals

**Purpose**: Referral program tracking

**Leaderboard**: Referrer phone, completed count, total earned

**Referrals table**: Referrer phone, Referee phone, Status badge (pending/completed/expired), Reward ($), Date

---

## View 11: Crew Management

**Purpose**: Employee management, onboarding, assignments

**Stat cards** (with ring indicators): Total, Active, Pending, Clocked In

**Pending invites section**:
- Each row: Name, Email, Pay rate, Expiry date, "Resend" button (orange)

**Invite form** (expandable):
- First name, Last name, Email, Phone, Pay rate
- "Send invite" button

**Broadcast section**:
- Message textarea
- "Broadcast" button (sends to all crew)

**Employee list**:
- Each row: Name, Status badge (active=green, pending=amber, terminated=red), Clocked-in indicator (pulsing green dot + duration), Email, Onboarding badges (Contract Ô£ô, TD1 Ô£ô, Ack Ô£ô), Pay rate, Period minutes
- Tap ÔåÆ opens slide-over panel

**Employee detail slide-over** (slides in from right):
- Profile: initials avatar, name, email, phone
- Onboarding progress ring (% complete)
- Onboarding details: Status, Hire date, Contract signed, TD1 Federal, TD1 Alberta, Acknowledgments, Address
- "Resend invite link" button (if onboarding incomplete, icon: Send)
- Documents section: list of uploaded docs with view links
- Recent clock sessions: booking ID, clock in ÔåÆ clock out, duration
- Crew assignments: date, driver/secondary role, U-Haul location
- Admin controls: Pay rate input, Status dropdown, Save button
- "Terminate employee" link (red)

**Assignments section**:
- Create assignment form: Date, Driver dropdown, Secondary dropdown, U-Haul location
- Assignment list

**Storage facilities** (expandable):
- Add form: Name, Address (autocomplete), Access code, Capacity (sqft)
- Facility list with edit

**Donation centers** (expandable):
- Add form: Name, Address (autocomplete), Hours
- Center list with edit

---

## View 12: Config (Control Panel)

**Purpose**: System configuration

**Grouped sections** (color-coded):
- **Kill Switches** (red): Boolean toggles for emergency shutoffs
- **Pricing** (green): Base prices for load sizes
- **Surge Pricing** (purple): Multipliers and thresholds
- **Discounts** (blue): Discount percentages
- **No-show Risk** (orange): Risk thresholds and scoring
- **Cancellation** (gray): Cancellation policies
- **Reschedule** (gray): Reschedule rules
- **Abandonment** (yellow): Follow-up timing
- **Referrals** (pink): Reward amounts
- **General** (white): Misc settings

Each item: Label, description, current value, input (toggle/number/text)

"Save changes" button at bottom, unsaved changes warning

---

## View 13: Audit Trail

**Purpose**: System event log

**Filters**: Event type dropdown (All, surge_applied, deadhead_offer_sent, proactive_offer_sent, abandonment_touch1/2/3_sent, review_request_sent, sms_inbound, sms_outbound), Limit dropdown (50/100/250)

**Table columns**: Time, Event type, Booking/Lead ID (first 8 chars), Payload (JSON, truncated)

---

## Modals (shared across admin views)

### Booking Timeline Modal
- Booking info: created date, status, total price, balance due, surge multiplier, no-show risk
- Vertical timeline of events with emoji icons:
  - ÔÜí surge_applied, ­ƒôì offer_sent, ­ƒÆ¼ abandonment_touch, Ô¡É review_request, Ô¼ç´©Å sms_inbound, ÔåÖ sms_outbound, ­ƒÆ░ offer, ÔÜÖ´©Å system_event
- Each event: time, type, label, payload, SMS body

### Call Details Modal
- Phone, name, sentiment, ended reason, date, summary, transcript
- "Call back" button

---

# SHARED COMPONENT PATTERNS

## Buttons
| Type | Style |
|---|---|
| **Primary** | `background: #f97316`, white text, 14px radius, 48px height, `scale(0.98)` on press |
| **Ghost** | Transparent, `rgba(255,255,255,0.60)` text, 1px border `rgba(255,255,255,0.08)`, 14px radius |
| **Glass** | `rgba(255,255,255,0.08)` + blur(12px), used in floating headers |
| **Danger** | `#EF4444` text, underline, no background (terminate/delete actions) |
| **Disabled** | `rgba(249,115,22,0.30)` background, no interaction |

## Cards
- Background: `#161618`
- Border: `1px solid rgba(255,255,255,0.06)`
- Radius: 16px
- Padding: 16-20px

## Inputs
- Background: `#1A1A1E`
- Border: `1px solid rgba(255,255,255,0.08)`, orange on focus
- Radius: 12px
- Height: 48px minimum
- Placeholder: `rgba(255,255,255,0.40)`

## Status Badges
| Status | Background | Text |
|---|---|---|
| Active/Verified/Completed | `rgba(34,197,94,0.15)` | `#22C55E` |
| Pending/In-Progress/Uploaded | `rgba(245,158,11,0.15)` | `#F59E0B` |
| Confirmed/Scheduled | `rgba(59,130,246,0.15)` | `#60A5FA` |
| Rejected/Terminated/Critical | `rgba(239,68,68,0.15)` | `#EF4444` |

## Progress Indicators
- **Dots**: 6px wide ├ù 3px tall, orange (completed) / `rgba(255,255,255,0.06)` (pending)
- **Ring**: SVG circle, orange stroke, percentage in center
- **Bar**: 3px height, `rgba(255,255,255,0.06)` track, orange fill

---

# CUSTOMER-FACING SCREENS (for reference)

## Booking Flow (`/book`) ÔÇö 8 steps
1. Phone number input
2. Address (Mapbox autocomplete, Calgary service area check, apartment detection)
3. Photos (camera upload, AI analysis)
4. Items (itemized list)
5. Load size (4 cards: 1-2 items $99, Small $160, Half $240, Full $380)
6. Schedule (date + time slot selection)
7. Details (name + email + quote summary)
8. Payment ($50 deposit via Stripe, balance on pickup)
9. Confirmation

## Customer Tracking (`/track/[token]`)
- Step tracker (Booked ÔåÆ Confirmed ÔåÆ En Route ÔåÆ Arrived ÔåÆ In Progress ÔåÆ Completed)
- Animated truck on map
- Timeline of events
- Driver info + ETA

## Waitlist (`/waitlist`)
- Name, phone, address (autocomplete), preferred day, load size
- Submit ÔåÆ confirmation

---

# API ENDPOINTS (for reference)

## Crew APIs
- `GET /api/employee/schedule` ÔÇö today's assignments + weekly view
- `POST /api/crew/complete-job` ÔÇö mark job complete with photos/signature/EOD
- `POST /api/crew/collect-payment` ÔÇö record payment
- `GET /api/employee/notifications` ÔÇö notification list
- `POST /api/employee/notifications` ÔÇö mark read
- `POST /api/employee/issues` ÔÇö submit issue flag
- `POST /api/employee/incidents` ÔÇö submit incident report
- `GET /api/employee/onboard/invite` ÔÇö validate invite token
- `POST /api/employee/onboard/invite` ÔÇö accept invite + create account

## Admin APIs
- `GET/POST /api/admin/crew` ÔÇö list employees / send invite
- `GET/PATCH/DELETE /api/admin/crew/[id]` ÔÇö employee detail / update / terminate
- `POST /api/admin/crew/[id]/resend-invite` ÔÇö resend onboarding invite
- `POST /api/admin/crew/assignments` ÔÇö create assignment
- `GET/POST /api/admin/crew/storage` ÔÇö storage facilities
- `GET/POST /api/admin/crew/donation-centers` ÔÇö donation centers
- `GET/POST /api/admin/config` ÔÇö system configuration
- `GET /api/admin/events` ÔÇö audit trail
- `GET /api/admin/call-history` ÔÇö call logs
- `GET /api/admin/referrals` ÔÇö referral tracking
- `GET /api/admin/insights` ÔÇö quadrant profit
- `GET /api/admin/growth` ÔÇö growth funnel
- `GET /api/admin/command-center` ÔÇö AI briefing + stats
- `POST /api/admin/agent` ÔÇö AI agent chat
- `GET /api/admin/payroll/preview` ÔÇö payroll preview
- `POST /api/admin/payroll/approve` ÔÇö approve payroll
- `POST /api/admin/payroll/run` ÔÇö run payroll
- `GET /api/admin/t4s` ÔÇö T4 tax forms
- `GET /api/admin/remittance` ÔÇö tax remittance
- `GET /api/admin/earnings` ÔÇö earnings overview
- `GET /api/admin/bookings` ÔÇö booking list
- `GET /api/admin/bookings/[id]/timeline` ÔÇö booking event timeline
- `POST /api/admin/cancel` ÔÇö cancel booking
- `POST /api/admin/complete` ÔÇö mark booking complete
- `POST /api/admin/no-show` ÔÇö mark no-show
- `POST /api/admin/mark-arrived` ÔÇö mark crew arrived
- `GET /api/admin/leads` ÔÇö lead list
- `GET /api/admin/quadrant-profit` ÔÇö quadrant analysis
