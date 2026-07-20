# Staging Alpha Runbook

Recommendation: blocked for production; internal alpha only after a clean Node 22 CI run, staging Supabase verification, and a complete Rehaul test transaction.

## Local Release-Gate Evidence

Worktree: `/Users/hammadbhatti/Junkhaul-origin-main` at `210afe0a3523da26d688831013e145c0e4ad7655`.

| Command | Result |
| --- | --- |
| `node --version` | Initial default: `v21.6.0`; corrected toolchain: `v22.23.1` via `/opt/homebrew/opt/node@22/bin/node` |
| `npm --version` | Initial default: `10.2.4`; corrected toolchain: `10.9.8` |
| `rm -rf node_modules` | Sandbox rejected literal destructive command; worktree had no `node_modules` before retry |
| `npm ci` | Initial failure: `EBADENGINE`; after Node 22 install, failed twice on DNS: `getaddrinfo ENOTFOUND registry.npmjs.org` fetching `ws-8.21.1.tgz` |
| `npm run migrations:check` | Passed: `Migration history check passed for 64 files.` |
| `npm run lint` | Failed: `eslint: command not found` because install failed |
| `npm run test:unit` | Failed after `auth tests passed`: missing package `sharp` because install failed |
| `npm run test:migrations` | Passed: payroll `47/0`, payment validation `8/0`, migration history passed |
| `npm run test:integration` | Failed: missing `@supabase/supabase-js`; install and test DB unavailable |
| `npm run secret-scan` | Passed |
| `npm run audit` | Earlier default-node run reported advisories; Node 22 retry failed on DNS to npm audit endpoint |
| `npm run build` | Failed: `next: command not found` because install failed |
| `flutter pub get` | Failed: DNS lookup for `pub.dev` |
| `dart run build_runner build --delete-conflicting-outputs` | Failed: DNS lookup for `pub.dev` |
| `dart format --set-exit-if-changed .` | Passed, 124 files formatted, 0 changed; warnings because `flutter_lints` unresolved |
| `flutter analyze` | Failed: DNS lookup for `pub.dev` |
| `flutter test` | Failed: DNS lookup for `pub.dev` |

## Required Staging Run

1. Provision Node `22.13.0` and npm `10.x`.
2. Configure disposable staging Supabase secrets: `TEST_ENVIRONMENT`, `TEST_PROJECT_REF`, `APPROVED_TEST_PROJECT_REF`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, `TEST_SUPABASE_ANON_KEY`, `TEST_DATABASE_URL`, `ALLOW_TEST_DATABASE_RESET=true`, `ALLOW_REMOTE_TEST_DATABASE=true`.
3. Apply migrations to staging after backup.
4. Run the full release gate and require GitHub Actions success.
5. Execute one JunkHaul quote-to-reconciliation path and one Rehaul donation-to-paid-order-to-clean-delivery path.
6. Record failure handling: delivery pricing unavailable, payment failure, duplicate webhook, reservation conflict, offline crew action, route-version conflict.

## Demonstration Records To Capture

Capture test identities, quote inputs, cost breakdown, route version, AI evidence, donation approval, inventory ID, SKU, listing ID, cart ID, reservation ID, Stripe PaymentIntent, webhook event ID, order ID, manifest, crew scans, proof of delivery, actual expenses, reconciliation, final contribution/margin, and audit event IDs.
