# Every Piece of Data Collected — Junk Haul Calgary

## PART 1: CUSTOMER DATA

### TABLE: bookings (the main customer record)
Created when a customer books online, via SMS, or via phone (Vapi).

**Customer identity:**
- name — full name (required)
- phone — phone number (required)
- email — email address (optional)

**Customer location:**
- address — street address (required)
- unit — apartment/unit number (optional)
- city — defaults to "Calgary"
- postal_code — from Mapbox geocoding
- quadrant — NW, NE, SW, or SE (auto-calculated from lat/lng)
- lat — latitude (from geocoding)
- lng — longitude (from geocoding)
- is_apartment — boolean, detected from address type

**Job details:**
- load_size — single_item, quarter, half, full (required)
- base_price — dollar amount before fees
- same_day — boolean, did they want same-day service
- same_day_fee — dollar amount
- stairs — integer, number of flights
- stairs_fee — dollar amount
- has_freon — boolean, is there a fridge/AC/freon item
- freon_fee — dollar amount
- total_price — final total
- dynamic_multiplier — decimal, surge pricing multiplier
- customer_notes — text, customer's own notes about the pickup

**Photos and AI analysis:**
- photos — array of Supabase storage URLs (customer-uploaded photos of their junk)
- photo_skipped — boolean, did they skip the photo step
- description_text — text, if customer described junk in words instead of photos
- ai_load_estimate — what AI estimated the load size to be
- ai_weight_estimate_kg — integer, AI's weight estimate in kg
- ai_confidence — high, medium, or low
- has_hazmat — boolean
- hazmat_description — text, what hazardous material

**Payment:**
- deposit_amount — dollar amount (default $50)
- deposit_paid — boolean
- deposit_paid_at — timestamp
- stripe_payment_intent_id — Stripe ID
- stripe_charge_id — Stripe charge ID
- balance_due — remaining amount
- payment_status — unpaid, paid_card, paid_apple_pay, paid_google_pay, cash_declared, cash_crew
- payment_method — tap, card_manual, cash, apple_pay, google_pay
- payment_collected_at — timestamp
- receipt_sent — boolean

**Scheduling:**
- job_date — date (required)
- job_time — time in HH:MM 24hr (required)
- job_datetime — computed combined timestamp

**Status and lifecycle:**
- status — pending_payment, confirmed, completed, cancelled, rescheduled, no_show
- crew_status — confirmed, en_route, arrived, in_progress, awaiting_payment, complete
- source — web, phone, kijiji, marketplace, referral, vapi, sms
- booking_ref — unique reference like "JH-ABC123"

**Flags and review:**
- flag_for_review — boolean
- flag_reason — text
- upgrade_pending — boolean
- suggested_load_size — text
- suggested_price — integer

**No-show prediction:**
- no_show_risk_score — 0-100
- extra_reminder_sent — boolean
- extra_reminder_sent_at — timestamp

**Cancellation:**
- cancellation_reason — text
- cancelled_by — customer or operator
- cancelled_at — timestamp
- refund_amount — dollar amount
- refund_processed — boolean
- refund_stripe_id — Stripe refund ID

**Rescheduling:**
- original_job_date — date
- original_job_time — time
- reschedule_count — integer

**Communications sent:**
- confirmation_sms_sent — boolean
- morning_reminder_sent — boolean
- review_requested — boolean
- review_requested_at — timestamp
- review_completed — boolean

**Crew tracking:**
- tracking_session_id — text, for real-time GPS tracking
- opportunistic — boolean, was this from a nearby offer
- en_route_at — timestamp
- crew_arrived_at — timestamp
- job_started_at — timestamp
- crew_photos — JSONB array of photos crew took at the job
- crew_photos_taken_at — timestamp

**Notes:**
- notes — internal notes
- operator_notes — operator's notes

**Timestamps:**
- created_at — when booking was made
- updated_at — last modified

---

### TABLE: leads (pre-booking, before they commit)
Created when someone enters their phone on the site but hasn't booked yet.

- phone — phone number
- session_id — browser session ID
- load_size — what they selected
- address — address (if entered)
- photos — array of photo URLs they uploaded during quoting
- ai_price_estimate — integer, AI-estimated price
- ai_load_estimate — text, AI-estimated load size
- job_date — date they were browsing
- job_time — time slot they were looking at
- source — where they came from (web, etc.)
- converted_to_booking_id — UUID, if they eventually booked
- follow_up_sent — boolean, did we text them a follow-up
- follow_up_sent_at — timestamp
- abandonment_sms_sent — boolean, did we text them about abandoning
- created_at — timestamp
- updated_at — timestamp

---

### TABLE: messages (SMS conversation log)
Every SMS sent or received.

- booking_id — linked booking (if any)
- direction — outbound or inbound
- to_number — recipient phone
- from_number — sender phone (our Quo number or customer's)
- message_type — confirmation, reminder, cancellation, upgrade, review, waitlist, noshow, operator_alert, lead_welcome, lead_price_reveal, inbound_forward, refund_request_confirmation, service_request_confirmation, etc.
- body — full text message content
- provider_sid — Quo message ID (used for dedup)
- provider_status — queued, sent, delivered, failed
- sent_at — timestamp

---

### TABLE: phone_calls (Vapi call logs)
Every phone call made/received via Vapi.

- booking_id — linked booking (if any)
- vapi_call_id — Vapi's unique call ID
- caller_number — phone number of the caller
- direction — inbound or outbound
- duration_seconds — integer
- cost_usd — decimal, cost of the call
- transcript — FULL TEXT TRANSCRIPT of the entire phone call
- outcome — how the call ended (ended_reason from Vapi)
- agent_type — booking or customer_service
- created_at — timestamp

---

### TABLE: call_history (detailed call analytics)

- caller_number — phone number (required)
- caller_name — name (if known)
- vapi_call_id — Vapi call ID
- agent_name — which AI agent handled it
- agent_type — text
- call_date — timestamp
- duration_seconds — integer
- call_outcome — text
- call_summary — text summary of the call
- transcript — full transcript
- sentiment — neutral, positive, negative, frustrated
- ended_reason — why the call ended
- booking_ref — linked booking reference
- follow_up_sent — boolean
- created_at — timestamp

---

### TABLE: waitlist (when slots are full)

- name — customer name (required)
- phone — phone number (required)
- preferred_date — date
- preferred_day_type — thursday, sunday, either
- load_size — text
- address — text
- lat — latitude
- lng — longitude
- notified — boolean, were they notified of an opening
- notified_at — timestamp
- converted_to_booking_id — UUID if they got a slot
- offered_nearby_today — boolean, was a nearby offer sent today
- last_nearby_offer_at — timestamp
- expires_at — timestamp (30 days from creation)
- created_at — timestamp

---

### TABLE: nearby_offers (crew offers a slot to nearby waitlist people)

- booking_id — the crew's current booking
- waitlist_id — the waitlist entry being offered to
- customer_phone — phone (required)
- customer_name — name
- offered_at — timestamp
- accepted — boolean, did they accept
- responded_at — timestamp
- offer_expires_at — timestamp
- crew_lat — crew's latitude at time of offer
- crew_lng — crew's longitude
- distance_km — how far the crew was from the waitlist customer
- converted_booking_id — UUID if they accepted and booked

---

### TABLE: reviews

- booking_id — linked booking
- rating — 1 to 5
- comment — text review
- platform — google or internal
- created_at — timestamp

---

### TABLE: service_requests (customer submits a request via /service-request)

- name — customer name (required)
- phone — phone number (required)
- email — email (optional)
- booking_ref — linked booking (optional)
- request_type — category of request
- details — text, what they need (required)
- status — text
- created_at — timestamp

---

### TABLE: refund_requests (customer requests a refund via /refund)

- name — customer name (required)
- phone — phone number (required)
- email — email (optional)
- booking_ref — linked booking (optional)
- reason — text, why they want a refund (required)
- amount_requested — dollar amount (optional)
- status — text
- created_at — timestamp

---

### TABLE: escalations (AI agent escalates a call)

- caller_phone — phone number
- booking_ref — linked booking
- reason — why escalated
- escalated_by — which agent
- created_at — timestamp

---

### TABLE: compensation_log (operator offers compensation)

- booking_ref — linked booking
- caller_phone — phone number
- compensation_type — text
- reason — text
- authorized_by — who authorized it
- created_at — timestamp

---

### TABLE: crew_location (real-time GPS tracking of crew trucks)

- tracking_session_id — unique session ID
- latitude — float (required)
- longitude — float (required)
- heading — direction in degrees
- speed_kmh — float
- accuracy_meters — float
- active_booking_id — which booking they're heading to
- crew_pin_hash — which crew member is broadcasting
- updated_at — timestamp (updates every few seconds)

---

### TABLE: gps_overrides (when GPS fails, crew manually sets location)

- booking_id — linked booking
- reason — why GPS was unavailable
- crew_lat — crew's latitude
- crew_lng — crew's longitude
- job_lat — job site latitude
- job_lng — job site longitude
- distance_meters — calculated distance
- created_at — timestamp

---

### TABLE: daily_stats (aggregated analytics)

- stat_date — date
- total_bookings — integer
- total_revenue — integer
- completed_jobs — integer
- cancelled_jobs — integer
- no_shows — integer
- average_job_value — integer

---

### TABLE: schedule (available time slots)

- slot_date — date
- slot_time — time
- day_type — thursday or sunday
- max_jobs — integer (default 5)
- jobs_booked — integer
- is_available — boolean

---

## PART 2: EMPLOYEE DATA

### TABLE: employees (the crew member record)

**Identity:**
- email — email address (required, unique)
- password_hash — hashed password (required, never plaintext)
- name — full name (required)
- phone — phone number (optional)

**Sensitive (encrypted at rest with AES-256-GCM):**
- sin — Social Insurance Number (stored encrypted as sin_enc)
- sin_enc — the encrypted version of the SIN

**Address:**
- address — home address (optional)

**Employment:**
- hire_date — date (defaults to today)
- status — pending, onboarded, active, terminated
- onboarded_at — timestamp when onboarding completed
- terminated_at — timestamp if terminated

**Payroll configuration:**
- pay_rate — hourly base rate (default $15.00)
- td1_federal_claim — federal TD1 claim amount (default $15,705)
- td1_ab_claim — Alberta TD1 claim amount (default $22,159)
- vacation_pct — vacation pay percentage (default 4.00%)

**Direct deposit banking (encrypted at rest):**
- bank_institution — bank institution number
- bank_transit — transit/routing number
- bank_account — account number
- bank_account_enc — encrypted version of account number

**Google Drive:**
- drive_folder_id — their private folder ID in Drive

**Audit:**
- created_at — timestamp
- updated_at — timestamp

---

### TABLE: employee_documents (onboarding doc index)

- employee_id — linked employee
- doc_type — one of: employment_contract, td1_federal, td1_ab, id, banking_info, other
- status — pending, uploaded, verified, rejected
- drive_file_id — Google Drive file ID (the actual file lives in Drive)
- drive_file_url — direct Drive URL
- uploaded_at — timestamp
- verified_at — timestamp when admin verified
- verified_by — who verified it
- notes — text

**What the actual files contain (uploaded to Google Drive):**
- employment_contract — signed employment contract PDF
- td1_federal — filled federal TD1 tax form
- td1_ab — filled Alberta TD1 tax form
- id — photo of government ID (driver's license, passport, etc.)
- banking_info — void cheque or direct deposit form (contains bank name, transit, account number)
- other — anything else

---

### TABLE: employee_sessions (login sessions)

- token — 32-byte hex random string (the cookie value)
- employee_id — linked employee
- created_at — timestamp
- expires_at — timestamp
- last_seen_at — timestamp

---

### TABLE: timesheets (clock in/out with GPS)

- employee_id — linked employee
- clock_in_at — timestamp (when they clocked in)
- clock_out_at — timestamp (when they clocked out)
- clock_in_lat — latitude at clock-in
- clock_in_lng — longitude at clock-in
- clock_out_lat — latitude at clock-out
- clock_out_lng — longitude at clock-out
- regular_hours — decimal, computed on clock-out
- overtime_hours — decimal, computed on clock-out
- total_hours — decimal
- gross_pay — dollar amount, computed on clock-out
- pay_run_id — set when included in a payroll run
- notes — text
- created_at — timestamp

---

### TABLE: pay_runs (a payroll period run)

- period_start — date
- period_end — date
- status — draft, calculated, approved, paid, closed
- run_at — timestamp
- approved_at — timestamp
- approved_by — who approved it
- paid_at — timestamp
- total_gross — all employees' gross combined
- total_cpp — total CPP deducted
- total_cpp2 — total CPP2 deducted
- total_ei — total EI deducted
- total_fed_tax — total federal tax withheld
- total_ab_tax — total Alberta tax withheld
- total_vacation — total vacation pay
- total_net — all employees' net pay combined
- total_cra_remittance — total owed to CRA (CPP+CPP2+EI+tax)
- remittance_due_date — date (15th of following month)
- remittance_paid — boolean
- remittance_paid_at — timestamp
- edition — which CRA rate edition was used
- notes — text
- created_at — timestamp

---

### TABLE: pay_stubs (per-employee breakdown per pay run)

**Hours:**
- regular_hours — decimal
- overtime_hours — decimal
- total_hours — decimal

**Pay:**
- regular_pay — dollar amount
- overtime_pay — dollar amount
- gross_pay — dollar amount
- vacation_pay — dollar amount

**Deductions:**
- cpp — CPP contribution
- cpp2 — CPP2 contribution
- ei — EI premium
- fed_tax — federal income tax withheld
- ab_tax — Alberta income tax withheld
- total_deductions — sum of all deductions
- net_pay — take-home pay

**Year-to-date totals:**
- ytd_gross — YTD gross earnings
- ytd_cpp — YTD CPP contributions
- ytd_cpp2 — YTD CPP2 contributions
- ytd_ei — YTD EI premiums
- ytd_fed_tax — YTD federal tax
- ytd_ab_tax — YTD Alberta tax
- ytd_vacation — YTD vacation pay
- ytd_insurable_earnings — YTD EI insurable
- ytd_pensionable_earnings — YTD CPP pensionable

**Direct deposit:**
- direct_deposit_status — pending, sent, settled, failed, n/a
- direct_deposit_id — provider transaction ID
- direct_deposit_sent_at — timestamp

**Audit:**
- pay_run_id — linked pay run
- employee_id — linked employee
- created_at — timestamp

---

### TABLE: remittances (CRA source deduction tracking)

- pay_run_id — linked pay run
- due_date — date (15th of following month)
- amount — dollar amount owed to CRA
- status — owed, paid, late
- paid_at — timestamp
- paid_method — online_banking, pre-authorized_debit, manual
- reference — text, payment reference number
- created_at — timestamp

---

### TABLE: direct_deposit_log (EFT transaction audit trail)

- pay_stub_id — linked pay stub
- employee_id — linked employee
- provider — vopay, peoples, plooto
- provider_txn_id — provider's transaction ID
- amount — dollar amount
- status — pending, sent, settled, failed
- raw_response — JSONB, full provider API response
- error — text, error message if failed
- created_at — timestamp
- settled_at — timestamp

---

### TABLE: t4_slips (year-end T4 per employee)

- employee_id — linked employee
- tax_year — integer (e.g. 2026)
- employment_income — Box 14
- cpp_pensionable_earnings — Box 16
- cpp_contribution — Box 17
- ei_insurable_earnings — Box 18
- ei_premium — Box 19
- income_tax_deducted — Box 22
- cpp2_pensionable_earnings — Box 26
- cpp2_contribution — Box 28
- vacation_pay_included — informational
- generated_at — timestamp
- status — generated, filed

---

### TABLE: payroll_rates (CRA rate tables — not personal data)

- edition — e.g. 2026-H1
- effective_from — date
- effective_to — date
- cpp_rate — e.g. 0.0595
- cpp_basic_exemption — annual amount
- cpp_max_pensionable — YMPE
- cpp_max_contribution — computed max
- cpp2_rate — e.g. 0.0400
- cpp2_lower_ceiling — = YMPE
- cpp2_upper_ceiling — YAMPE
- cpp2_max_contribution — computed max
- ei_rate — e.g. 0.0163
- ei_max_insurable — annual
- ei_max_premium — computed max
- fed_brackets — JSONB array of tax brackets
- fed_basic_personal_amount — e.g. $16,452
- ab_brackets — JSONB array
- ab_basic_personal_amount — e.g. $22,769
- fed_cpp_base — T4127 constant
- fed_cpp2_base — T4127 constant
- fed_ei_base — T4127 constant
- fed_ab_tax_reduction — placeholder
- source — "CRA T4127"
- notes — text

---

### TABLE: crew_pin (crew app authentication)

- pin_hash — SHA-256 hash of the crew PIN
- updated_at — timestamp

---

## PART 3: DATA COLLECTED AT EACH TOUCHPOINT

### When a customer visits the website (before booking):
1. Their phone number (entered to get a quote)
2. Their browser session ID (auto-generated)
3. Photos they upload of their junk
4. Address (if they enter it for geocoding)
5. Load size they select
6. AI price estimate and AI load estimate (generated from their photos)

### When a customer books a job:
1. Name (required)
2. Phone (required)
3. Email (optional)
4. Address (required)
5. Unit number (optional)
6. Postal code (auto from geocoding)
7. Latitude/longitude (auto from geocoding)
8. Quadrant (NW/NE/SW/SE, auto)
9. Load size (required)
10. Same-day preference (boolean)
11. Stairs count (integer)
12. Freon items (boolean + count)
13. Photos (array of URLs)
14. Description text (if they described instead of photographing)
15. AI analysis (load estimate, weight estimate, confidence, hazmat detection)
16. Customer notes (free text about the pickup)
17. Job date and time (required)
18. Source (how they found us)
19. Payment info (Stripe payment intent, deposit, balance)

### When a customer texts in (SMS):
1. Their phone number (from the SMS sender)
2. The full text message they sent
3. Photos sent via MMS (stored in Supabase storage)
4. Booking data if the AI creates a booking from the text conversation (name, address, load size, date, time — all extracted by AI from the conversation)

### When a customer calls in (Vapi):
1. Their phone number (caller ID)
2. The full call transcript (every word spoken by both the AI and the customer)
3. Call duration in seconds
4. Call cost in USD
5. Call outcome (how it ended)
6. Which agent handled it
7. Sentiment analysis (neutral, positive, frustrated)
8. Call summary
9. Booking data if the AI creates a booking from the call (name, address, load size, date, time — extracted from conversation)

### When a customer requests service post-booking:
1. Name (required)
2. Phone (required)
3. Email (optional)
4. Booking reference (optional)
5. Request type (category)
6. Details (free text, required)

### When a customer requests a refund:
1. Name (required)
2. Phone (required)
3. Email (optional)
4. Booking reference (optional)
5. Reason (free text, required)
6. Amount requested (optional)

### When a customer joins the waitlist:
1. Name (required)
2. Phone (required)
3. Preferred date (optional)
4. Preferred day type (thursday/sunday/either)
5. Load size (optional)
6. Address (optional)
7. Latitude/longitude (if address provided)

### When a customer leaves a review:
1. Rating (1-5)
2. Comment (text)
3. Platform (google or internal)

### When a customer is tracked (real-time):
1. The crew's GPS location (lat/lng, updated every few seconds)
2. The crew's heading and speed
3. The GPS accuracy in meters

### When an employee signs up at /portal:
1. Name (required)
2. Email (required, unique)
3. Password (required, min 8 chars, stored as hash)
4. Phone (optional)
5. SIN (optional, encrypted with AES-256-GCM at rest)
6. Address (optional)

### When an employee uploads onboarding documents:
1. Employment contract (PDF, stored in Google Drive)
2. Federal TD1 form (PDF, stored in Google Drive)
3. Alberta TD1 form (PDF, stored in Google Drive)
4. Government ID (photo/image, stored in Google Drive)
5. Banking info (void cheque or direct deposit form, stored in Google Drive)
6. Other (any other document, stored in Google Drive)
- Each upload records: file ID, Drive URL, upload timestamp, verification status, who verified it

### When an employee clocks in:
1. Timestamp (auto)
2. GPS latitude (optional, from their phone)
3. GPS longitude (optional, from their phone)

### When an employee clocks out:
1. Timestamp (auto)
2. GPS latitude (optional)
3. GPS longitude (optional)
4. Regular hours (auto-calculated)
5. Overtime hours (auto-calculated)
6. Total hours (auto-calculated)
7. Gross pay (auto-calculated from their rate)

### When payroll is run:
1. All the above timesheet data is aggregated
2. CPP, CPP2, EI, federal tax, Alberta tax are calculated per employee
3. Vacation pay is calculated
4. Net pay is calculated
5. Year-to-date totals are tracked
6. CRA remittance amount is tracked
7. If direct deposit is sent: provider transaction ID, status, raw API response, settlement timestamp

### When T4s are generated (Jan 31):
1. Total employment income for the year
2. Total CPP pensionable earnings and contribution
3. Total EI insurable earnings and premium
4. Total income tax deducted
5. CPP2 earnings and contribution
6. Vacation pay included
