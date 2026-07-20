# Known Limitations

Recommendation: blocked for production. The maximum defensible launch posture is limited internal alpha after Node 22 CI, staging Supabase verification, and manual crew-device testing pass.

## Blocking

- Missing `JUNKHAUL_REHAUL_MASTER_BACKLOG.md`; full acceptance comparison cannot be completed.
- Local Node is `v21.6.0`, but repo requires `>=22.13.0 <23`; `npm ci` fails with `EBADENGINE`.
- No successful final GitHub Actions link is available.
- No staging deployment URL, screenshots, or recorded end-to-end demonstration is available.
- No production Supabase credentials or migration evidence were available.
- Flutter package resolution failed due DNS to `pub.dev`; analyze/tests did not run.
- Rehaul storefront and cart UI are incomplete.
- Rehaul Stripe PaymentIntent/webhook/reconciliation is incomplete.
- Tax policy lacks written owner/accountant approval and runtime configuration.
- Crew app offline/device behavior has not been proven on real Android and iOS.

## Fixed Or Hardened In This Pass

- Release CI no longer treats skipped integration tests as acceptable.
- Rehaul reservation path now targets a lock-based RPC and active-reservation unique index.
- Rehaul order creation now targets an atomic RPC.
- Delivery pricing failure no longer becomes `deliveryFeeCents = 0`; checkout returns `delivery_review_required`.
- Delivery review and tax configuration schema foundations were added.

## Residual Risks

- New RPCs require staging database application and concurrency tests.
- Delivery exception approval workflow is not complete.
- Existing production data may contain duplicate unreleased reservations; migration should be applied first to staging and then production only after backup/preflight.
- Dependency audit reports unresolved advisories.
- Build output was not generated, so private env inlining cannot be ruled out.

