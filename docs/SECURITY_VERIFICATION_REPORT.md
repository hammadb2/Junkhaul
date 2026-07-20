# Security Verification Report

Status: partial and blocked for release.

## Verified Locally

- `npm run secret-scan` passed: no hardcoded secret patterns or tracked `.env` files found.
- Release workflow was hardened so integration tests cannot be skipped for a release.
- Rehaul delivery pricing now fails closed instead of silently producing free delivery.
- Rehaul reservation/order code no longer trusts client-supplied price.

## Not Verified

- Full permission matrix across unauthenticated/customer/crew/dispatcher/reviewer/warehouse/finance/manager/owner/disabled/revoked/cross-tenant sessions.
- Private media signed access in a deployed build.
- Webhook replay/out-of-order handling for Rehaul orders.
- Rate limits for uploads, AI, quotes, tracking, and auth.
- Build output secret scan, because `npm ci` failed and `.next` was not produced.
- Production RLS policies, because production Supabase access was not supplied.

## High-Risk Findings

- Many app APIs use service-role access server-side; this is acceptable only with complete route-level authorization tests.
- `audit_events` has incompatible migration definitions; databases that applied the earlier table first may not have later governance columns.
- Rehaul public commerce lacks PaymentIntent/webhook authority and reconciliation.
- Admin UI/state coverage is not sufficient for launch operations.

