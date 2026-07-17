# Staging verification notes

Status: `COMPLETE_AND_VERIFIED` for the approved Supabase environment used on 2026-07-17.

## Required environment

Use `.env.integration.example` as the template. The integration harness refuses to run unless:

- `TEST_ENVIRONMENT` is `staging` or `local`.
- `TEST_PROJECT_REF` exactly matches `APPROVED_TEST_PROJECT_REF`.
- `ALLOW_TEST_DATABASE_RESET=true` is set.
- Known production project identifiers are absent from all test URLs/refs unless `ALLOW_APPROVED_PROJECT_CREDENTIALS=true` is explicitly set for an approved project verification run.
- `TEST_DATABASE_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, and `TEST_APP_BASE_URL` are present.

The tested app must point at the same disposable Supabase project and set:

- `QUO_TEST_MODE=true`
- `QUO_WEBHOOK_SIGNING_SECRET` equal to `TEST_QUO_WEBHOOK_SIGNING_SECRET`
- `QUO_WEBHOOK_SIGNATURE_REQUIRED=true` or unset

## Donation photo storage model

- Bucket: `donation-photos`
- Public state: private
- Customer upload method: server route `/api/donation-request/photos`
- Admin read method: authenticated admin route `/api/admin/donations/[id]/photo/[photoId]`, which returns a short-lived signed URL
- Signed URL duration: 300 seconds
- Customer read method: none today
- Storage path: server-generated `{donation_request_id}/{photo_type}/{uuid}.{ext}`
- Original filename: stored only as metadata; never used as a storage path
- Removal/replacement: database row is marked removed/replaced and the private storage object is removed best-effort
- Abandoned drafts: cleanup job is still `NOT_BUILT`; staging tests remove their own objects
- Rejected/completed retention: policy is still `PARTIAL` and must be configured before production

## Migration preflight behavior

The foundation migration raises explicit non-destructive errors for:

- duplicate first-touch attribution rows by `session_id`
- duplicate active expected replies by entity/intent
- duplicate message/entity links
- duplicate initial quote ledger rows by booking

Each error includes a conflict group count and remediation guidance. No business-history rows are deleted automatically.

## Verified environment

- Supabase project ref: `mvsopvphpuucrbuqsfky`
- PostgreSQL: 17.6 via Supabase pooler
- Supabase CLI: 2.109.0
- Node: 22.23.1
- npm: 10.9.8

## Results

- Supabase API: `SUCCEEDS`
- PostgreSQL pooler: `SUCCEEDS`
- Supabase Storage: `SUCCEEDS`
- Service-role operations: `SUCCEEDS`
- Migration tooling: `SUCCEEDS`
- Full migration chain through `20260726000001_customer_admin_foundation.sql`: `PASSED`
- Second-run/idempotent reconciliation verification: `PASSED`
- Duplicate preflight checks: `PASSED`; each check raises a clear blocking error and deletes no rows.
- `npm ci`: `PASSED`
- `npm test`: `PASSED`
- `npm run test:integration`: `PASSED`
- `npm run lint`: `PASSED` with existing warnings
- `npm run build`: `PASSED` with existing warnings
- `npm audit`: 4 low, 4 moderate, 0 high, 0 critical

## Local limitation observed

Earlier in this environment, local Supabase could not start because the Docker socket was not accessible. Verification was therefore completed against the approved Supabase project.

- a disposable remote Supabase project, or
- corrected local Docker permissions.
