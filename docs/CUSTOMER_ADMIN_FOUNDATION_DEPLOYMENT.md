# Customer/Admin Foundation Deployment Plan

## Before merge

Required checks:

1. `npm ci`
2. `npm test`
3. `npm run test:integration`
4. `npm run migrations:check`
5. `npm run lint`
6. `npm run build`
7. `npm audit`

Required review:

- Confirm `docs/ADMIN_PERMISSION_MATRIX.md` has no `LEGACY_HIGH_RISK` route.
- Confirm historical migrations match `supabase/migrations/MANIFEST.json`.
- Confirm new schema changes are forward-only migrations.
- Confirm Storage buckets are private where customer or job photos are stored.
- Confirm Quo webhook signing secret is configured before moving webhook traffic.
- Confirm staff role seed exists for at least one active owner.
- Confirm owner can access Staff Access and Audit sections.

Environment variables:

- Supabase URL, publishable key, service-role key, and direct database URL.
- Stripe secret key, publishable key, and webhook secret.
- Quo API key and webhook signing secret.
- Mapbox token.
- AI provider keys only where enabled by kill switch.
- `NEXT_PUBLIC_SITE_URL`.

Operational seed/config:

- Owner employee session/access.
- Staff roles and permissions.
- Manager scopes for any manager who will operate bookings/donations.
- Private `donation-photos` bucket.
- Private `job-photos` bucket for crew evidence.
- Initial campaign and tracking-code records where door-hanger links are active.

## Deployment order

1. Apply database migrations in repository order.
2. Verify migration manifest.
3. Seed/verify owner, staff roles, permissions, and manager scopes.
4. Verify private Storage buckets and signed URL behavior.
5. Deploy application.
6. Run owner/admin/manager admin smoke tests.
7. Run Quo signed webhook smoke test.
8. Run attribution smoke test for `/book/hanger?code=...`.
9. Run donation draft/photo/upload/submit smoke test.
10. Check admin communications failures, audit viewer, and manager dashboard.

## Smoke-test checklist

- Owner login works.
- Admin login works through staff session.
- Manager sees only scoped manager dashboard records.
- Employee is denied admin APIs.
- Booking Detail opens and an internal note action creates audit/timeline events.
- Lead Detail opens and shows attribution/timeline/comms.
- Campaign and tracking code can be created and duplicate code is rejected.
- Communications panel shows delivered/failed/suppressed messages.
- Safe retry is allowed; unsafe retry is rejected.
- Donation review can request more photos, reject, or offer paid quote.
- Audit viewer shows allowed and denied sensitive actions with redacted payloads.
- No full SIN, bank account, API secret, auth token, or payment token appears in browser responses.

## Rollback and remediation

Application rollback:

- Roll the application deployment back to the previous known-good version.
- Keep database migrations forward-only. Do not destructively roll back shared production schema.

Forward database remediation:

- If a new migration causes an operational issue, create a follow-up migration that safely reconciles schema/state.
- Do not edit or rename already-applied migrations.
- Do not delete audit, timeline, message, photo, attribution, payroll, or evidence history.

Quo rollback:

- Repoint Quo webhook to the previous verified route if canonical route smoke tests fail.
- Keep inbound event records for investigation.
- Keep STOP/START suppression state intact.

Feature disable strategy:

- Disable donation submission or upload UI by app configuration/kill switch if Storage or abuse controls fail.
- Disable communications retry UI if provider delivery or STOP suppression fails.
- Disable campaign-code activation if attribution resolution fails.

## Merge gate

Recommend merge only when:

- Every admin route is classified.
- No high-risk route remains shared-cookie-only.
- Owner-only actions are route-tested.
- Manager scope is route-tested.
- Booking actions work and create audit/timeline.
- Lead actions work and preserve history.
- Campaign CRUD works and preserves tracking history.
- Communications retries are safe.
- Donation review works and uses server-controlled transitions.
- Audit viewer works with redaction.
- Operational integration tests pass.
- Node 22 build passes.
- Migration manifest passes.
- Remaining dependency advisories are documented.
