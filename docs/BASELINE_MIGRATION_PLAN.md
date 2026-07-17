# Baseline migration plan

Status: planning only. Do not deploy a baseline/squash migration without explicit approval.

## Why this exists

The current historical migration chain contains assumptions from earlier development that make a clean replay from zero different from an upgrade of the production-equivalent schema. Applied historical migrations must remain immutable, so compatibility fixes now go into forward-only migrations.

Fresh replay is therefore a separate baseline project. Existing environments continue forward from their recorded migration history.

## Current canonical production-equivalent schema

The canonical schema for active environments is:

1. Historical migrations as originally applied and recorded in `supabase_migrations.schema_migrations`.
2. Forward reconciliation migration `20260727000001_reconcile_legacy_schema.sql`.
3. Foundation migration `20260726000001_customer_admin_foundation.sql` while this branch remains unmerged.
4. Operational forward migrations added after foundation verification.

Use a live/staging schema dump after the reconciliation and foundation migrations as the reference shape for a future baseline.

## Known historical assumptions

- Some historical migrations use `CREATE TABLE IF NOT EXISTS` and then assume a full table shape.
- Some features were introduced by app code before all compatibility columns were reconciled.
- Some later routes expect columns added by forward migrations that a zero replay may not produce in exactly the same order.
- Storage bucket configuration is partly migration-managed and partly environment-managed.
- Realtime publication membership has evolved over time and must be compared explicitly.

## Tables to verify during baseline design

- `bookings`
- `leads`
- `messages`
- `waitlist`
- `phone_calls`
- `employees`
- `employee_documents`
- `employee_sessions`
- `pay_runs`
- `pay_stubs`
- `remittances`
- `crew_assignments`
- `route_plans`
- `donation_centers`
- `service_requests`
- `refund_requests`
- `escalations`
- `compensation_log`
- `marketing_campaigns`
- `campaign_batches`
- `campaign_tracking_codes`
- `attribution_records`
- `funnel_events`
- `donation_requests`
- `donation_request_photos`
- `quote_price_ledger`
- `timeline_events`
- `audit_events`
- `staff_roles`
- `permissions`
- `staff_role_permissions`
- `staff_role_assignments`
- `manager_scopes`

## Proposed baseline/squash strategy

1. Freeze a verified staging schema after the operational admin phase passes.
2. Dump schema-only SQL from that environment, including:
   - tables
   - columns and types
   - defaults
   - nullability
   - indexes
   - unique constraints
   - foreign keys
   - check constraints
   - triggers
   - RLS enablement
   - RLS policies
   - extensions
   - storage bucket metadata
   - realtime publication membership
3. Create a new baseline migration set for new environments only.
4. Keep existing environments on forward migrations. Do not rewrite their migration history.
5. Add a marker document explaining which path each environment uses:
   - existing production/staging: historical + forward migrations
   - new disposable/local: baseline + post-baseline migrations
6. Update `supabase/migrations/MANIFEST.json` for immutable post-baseline migrations.

## Validation procedure

For the baseline branch:

1. Build an existing-schema database from the approved environment dump.
2. Apply all forward migrations.
3. Build a fresh database from the baseline migration.
4. Apply all post-baseline migrations.
5. Dump both final schemas.
6. Compare:
   - tables
   - columns and types
   - defaults
   - nullability
   - foreign keys
   - check constraints
   - unique constraints
   - indexes
   - triggers
   - RLS state
   - policies
   - storage buckets
   - realtime publication membership
7. Run:
   - `npm run migrations:check`
   - `npm test`
   - `npm run test:integration`
   - `npm run lint`
   - `npm run build`

## Cutover procedure

1. Merge the approved baseline work only after existing forward migrations are deployed.
2. Tag the last historical-forward migration used by existing environments.
3. Document the baseline start version for new environments.
4. Ensure CI tests both:
   - upgrade path for existing environments
   - baseline path for new environments

## Rollback procedure

- Existing environments: rollback only by applying a reviewed forward recovery migration.
- New baseline environments: discard and recreate from the previous approved baseline if no production data exists.
- Never edit or remove applied historical migrations to roll back.

## Manifest update

After baseline approval:

- Historical applied migrations remain immutable.
- Baseline migration files become immutable after first deployment.
- New schema fixes must use new forward migrations.
- Migration files must never be reordered or renamed after deployment.
