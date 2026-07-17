# Crew App Backlog

Status values for app impact:
`NO_APP_IMPACT`, `APP_READS_THIS`, `APP_WRITES_THIS`, `APP_RECEIVES_REALTIME_UPDATE`, `APP_REQUIRES_NEW_WORKFLOW`, `APP_REQUIRES_OFFLINE_SUPPORT`.

## CREW-BACKLOG-001 — Donation pickup route visibility

- Business reason: free donation pickup can only happen when approved items fit an existing paid route.
- Backend dependency: `donation_requests`, `donation_route_matches`, `route_plans`, `crew_assignments`.
- Admin dependency: Donations admin review and route-match approval.
- Manager dependency: manager can review donation route fit within scope; cannot create unrestricted exceptions.
- API: future crew endpoint to read assigned donation stops.
- Database records: `donation_requests`, `donation_route_matches`, `timeline_events`.
- Realtime requirement: `APP_RECEIVES_REALTIME_UPDATE` when a donation stop is assigned or cancelled.
- Offline requirement: `APP_REQUIRES_OFFLINE_SUPPORT` for seeing accepted donation stop details after route sync.
- Flutter screens: route list stop card, donation stop detail, proof capture.
- Server validation: only `customer_confirmed`/`assigned` donation requests appear to crew.
- Quo dependency: customer window confirmation must be consumed before assignment.
- Vapi dependency: Vapi may read donation status, but cannot promise pickup.
- Acceptance criteria: crew can see approved donation stop without paid-job price leakage.
- Tests: assigned donation appears; cancelled/expired donation does not.
- Priority: P1.
- Status: APP_REQUIRES_NEW_WORKFLOW.

## CREW-BACKLOG-002 — Donation pickup evidence

- Business reason: admin needs proof of item condition and final destination.
- Backend dependency: `donation_request_photos`, `timeline_events`, future pickup evidence table if needed.
- Admin dependency: donation detail evidence review.
- Manager dependency: manager can review evidence, cannot delete it.
- API: future crew photo upload endpoint linked to donation request.
- Database records: `donation_request_photos`, `timeline_events`, `audit_events`.
- Realtime requirement: `APP_RECEIVES_REALTIME_UPDATE` optional for admin after upload.
- Offline requirement: `APP_REQUIRES_OFFLINE_SUPPORT` for upload queue.
- Flutter screens: before pickup photos, rejection reason, delivered-to-storage/partner proof.
- Server validation: evidence cannot be deleted by manager/employee.
- Quo dependency: customer may be notified after pickup/delivery.
- Vapi dependency: Vapi can summarize pickup evidence.
- Acceptance criteria: pickup/delivery photos are visible in admin timeline.
- Tests: upload creates timeline; delete forbidden.
- Priority: P1.
- Status: APP_WRITES_THIS.

## CREW-BACKLOG-003 — Price ledger read-only display

- Business reason: crew needs current balance without overwriting original quote.
- Backend dependency: `quote_price_ledger`.
- Admin dependency: Booking Detail pricing ledger.
- Manager dependency: manager may review quote; owner-only for refunds.
- API: crew job detail includes latest payable balance.
- Database records: `quote_price_ledger`, `bookings`.
- Realtime requirement: `APP_RECEIVES_REALTIME_UPDATE` if admin changes quote before arrival.
- Offline requirement: `APP_REQUIRES_OFFLINE_SUPPORT` for cached current balance.
- Flutter screens: job payment step.
- Server validation: crew collection writes a new ledger/payment row, never edits initial quote.
- Quo dependency: customer notification for price changes.
- Vapi dependency: can read ledger, not overwrite it.
- Acceptance criteria: original quote remains immutable after crew collection.
- Tests: adjustment creates new row; original row remains.
- Priority: P1.
- Status: APP_READS_THIS.

## CREW-BACKLOG-004 — Timeline event sync

- Business reason: admin must understand every customer/crew/admin event chronologically.
- Backend dependency: `timeline_events`.
- Admin dependency: Booking Detail timeline.
- Manager dependency: manager actions create manager timeline events.
- API: crew workflow endpoints append timeline events.
- Database records: `timeline_events`, domain tables per workflow.
- Realtime requirement: `APP_RECEIVES_REALTIME_UPDATE` for job changes.
- Offline requirement: `APP_REQUIRES_OFFLINE_SUPPORT` with conflict-safe queued events.
- Flutter screens: no separate screen required; workflow actions emit events.
- Server validation: event type and entity required.
- Quo dependency: Quo inbound/outbound appears in same timeline.
- Vapi dependency: Vapi call summaries appear in same timeline.
- Acceptance criteria: en-route/arrived/payment/photo/status actions create events.
- Tests: each crew action emits a timeline event.
- Priority: P1.
- Status: APP_WRITES_THIS.

## CREW-BACKLOG-005 — Manager-scoped operations

- Business reason: managers can run daily operations without owner-only financial authority.
- Backend dependency: `staff_roles`, `permissions`, `manager_scopes`.
- Admin dependency: admin manager creation and scope assignment.
- Manager dependency: manager role policy.
- API: all manager/crew APIs call permission helpers.
- Database records: role and audit tables.
- Realtime requirement: NO_APP_IMPACT initially.
- Offline requirement: NO_APP_IMPACT initially.
- Flutter screens: future manager mode/login surface.
- Server validation: manager cannot approve payroll, refund, delete evidence, change pay rates, or approve own hours.
- Quo dependency: manager can send approved templates only.
- Vapi dependency: Vapi manager actions require scoped permission.
- Acceptance criteria: forbidden actions return 403 and audit denial.
- Tests: permissions matrix.
- Priority: P2.
- Status: APP_REQUIRES_NEW_WORKFLOW.

## CREW-BACKLOG-006 — Campaign/attribution read-only context

- Business reason: crew may need to know if a customer came from donation/hanger campaign, but not manage attribution.
- Backend dependency: `attribution_records`.
- Admin dependency: Marketing and Booking Detail attribution sections.
- Manager dependency: manager can correct attribution only if authorized.
- API: optional crew job detail source label.
- Database records: `attribution_records`, `marketing_campaigns`.
- Realtime requirement: NO_APP_IMPACT.
- Offline requirement: APP_READS_THIS if displayed in job detail.
- Flutter screens: optional source badge.
- Server validation: crew cannot edit attribution.
- Quo dependency: calls/texts can link to same attribution.
- Vapi dependency: Vapi can attach later calls to attribution.
- Acceptance criteria: source badge never replaces admin attribution detail.
- Tests: crew read has no correction fields.
- Priority: P3.
- Status: APP_READS_THIS.
