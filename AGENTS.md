# Junkhaul — Agent Notes

## Admin auth pattern
Every admin API route under `app/api/admin/**` MUST gate requests with the
shared `ADMIN_COOKIE` / `adminToken()` check from `@/lib/adminAuth`:

```js
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}
```

Never use a hardcoded plaintext secret in the request body — that was the
original `/api/admin/run-migration` vulnerability (fixed 2026-07-13).

## Decommissioned: `/api/admin/run-migration`
The runtime migration route has been removed. Schema changes are applied via
versioned files in `supabase/migrations/`. The `escalations` and
`compensation_log` tables are defined in
`supabase/migrations/20260726000001_customer_admin_foundation.sql`.

## Admin visibility gaps (from schema audit, 2026-07-13)
Tables that collect data but have no admin route/UI. Priority order:

- **Safety/liability:** `safety_alerts`, `incident_reports`, `job_issues`, and
  booking-level AI fields (`has_hazmat`, `hazmat_description`, `ai_confidence`,
  `ai_weight_estimate_kg`, `upgrade_pending`, `suggested_load_size`,
  `suggested_price`). Need a review queue with mark-reviewed/resolved.
- **Financial/payroll:** `direct_deposit_log`, `crew_tips`,
  `transaction_receipts`, `payroll_rates` (no admin screen to add CRA rate
  editions).
- **Operational:** `cron_health` (simple status list — would have caught the
  payroll cron miss), `truck_checks`, `gps_overrides`.
- **Customer-facing:** `customer_feedback`, `customer_signatures`,
  `donation_runs` / `storage_drops`, `crew_notifications`.
- **Live crew GPS:** two tables — `crew_location` and `crew_locations`
  (different schemas). Confirm which is live; the other is likely dead code.

## Dead tables (no action needed)
`phone_calls` (superseded by `call_history`), `reviews`, `daily_stats` — zero
references in the codebase.

## Useful commands
- Lint: `npm run lint`
- Build: `npm run build`
- Unit tests: `npm test` (alias for `npm run test:unit`)
- Auth/security tests: `npm run test:security:auth`
- Migration tests: `npm run test:migrations`
- Integration tests: `npm run test:integration` (requires disposable Supabase env)
