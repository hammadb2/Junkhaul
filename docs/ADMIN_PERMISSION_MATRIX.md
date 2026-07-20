# Admin Permission Matrix

Status labels:

- `SECURED_AND_TESTED`: Staff-session auth and backend permission checks exist, with integration coverage.
- `SECURED_NOT_TESTED`: Staff-session auth and backend permission checks exist; route-specific test coverage is still limited.
- `LEGACY_LOW_RISK`: Legacy route remains only for low-risk login/logout or non-operational compatibility.
- `LEGACY_HIGH_RISK`: Must not remain before merge.
- `DISABLED`: Route is permanently disabled.
- `REMOVE`: Route should be removed.

Manager-scope model:

- Manager scopes are additive by default: a manager may act when any active `allow` scope matches the target booking/date/quadrant/crew/truck/route/shift/daily operation.
- Active `deny` scopes override active `allow` scopes for the same scope key.
- Expired scopes are ignored.
- Multiple scopes combine as a union of active allows, after explicit deny and expiry filtering.
- Owner/admin roles bypass manager-scope checks but still require the route permission.

| Route | Method | Current authentication | Current permission | Intended permission | Allowed roles | Owner-only | Manager allowed | Manager scope required | Sensitive data returned | Audit required | Denied audit required | Migration status | Test coverage | Final classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/admin/add-slots` | POST | Staff session | `schedule.manage` | `schedule.manage` | Owner, Admin, scoped Manager | No | Yes | Date/daily operation | No | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/add-slots` | DELETE | Staff session | `schedule.manage` | `schedule.manage` | Owner, Admin, scoped Manager | No | Yes | Date/daily operation | No | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/agent` | GET/POST | Staff session | `agent.use` | `agent.use` | Owner, Admin | No | No | No | Operational context | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/audit-events` | GET | Staff session | `audit.read` | `audit.read` | Owner, Admin, scoped Manager | No | Yes | Optional entity scope | Redacted audit data | No | Yes | New | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/bookings` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Operational scope for future filtering | Customer/job data | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/bookings/[id]/actions` | POST | Staff session | Per action | Per action | Owner, Admin, scoped Manager | Refund excluded | Yes | Booking/date/quadrant/crew/truck/route/operation | Customer/job data | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/bookings/[id]/detail` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Booking/date/quadrant | Customer/payment/comms data | No | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/bookings/[id]/timeline` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Booking/date/quadrant | Timeline data | No | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/call-history` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Customer/phone scope future | Call history | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/campaigns` | GET/POST/PATCH | Staff session | `campaigns.manage` | `campaigns.manage` | Owner, Admin | No | No | No | Campaign costs/codes | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/cancel` | POST | Staff session | `refunds.issue` | `refunds.issue` | Owner | Yes | No | No | Refund/action result | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/command-center` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Operation/day scope future | Operational data | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/communications` | GET/POST | Staff session | `communications.retry` / `communications.send_approved_sms` | Same | Owner, Admin, scoped Manager | No | Yes | Related entity scope | Customer messages | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/complete` | POST | Staff session | `bookings.complete` | `bookings.complete` | Owner, Admin, scoped Manager | No | Yes | Booking/date/crew | Booking state | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/config` | GET/PATCH | Staff session | `config.read` / `config.manage_sensitive` | Same | Owner for sensitive writes; Admin read | Sensitive writes owner-only | No for sensitive | No | Config values, redacted where sensitive | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/crew` | GET/POST | Staff session | `employees.read` / `employees.create` | Same | Owner, Admin | No | No writes | No | Employee roster redacted | Yes for writes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/crew/[id]` | GET/PATCH/DELETE | Staff session | Employee permissions | Same | Owner/Admin; owner-only terminate/sensitive | Terminate/sensitive owner-only | No | No | Employee data redacted unless owner-only permission | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/crew/[id]/approve` | POST | Staff session | `employee_documents.verify` | `employee_documents.verify` | Owner, Admin, Manager if assigned | No | Yes | Employee/crew scope future | Employee status | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew/[id]/resend-invite` | POST | Staff session | `employees.create` | `employees.create` | Owner, Admin | No | No | No | Employee email | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew/assignments` | GET/POST | Staff session | `crew.assignments.manage` | `crew.assignments.manage` | Owner, Admin, scoped Manager | No | Yes | Crew/date/shift | Crew assignment data | Yes for writes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew/donation-centers` | GET/POST | Staff session | `donation_centers.manage` | `donation_centers.manage` | Owner, Admin | No | No | No | Donation destination data | Yes for writes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew/push` | GET/POST | Staff session | `crew.assignments.manage` | `crew.assignments.manage` | Owner, Admin, scoped Manager | No | Yes | Crew/employee scope | Employee push counts | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew/storage` | GET/POST | Staff session | `storage.manage` | `storage.manage` | Owner, Admin | No | No | No | Storage access metadata | Yes for writes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/crew-locations` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Crew/date/operation future | Live crew locations | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/dispatch-actions` | GET | Staff session | `audit.read` | `audit.read` | Owner, Admin, scoped Manager | No | Yes | Operation scope future | Dispatch audit | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/donations` | GET/POST | Staff session | `donations.review` | `donations.review` | Owner, Admin, scoped Manager | No | Yes | Area/date/operation | Donation customer/photos/review | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/donations/[id]/photo/[photoId]` | GET | Staff session | `donations.review` | `donations.review` | Owner, Admin, scoped Manager | No | Yes | Donation scope future | Signed photo URL | No | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/earnings` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Operation scope future | Revenue summaries | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/employee-docs` | GET/POST | Staff session | Employee-document permissions | Same | Owner/Admin; sensitive owner-only | Sensitive owner-only | Limited verify only | Employee scope future | Redacted/signed docs | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/employees` | GET/POST/PATCH | Staff session | Employee permissions | Same | Owner/Admin | Sensitive owner-only | No | No | Redacted employee data | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/events` | GET | Staff session | `audit.read` | `audit.read` | Owner, Admin, scoped Manager | No | Yes | Entity scope future | System events | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/funnel` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Campaign/operation future | Lead funnel data | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/get-job-photos` | GET | Staff session | `media.view` | `media.view` | Owner, Admin, scoped Manager | No | Yes | Booking/date/crew future | Signed protected media URLs | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/growth` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Campaign/operation future | Growth/offers/leads | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/insights` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin | No | No | No | AI-generated operational summary | Yes when generated | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/leads` | GET | Staff session | `leads.manage` | `leads.manage` | Owner, Admin, scoped Manager | No | Yes | Lead/campaign scope future | Lead/customer data | No | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/leads/[id]` | GET/POST | Staff session | `leads.manage` | `leads.manage` | Owner, Admin, scoped Manager | No | Yes | Lead/campaign scope future | Lead full journey | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/leads/send-sms` | POST | Staff session | `communications.send_approved_sms` | Same | Owner, Admin, scoped Manager | No | Yes | Lead scope future | Message result | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/login` | POST/DELETE | Legacy admin password cookie | Legacy login/logout only | Staff auth migration task | Temporary owner/admin entrypoint | No | No | No | No operational data | No | No | Documented | Manual | `LEGACY_LOW_RISK` |
| `/api/admin/manager-dashboard` | GET/POST | Staff session | `admin.read` / action permissions | Same | Owner, Admin, scoped Manager | No | Yes | Required | Scoped queues | Yes for actions | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/mark-arrived` | POST | Staff session | `bookings.complete` | `bookings.complete` | Owner, Admin, scoped Manager | No | Yes | Booking/crew/date | Booking state | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/marketing` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Campaign scope future | Marketing reporting | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/no-show` | POST | Staff session | `bookings.complete` | `bookings.complete` | Owner, Admin, scoped Manager | No | Yes | Booking/crew/date | Booking state | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/optimise-route` | POST | Staff session | `bookings.assign` | `bookings.assign` | Owner, Admin, scoped Manager | No | Yes | Date/operation | Customer route/order | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/payroll/approve` | POST | Staff session | `payroll.approve` | `payroll.approve` | Owner | Yes | No | No | Payroll status | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/payroll/preview` | GET/POST | Staff session | `payroll.preview` | `payroll.preview` | Owner | Yes | No | No | Payroll values | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/payroll/run` | POST | Staff session | `payroll.generate`/`payroll.send` | Same | Owner | Yes | No | No | Payroll run/send | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/quadrant-profit` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Quadrant scope future | Revenue/profit estimates | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/referrals` | GET | Staff session | `reports.read` | `reports.read` | Owner, Admin, scoped Manager | No | Yes | Campaign scope future | Referral phone/reward data | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/remittance` | GET/PATCH | Staff session | Payroll/tax permissions | Same | Owner | Yes | No | No | Payroll remittance data | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/reschedule` | POST | Staff session | `bookings.reschedule` | `bookings.reschedule` | Owner, Admin, scoped Manager | No | Yes | Booking/date | Booking state | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/safety-incidents` | GET/PATCH | Staff session | `incidents.manage` | `incidents.manage` | Owner, Admin, scoped Manager | No | Yes | Crew/date/operation | Incident details/photos | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/schedule` | GET | Staff session | `admin.read` | `admin.read` | Owner, Admin, scoped Manager | No | Yes | Date/daily operation future | Slot counts only | No | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/schedule` | POST | Staff session | `schedule.manage` | `schedule.manage` | Owner, Admin, scoped Manager | No | Yes | Date/daily operation | Slot config | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/send-sms` | POST | Staff session | `communications.send_approved_sms` | Same | Owner, Admin, scoped Manager | No | Yes | Related entity scope future | Customer message | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/staff-access` | GET/POST | Staff session | `staff_access.manage` | `staff_access.manage` | Owner | Yes | No | No | Roles/scopes/permission history | Yes | Yes | New | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/stripe-branding` | GET/POST | Staff session | `billing.manage` | `billing.manage` | Owner | Yes | No | No | Stripe config state | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/t4s` | GET/PATCH | Staff session | Payroll/tax permissions | Same | Owner | Yes | No | No | Tax forms | Yes | Yes | Migrated | Integration covered | `SECURED_AND_TESTED` |
| `/api/admin/update-notes` | POST | Staff session | `bookings.notes` | `bookings.notes` | Owner, Admin, scoped Manager | No | Yes | Booking scope future | Booking notes | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/upload-crew-photo` | POST | Staff session | `bookings.photos` | `bookings.photos` | Owner, Admin, scoped Manager | No | Yes | Booking/crew/date future | Protected media path | Yes | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |
| `/api/admin/waitlist` | GET/POST | Staff session | `waitlist.manage` | `waitlist.manage` | Owner, Admin, scoped Manager | No | Yes | Date/operation future | Customer waitlist data | Yes for notify | Yes | Migrated | Integration planned | `SECURED_NOT_TESTED` |

No route is currently classified `LEGACY_HIGH_RISK`.
