# Junk Haul Reliability Master Plan — Phase 1 Baseline

**Prepared:** 2026-07-20 · **Branch:** `reliability/phase-1` (off `main` @ `210afe0`, fetched from `origin` at audit time)
**Method:** Static code inspection only (see "Environment constraint" below — no commands were executed against a live database, Stripe, Quo, or Vapi account). Every status below is graded against actual code in the repository, not against the claims in `Progress and status.md`, which self-reports several areas as `COMPLETE_AND_VERIFIED` that this audit found to be materially incomplete. Where this document disagrees with `Progress and status.md`, this document is authoritative because it cites the specific file/line evidence; `Progress and status.md` cites none.

---

## 0. Environment constraint (read first) — UPDATE: resolved, real Phase 2 results below

**Update:** this sandbox had no system Node.js/npm and no admin rights to run the normal MSI installer (winget install requires elevation, which this shell can't grant). Worked around it with a portable Node 22.14.0 zip distribution (no install/elevation required) fetched directly from `nodejs.org` and unpacked into the session scratch directory — not installed system-wide, not committed to the repo. This let Phase 2 commands actually run for real. Results:

| Command | Result |
|---|---|
| `npm ci` | **Fails on Windows/Linux**: `EBADPLATFORM` — the committed `package-lock.json` only carries the `darwin-arm64` optional build of `@img/sharp`, so strict lockfile installs (`npm ci`, and internally `npm audit fix`) reject on any other OS/CPU. This is a real portability bug in the lockfile, not an environment problem — it would also break a Linux CI runner. `npm install` (looser resolution) works around it and produced one benign lockfile diff (added a missing `"license": "ISC"` field to an existing entry, no version/integrity changes). Recommend regenerating the lockfile from a machine/CI step that installs on both platforms (or at minimum Linux, since that's what CI would use) so `npm ci` works everywhere. |
| `npm test` | **PASS.** `payroll.test.js`: 47/47. `payment-validation.test.js`: 8/8. `foundation.test.js`: 161/161 (attribution, consent/STOP-START, expected-reply matching, donation state machine, roles/permissions, webhook dedup). All three suites are genuinely green — this is real evidence, not a static read. |
| `npm run lint` | **PASS**, warnings only (11× `no-img-element` perf warnings, 3× `react-hooks/exhaustive-deps`). No errors. |
| `npm run build` | **PASS.** Production build completes clean, all routes compile. |
| `npm audit` | **11 vulnerabilities: 4 low, 5 moderate, 1 high, 1 critical.** Critical: `next` (current pin `15.1.9`) has a critical-severity advisory bundle including an **authorization bypass in Next.js Middleware** (GHSA-f82v-jwr5-mffw) — directly relevant here because `middleware.js` is this app's *only* gate for `/admin/*`. Also SSRF via middleware redirects, cache poisoning, XSS in App Router, and a dev-server origin-verification gap. Fixing requires bumping `next` to `15.5.20`+ (outside the current package.json range — a deliberate upgrade + regression pass, not a blind `--force`). High: `brace-expansion` DoS, fixable non-breaking via plain `npm audit fix` (blocked in this session by the same lockfile platform issue as `npm ci` — same root cause, same fix). Moderate: `postcss` (transitively via `next`, same fix), `@supabase/auth-js` (insecure path routing — needs `@supabase/supabase-js` bumped to `2.110.7`), `uuid` (via `googleapis`/`gaxios`, breaking bump). None of these were applied yet — see the new P0 item below.
| Flutter toolchain | Not run — no Android/Xcode toolchain available in this sandbox; needs a machine with those installed. Static findings in section 2.G stand independent of this. |

**New P0, added after this run:** upgrade Next.js off `15.1.9` past the middleware-authorization-bypass advisory, given `middleware.js` is the sole gate protecting every `/admin/*` route. This needs its own careful PR (Next 15.1→15.5 minor bump, full regression pass, not a `--force`), and takes priority alongside the other P0s in section 6.

Also confirmed: several files this brief assumed exist on `main` do not: `.nvmrc`, `.github/workflows/*` (no CI exists on `main` at all), `docs/STAGING_VERIFICATION.md`, `docs/MANUAL_ADMIN_ACCEPTANCE.md`, `docs/ADMIN_PERMISSION_MATRIX.md`, `lib/launchGates.js`, `lib/alerts.js`, `app/api/admin/launch-gates/route.js`, `app/api/admin/alerts/route.js`, `supabase/migrations/MANIFEST.json`. All of them exist **only** on an unmerged remote branch, `origin/agent/rehaul-verification-hardening`, which is a Rehaul-scoped hardening effort (out of scope per your instructions — "do not expand Rehaul"). This explains the mismatch; it is not this audit skipping anything. See section 1.2.

**Also note:** several files this brief assumed exist on `main` do not: `.nvmrc`, `.github/workflows/*` (no CI exists on `main` at all), `docs/STAGING_VERIFICATION.md`, `docs/MANUAL_ADMIN_ACCEPTANCE.md`, `docs/ADMIN_PERMISSION_MATRIX.md`, `lib/launchGates.js`, `lib/alerts.js`, `app/api/admin/launch-gates/route.js`, `app/api/admin/alerts/route.js`, `supabase/migrations/MANIFEST.json`. All of them exist **only** on an unmerged remote branch, `origin/agent/rehaul-verification-hardening`, which is a Rehaul-scoped hardening effort (out of scope per your instructions — "do not expand Rehaul"). This explains the mismatch; it is not this audit skipping anything. See section 1.2.

---

## 1. Repository state (as found, before any Phase-1 changes)

### 1.1 Working tree had pre-existing uncommitted work

When this session started, `main`'s working tree already had **uncommitted modifications and untracked files** (attribution engine, consent/SMS suppression, donation lifecycle, price ledger, timeline events, roles/permission model, a large new migration `20260716_foundation_attribution_messaging_donation.sql`, and its test file). This looks like unfinished prior work-in-progress, not something this audit created. I did not commit, discard, or alter any of it — it now simply carries forward uncommitted on `reliability/phase-1` as well. **It is reflected in the workflow inventory below** (e.g. attribution, consent, donation sections) because it's real code sitting in the tree, but treat its status as more provisional than committed code until someone decides whether to finish and commit it.

### 1.2 29 remote branches exist; only two carry unmerged work

`git fetch` surfaced 29 branches beyond `main` (mostly `agent/*`, `devin/*`, `fix/*` naming, dated 2026-07-17 through 2026-07-20). Checked each for unique commits relative to `main`:

| Branch | Unique commits | What it contains |
|---|---|---|
| `preserve/crew-app-local-work` | 1 (2026-07-17) | **Real, more-complete Flutter crew-app code** — rewires all 9 job-step screens to actually call the backend (signature, payment, item-conditions, storage-drop, landfill), adds a working signature pad, camera service, 8 onboarding screens, job-navigation screen, new domain models (customer/job/payment/signature). Confirmed by diff: `signature_step.dart` on this branch actually invokes `api.submitSignature(...)` from `job_screen.dart`; on `main` the equivalent call is commented out (see section 3.F). |
| `agent/rehaul-verification-hardening` | 3 (2026-07-19) | Rehaul-only: `.github/workflows/release-gate.yml`, `supabase/migrations/MANIFEST.json`, `20260816000001_rehaul_commerce_hardening.sql`, `lib/rehaulOrders.js` changes, several new docs (`STAGING_ALPHA_RUNBOOK.md`, `KNOWN_LIMITATIONS.md`, etc.). Out of scope for Junk Haul reliability work per your instructions, but this is where the CI/release-gate pattern referenced in your brief actually lives — worth reusing the *pattern* for Junk Haul without touching Rehaul code. |
| All other 27 branches | 0 | Fully stale — identical to an old point on `main`'s history, no unique work. Safe to ignore/eventually delete, not touched in this audit. |

**Recommendation (not yet acted on):** `preserve/crew-app-local-work` should almost certainly be merged before the crew app is trusted for real jobs — main's crew job-step screens are non-functional stubs (section 3.F) and this branch already fixes most of it. This is flagged as a P0 decision for you, not something I merged unilaterally, since merging Flutter work this large is a scope decision.

---

## 2. Workflow-by-workflow status

Legend: **COMPLETE_AND_VERIFIED** (working + has passing automated test evidence) · **BUILT_NOT_VERIFIED** (code exists, looks complete, no test proves it) · **PARTIAL** (some paths work, known gaps) · **NOT_BUILT** · **BLOCKED_EXTERNAL** (needs a credential/environment this session doesn't have).

### A. Lead capture & photo quote — **PARTIAL**
- **Frontend:** `app/book/page.js`, `app/book/hanger/`, `app/book/donation/`
- **Backend:** `app/api/capture-lead/route.js`, `app/api/photo-quote/route.js`, `app/api/analyze/route.js`, `app/api/verify-phone/route.js`
- **DB:** `leads`, `lead_quotes`, `photo_quote_cache`, `photo_phashes`, `image_quotes`, `price_ledger` (uncommitted), `phone_verifications`
- **Tests:** none automated for lead capture or photo-quote endpoints. `scripts/test-photo-quote.cjs` exists (untracked) — manual/ad-hoc script, not part of `npm test`.
- **Findings:**
  - `photo_quote_cache` gives idempotent quoting for identical photo sets (hash-based) — good pattern.
  - No test proves AI-failure fallback actually degrades to manual review safely, or that hazmat/overweight/unclear photos are blocked from silent auto-approval — this needs a dedicated test (see P0 list).
  - `lib/priceLedger.js` (uncommitted) is designed to be an append-only immutable ledger, but it isn't wired into `capture-lead` or `photo-quote` routes yet — those routes don't appear to call it, so "quote changes create new ledger entries" (a non-negotiable rule) is **not yet enforced in code**, only scaffolded.
- **External config required:** `GROQ_API_KEY` (photo/description AI), Gemini key referenced in `lib/ai.js`/README but not in `.env.example` — confirm which var name is actually read.
- **Responsible role:** Backend/AI owner. **Launch blocking:** Yes (P0) — immutable pricing history is a non-negotiable rule and is currently unenforced.

### B. Scheduling & slot capacity — **PARTIAL**
- **Frontend:** `app/book/page.js` (schedule step)
- **Backend:** `app/api/slots/route.js`, `app/api/create-booking/route.js`, `lib/slotAvailability.js`, `lib/dispatch.js`, `lib/surge.js`
- **DB:** `schedule`, `bookings`, `slot_demand_snapshots`, `crew_assignments`
- **Tests:** none found for concurrent-booking slot contention. `increment_slot()`/`decrement_slot()` are DB functions (from `0001_init.sql`) — likely atomic at the SQL level, but no integration test proves two simultaneous bookings for the last slot resolve to exactly one winner.
- **Findings:** `create-booking` has no visible idempotency key — if a client retries a POST (e.g. double-tap, network retry) before the first request completes, there is no dedup check found in the route; needs verification.
- **Responsible role:** Backend. **Launch blocking:** Yes (P0) — overselling capacity directly breaks the 24-hour guarantee and customer trust.

### C. 24-hour dispatch guarantee — **PARTIAL**
- **Backend:** `lib/dispatch.js` (dynamic slot-fit engine), `app/api/cron/seed-daily-assignments/route.js`, `app/api/admin/optimise-route/route.js`
- **DB:** `crew_assignments`, `bookings.crew_assignment_id` (migration `20260722_dynamic_dispatch.sql`)
- **Findings:** No `escalation`/alerting path found that fires when a booking is at risk of missing its 24-hour window — `escalations` table exists only as an ad-hoc `CREATE TABLE IF NOT EXISTS` inside `app/api/admin/run-migration/route.js` (never migrated properly — see section 4.1), and nothing in `lib/dispatch.js` or the cron jobs writes to it. The guarantee currently has **no measurable enforcement path**: no job scans "bookings approaching 24h with no crew assignment" and no job pages a human.
- **Responsible role:** Ops/dispatch owner. **Launch blocking:** Yes (P0) — this is the platform's core promise with no enforcement mechanism.

### D. Stripe deposit & payment — **BUILT_NOT_VERIFIED**
- **Frontend:** `app/book/page.js` (pay step), `app/pay/[id]/page.js`
- **Backend:** `app/api/create-booking/route.js` (PaymentIntent creation), `app/api/stripe-webhook/route.js`, `app/api/crew/balance-payment/[booking_id]/route.js`, `app/api/track/[token]/tip/route.js`
- **DB:** `bookings` (payment fields), `transaction_receipts`, `crew_tips`
- **Tests:** `supabase/migrations/payment-validation.test.js` (198 lines, tracked) exists and appears to cover server-side amount/currency validation logic — **not executed this session** (no Node runtime available), so "passes" is unconfirmed.
- **Findings:**
  - `app/api/stripe-webhook/route.js` uses `stripe.webhooks` signature verification (good — rejects unsigned/invalid payloads).
  - No explicit duplicate-event-id dedup check found in the webhook handler — Stripe recommends checking `event.id` against a processed-events table; not present. A duplicate delivery (Stripe explicitly says webhooks can be sent more than once) could double-process a payment_intent.succeeded event unless the booking-confirmation logic is itself idempotent by booking state (needs verification, not confirmed either way from static read).
  - `app/api/admin/stripe-branding/route.js` is a stray one-off admin utility (uploads a business logo, hardcodes a live Stripe account ID `acct_1TpfJQPM0KC3Ztg7` in source) that **bypasses the shared admin permission system entirely** — checks `password !== process.env.ADMIN_PASSWORD` directly in the request body instead of `ADMIN_COOKIE`/`adminToken()`. This violates the AGENTS.md pattern and rule #9 (shared staff permission system). Should be deleted or brought into the standard auth pattern.
- **External config required:** Stripe **test** keys (`sk_test_`/`pk_test_`), `STRIPE_WEBHOOK_SECRET` from a **test-mode** webhook endpoint — do not use production keys for any P0 verification work.
- **Responsible role:** Backend/payments owner. **Launch blocking:** Yes (P0) — payment correctness is non-negotiable.

### E. SMS (Quo) — **PARTIAL**
- **Backend:** `lib/sms.js` (outbound), `app/api/sms-webhook/route.js` (older inbound handler), `app/api/sms/inbound/route.js` (newer inbound handler — **two parallel inbound webhook routes exist**), `lib/consent.js`, `lib/expectedReply.js`
- **DB:** `sms_consent`, `expected_replies`, `message_templates` (all uncommitted, from the foundation migration)
- **Findings:**
  - **Neither** `app/api/sms-webhook/route.js` nor `app/api/sms/inbound/route.js` verifies an inbound signature/secret from Quo — both trust any POST to the URL. Given Quo is the SMS provider, an attacker who discovers the webhook URL could inject fake inbound messages (fake STOP requests suppressing real customers, fake "YES" replies claiming reward offers, etc.).
  - Two inbound routes doing overlapping jobs (STOP/START consent, expected-reply matching) is a duplication risk — unclear which one Quo is actually configured to call in production, and if both are live they could double-process the same inbound message differently.
  - `lib/consent.js` (uncommitted) implements STOP/START suppression as an in-app library — needs confirming it's also enforced in Supabase Edge Functions (the cron-driven `morning-reminders`, `day-summary`, `review-requests` functions mentioned in README live in `supabase/functions/`, outside this Next.js app, and were not part of this repo scan since edge functions aren't in `app/api`). **Not verified** whether edge functions independently check consent before sending.
- **Responsible role:** Backend/comms owner. **Launch blocking:** Yes (P0 for signature verification + consolidating to one inbound route; P1 for edge-function consent audit).

### F. Vapi (voice) — **PARTIAL**
- **Backend:** `app/api/vapi/route.js`, `app/api/vapi-outbound/route.js`, `app/api/assistant-request/route.js`, `lib/vapiTools.js`, `lib/dispatchTools.js`
- **DB:** `phone_calls`, `call_history`, `ai_agent_actions`
- **Findings (significant):**
  - `app/api/vapi/route.js` checks `x-vapi-secret` — good.
  - `app/api/vapi-outbound/route.js` only checks the secret **`if (expectedSecret)`** — i.e., if `VAPI_SERVER_SECRET` is unset in the environment, the check is skipped entirely rather than failing closed. This is the opposite of `lib/cronAuth.js`'s pattern (which fails closed if `CRON_SECRET` is unset) and should be fixed to match.
  - `app/api/assistant-request/route.js` has no signature/secret check found at all.
  - **`phone_calls` vs `call_history` split-brain (verified by grep):** every call-ingestion path (`app/api/quo-calls/route.js`, `app/api/vapi/route.js`, `app/api/vapi-outbound/route.js`, `lib/vapiTools.js`) writes to **`phone_calls`**. Every admin-facing read path (`lib/aiAgent.js` urgent-call feed, `lib/dispatchTools.js`, `app/api/assistant-request/route.js`, `app/api/admin/command-center/route.js`, `app/api/admin/call-history/route.js`, `app/api/admin/insights/route.js`) reads from **`call_history`**, which nothing writes to except a dead `CREATE TABLE` statement in `run-migration`. **This means the admin command-center's "urgent/negative-sentiment call" alerts and the `/admin` call-history page are almost certainly always empty in production right now**, despite calls actually being logged (into the wrong table). This is a concrete, verifiable, high-value bug.
- **Responsible role:** Backend/voice owner. **Launch blocking:** Yes (P0) — this directly breaks the "failed tool calls produce a human escalation" and "call records attach to correct lead/booking" requirements, since the admin views that would show escalations are reading an empty table.

### G. Crew app (Flutter) — **NOT_BUILT** (on `main`); **BUILT_NOT_VERIFIED** (on unmerged `preserve/crew-app-local-work`)
- **Frontend:** `apps/crew_app/lib/src/presentation/features/job/steps/*.dart` (9 steps), `job_screen.dart`, `onboard_screen.dart`
- **Backend:** `app/api/employee/**`, `app/api/crew/**` (all implemented, see section 4.2)
- **Findings — this is the single biggest gap found in this audit:**
  - On `main`, **every one of the 9 job-step screens is a UI shell that never calls its backend endpoint.** Concretely: `before_after_step.dart` and `signature_step.dart` fake photo capture with a hardcoded `'placeholder://...'` string instead of invoking the camera; the `signature` package is declared as a dependency but never imported/used anywhere; `signature_step.dart`'s actual `submitSignature(...)` call is commented out, so **job completion never reaches the backend**; `load_truck_step.dart` has no API call at all (not even commented — fully local state); `payment_step.dart`'s cash-collection and card-resend-link calls are both commented out; `arrived_step.dart`'s item-conditions submission is commented out despite the corresponding `EmployeeApi.submitItemConditions` method existing and being correctly implemented; `route_decision_step.dart`'s landfill lookup and `drop_flow_step.dart`'s storage-facility fetch are both commented out in favor of hardcoded/local-only behavior.
  - **Net effect: on `main`, a crew member using this app cannot actually record a photo, a signature, a payment, an item condition, a truck-load state, or a storage/landfill drop that reaches the server.** Everything after "arrived" is cosmetic.
  - The offline queue (`lib/src/data/offline/offline_queue_service.dart`) has **no idempotency key or dedup mechanism** — replaying a queued action after a timeout will resend it verbatim, risking duplicate clock-ins/signatures/receipts once the screens above are wired up to actually call it. It also silently drops photo/signature file uploads: `_processAction()`'s comment claims multipart upload is handled elsewhere, but the code just sends the JSON payload with no file attached — **photos and signatures captured offline are never actually uploaded**, even when the file path is real.
  - `_routeForType()` doesn't recognize `job_clock_in`/`job_clock_out` action types that its own switch statement defines, meaning those actions would be silently treated as "processed" and deleted from the queue without ever reaching the server (`if (path == null) return;` followed by unconditional deletion in the caller).
  - **No `test/` directory exists in the Flutter app at all** — zero automated tests despite `flutter_test`/`mockito` being declared dependencies.
  - **No CI exists** for the crew app (or for anything) — `.github/workflows/` does not exist anywhere in this repo.
  - **The fix already exists, unmerged:** `preserve/crew-app-local-work` (section 1.2) rewires the job-completion path for real (verified: its `job_screen.dart` calls `_submitSignature()` → `api.submitSignature(...)`), adds a working signature pad and camera service, and adds the 8 onboarding screens that `main`'s `onboard_screen.dart` explicitly states are "Phase 7.2, not yet built." That branch itself still has one `TODO(dev)` noting the signature PNG export needs finishing, so even it is `BUILT_NOT_VERIFIED`, not `COMPLETE_AND_VERIFIED` — but it is a vastly smaller gap to close than starting from `main`.
- **Responsible role:** Mobile/crew-app owner. **Launch blocking:** Yes — **this is the most severe P0 in the entire audit.** The core promise ("crew arrives, takes photos, gets signature, takes payment") does not function end-to-end on `main` today.

### H. Manager/admin permissions — **PARTIAL**
- **Backend:** `middleware.js` (edge-level cookie gate on `/admin/*`), `lib/adminAuth.js`, `lib/roles.js` (uncommitted)
- **Findings:**
  - `middleware.js` correctly gates all of `/admin/*` behind `ADMIN_COOKIE`.
  - `lib/roles.js` (uncommitted, new) defines a real owner/admin/manager/employee permission model with explicit `OWNER_ONLY_ACTIONS` (payroll approve/run/rate-edit, refunds, banking view, employee termination, audit delete, config edit, pricing override) vs `MANAGER_ALLOWED_ACTIONS` — this directly encodes rules #8 and #9 from your brief. **However**, its own top comment says role currently always resolves to `'owner'` for anyone holding the single admin password — the `staff_accounts`/`jh_staff_role` cookie path it's designed for is not wired into the login flow yet (no route sets `jh_staff_role`). **In practice there is currently only one role in production: owner.** Manager-scoped access (assigned crews/routes only) does not yet exist as an enforced boundary anywhere — most `/api/admin/**` routes checked only `ADMIN` (the shared password cookie), not `ROLE`-based scoping.
  - Two routes bypass the shared pattern entirely: `app/api/admin/login/route.js` (expected — it's the login endpoint) and **`app/api/admin/stripe-branding/route.js`** (not expected — see section D).
  - `app/api/admin/run-migration/route.js` still exists as a live route (per `AGENTS.md`'s own pending TODO from 2026-07-13) — it defines `escalations` and `compensation_log` outside any real migration file, which also means those two tables are not in the manifest-tracked schema history at all.
- **Responsible role:** Backend/admin owner. **Launch blocking:** P1 for full manager scoping (fine to launch with owner-only for a small pilot), **P0** for closing the `stripe-branding` bypass and finishing the `escalations`/`compensation_log` migration (rule #11: no schema should live only in an ad-hoc route).

### I. Reconciliation / payroll / closeout — **PARTIAL**
- **Backend:** `app/api/admin/payroll/{preview,run,approve}/route.js`, `app/api/cron/run-payroll/route.js`, `lib/payroll.js`, `lib/payrollRates.js`
- **Tests:** `supabase/migrations/payroll.test.js` (331 lines, tracked) — covers payroll math; not executed this session.
- **Findings:** `app/api/admin/payroll/run/route.js` accepts **either** `ADMIN` cookie **or** `CRON` secret — meaning the payroll-run trigger can come from either a human admin action or the scheduled cron; both paths converge on the same handler, which is a reasonable idempotent-trigger design, but there's no automated test confirming double-triggering (e.g., cron fires while an admin is also mid-approval) can't create two pay runs for the same period.
- **Vercel cron mismatch (verified, concrete bug):** `vercel.json` schedules a cron job at `/api/cron/seed-reviewer-jobs` — **this route does not exist anywhere in the repo** (confirmed via full directory listing of `app/api/cron/*`; the closest real route is `review-request`, singular, different path). This cron will 404 every day at the scheduled time and silently do nothing. Additionally, `vercel.json` only schedules 5 of the 11 `/api/cron/*` routes that exist (`abandonment-followup`, `demand-snapshot`, `generate-t4s`, `opportunistic-offer`, `refresh-rates`, `remittance-reminder`, `review-request` have no Vercel cron trigger at all) — unless something else (Supabase pg_cron, per the README's separate cron table) is calling these Next.js routes directly, several operational jobs (abandonment follow-up SMS, remittance reminders, T4 generation) may never fire in production.
- **Responsible role:** Ops/finance owner. **Launch blocking:** P0 for the broken `seed-reviewer-jobs` cron path and confirming which of the 11 `/api/cron/*` routes are actually wired to a trigger in production (Vercel and/or Supabase pg_cron) — an unwired cron route is silent data corruption waiting to happen (e.g., missed remittance reminders have real CRA financial consequences).

---

## 3. Cross-cutting technical debt (Phase 4 items you specifically asked about)

1. **`rehaul` tenant hardcoding in launch-gates/alerts:** `lib/launchGates.js`, `lib/alerts.js`, `app/api/admin/launch-gates/route.js`, `app/api/admin/alerts/route.js` **do not exist on `main` or this branch at all** — they only exist on `origin/agent/rehaul-verification-hardening`. There is nothing to fix on the Junk Haul side today; this concern applies only to that unmerged Rehaul branch, which is out of scope. No action needed unless/until that branch is merged, at which point the tenant-resolution logic should be audited before merge.
2. **`crew_location` vs `crew_locations`:** confirmed two entirely different live schemas (session-token-keyed vs employee-id-keyed). A 2026-07-20 migration comment claims the singular table is "dead code," but **7 live route files still read/write it** (`crew/location`, `crew/clock-off`, `crew/nearby-opportunities`, `cron/opportunistic-offer`, `employee/nearby-opportunities`, `employee/route-plan`, `employee/route-decision`, `crew/track/[booking_id]`). The PIN-based crew app (`/api/crew/*`) writes exclusively to the singular table; the session-based employee app (`/api/employee/*`) writes exclusively to the plural table. **Which one a customer's tracking page shows depends on which crew-facing app/route the crew member happens to be using** — `app/api/track/[token]/route.js` reads plural only, `app/api/crew/track/[booking_id]/route.js` reads singular only. This is a real, user-facing bug risk, not just tech debt: a customer could see stale/no location depending on which crew login path was used. **Recommendation:** pick one (plural, since it has realtime enabled and is the one the migration comment intends to be canonical) and migrate all 7 singular-table call sites to it, or explicitly document why both must coexist.
3. **`system_events` / `timeline_events` / `audit_events` / `phone_calls` / `call_history`:** `audit_events` doesn't exist anywhere (not a real table, despite being named in your brief — likely conflated with `system_events`, which is the actual immutable audit log). `phone_calls`/`call_history` is a genuine dead-read-path bug (section 2.F). `system_events` and `timeline_events` are both live and serve distinct, non-overlapping purposes (ops/cron audit trail vs customer-facing lead/booking/donation event feed) — no consolidation needed there.
4. **Admin permission system coverage:** the majority of `/api/admin/**` routes correctly use `ADMIN_COOKIE`/`adminToken()`. Two confirmed exceptions: `admin/login` (expected) and `admin/stripe-branding` (not expected, should be fixed/removed). No routes were found with a stale "auth placeholder" comment that skips auth entirely, aside from the webhook/cron routes which correctly use different auth mechanisms appropriate to their caller (Stripe signature, cron secret, Vapi secret) — though as noted, `vapi-outbound` and `assistant-request` have weaker or missing checks.
5. **Migration sequence date sanity:** the newest migration in the directory is dated `20260725` (5 days after today's real date). **No migration is dated in August 2026 or later** — your brief's premise of migrations dated `20260801`–`20260815` does not match what's actually in this repo (that date range only exists on the unrelated Rehaul branch as `20260816000001_rehaul_commerce_hardening.sql`, further out even than what was described). The `20260705`–`20260725` dates appear to be an in-repo convention of using the fictional "current" project date rather than real calendar dates — worth confirming with whoever set that convention, but nothing here suggests migrations were pre-applied to production ahead of schedule; there's no evidence either way since this session has no production DB access.
6. **`supabase/migrations/MANIFEST.json` does not exist on `main` or this branch.** There is currently no way to detect drift between "migrations in this repo" and "migrations actually applied to production" other than manually diffing against whatever Supabase reports — this is a real gap (P0, see list below) since rule #11 depends on being able to trust the migration history is exactly what's live.
7. **Retention/cleanup for abandoned donation drafts and rejected/completed evidence:** `lib/donation.js` (uncommitted) defines the donation state machine, but no cron job or scheduled cleanup was found for abandoned `donation_requests` drafts, and no retention policy exists for rejected donation photos or completed job evidence (photos, signatures). This is undecided territory, not yet a "bug," but should be a P1/P2 decision — indefinite retention of customer photos has both storage-cost and privacy implications.
8. **Dependency advisories:** `docs/DEPENDENCY_ADVISORIES.md` referenced in your brief does not exist in this repo. `npm audit` could not be run this session (no Node). This needs Phase 2 execution in a real environment before any advisory patching can happen.

---

## 4. Existing automated test inventory (static read only — not executed)

| File | Lines | Covers | Run via |
|---|---|---|---|
| `supabase/migrations/payroll.test.js` | 331 | CRA T4127 payroll math | `npm test`, `npm run test:payroll` |
| `supabase/migrations/payment-validation.test.js` | 198 | Stripe amount/currency validation logic | `npm test` (no standalone script) |
| `supabase/migrations/foundation.test.js` | 595 | Attribution, consent/STOP-START, expected-reply matching, donation state machine, manager-vs-owner role gating | `npm test`, `npm run test:foundation` (needs `test-loader.mjs`, itself untracked) |
| `scripts/test-photo-quote.cjs` | — | Photo-quote endpoint, manual/ad-hoc | Not wired into `npm test` |

**No `test:migrations`, `test:security`, or `test:integration` npm scripts exist** — your brief's Phase 2 command list assumes scripts that aren't in `package.json` yet. These would need to be added as part of P0/P1 work, not just run.

**Missing tests (highest priority first):** concurrent slot-booking race, Stripe webhook duplicate/out-of-order delivery, Quo inbound duplicate webhook + signature rejection, crew offline-action replay/dedup, manager-scope boundary enforcement, payroll double-run prevention, AI-provider-unavailable fallback, cron-route wiring/reachability.

---

## 5. External configuration Daniyal must provide before P0 work starts

- Stripe **test-mode** secret/publishable keys + a **test-mode** webhook signing secret (do not reuse production keys for verification work)
- A disposable/staging Supabase project (or confirmation that the current one is safe to write test data to) — this repo's `.env.example` has no separate staging URL documented
- Quo sandbox credentials, or confirmation of how to safely test inbound webhook signature verification without touching real customer numbers
- Vapi sandbox/test assistant + server secret
- Confirmation of the actual production cron trigger mechanism (Vercel cron vs Supabase pg_cron vs both) so the `seed-reviewer-jobs` mismatch and un-scheduled routes (section 2.I) can be root-caused correctly
- A decision on `preserve/crew-app-local-work`: merge it as a P0 prerequisite for crew-app work, or have this audit rebuild the same wiring from scratch on `main`

---

## 6. Prioritized punch list

### P0 — launch blockers (must fix before taking real orders)
1. Wire the 9 crew-app job-step screens to their (already-implemented) backend endpoints — or merge `preserve/crew-app-local-work` and finish its one remaining TODO (signature export). Nothing after "crew arrives" currently reaches the server on `main`.
2. Add idempotency/dedup to the crew-app offline queue (photo/signature multipart upload is currently silently dropped; `job_clock_in`/`job_clock_out` action types are silently unroutable and get deleted without being sent).
3. Fix the `phone_calls`/`call_history` split — either write ingestion to `call_history` or read admin/alert surfaces from `phone_calls`. Admin call escalation views are currently reading an empty table.
4. Fix the broken Vercel cron entry (`/api/cron/seed-reviewer-jobs` → 404) and audit which of the 11 `/api/cron/*` routes actually have a live trigger in production.
5. Add signature/secret verification to `app/api/sms-webhook`, `app/api/sms/inbound`, `app/api/quo-calls`, `app/api/whatsapp-webhook` (POST), and `app/api/assistant-request`; fix `vapi-outbound`'s fail-open secret check to fail closed like `cronAuth.js` does.
6. Consolidate the two inbound-SMS routes (`sms-webhook` vs `sms/inbound`) to one canonical handler.
7. Remove or properly re-gate `app/api/admin/stripe-branding/route.js` (bypasses the shared permission system; hardcodes a live account ID).
8. Move `escalations`/`compensation_log` table definitions out of `app/api/admin/run-migration/route.js` into a real forward-only migration, then delete that route (per `AGENTS.md`'s own standing TODO).
9. Build measurable 24-hour-guarantee enforcement + escalation path — nothing currently watches for at-risk bookings.
10. Add concurrency tests + verify atomicity for slot booking (oversell risk) and payroll run-triggering (double-run risk).
11. Reconcile `crew_location`/`crew_locations` to one canonical table across all 7+ call sites (customer tracking currently depends on which crew app the crew member used).
12. Wire `lib/priceLedger.js` into the actual quote/price-change code paths so immutable pricing history is real, not just scaffolded.
13. Create `supabase/migrations/MANIFEST.json` and a way to verify it against what's actually applied in production.
14. ~~Get Phase 2 (`npm ci`/`test`/`lint`/`build`/`audit`) actually running somewhere~~ — **done, see section 0.** `test`/`lint`/`build` all pass with real evidence. `npm ci` fails cross-platform due to a lockfile issue (see below).
15. **Upgrade `next` off `15.1.9`** — critical-severity advisory bundle includes an authorization bypass in Next.js Middleware, and `middleware.js` is the only thing gating `/admin/*`. Needs a deliberate version bump (target `15.5.20`+) with a full regression pass, not a blind `--force`.
16. Fix the `package-lock.json` cross-platform issue (`npm ci`/`npm audit fix` fail with `EBADPLATFORM` on Windows because the lockfile only carries the `darwin-arm64` optional `sharp` build) — regenerate it somewhere that resolves optional deps for all target platforms, otherwise CI will hit the same failure on a Linux runner.
17. Apply the non-breaking `npm audit fix` for `brace-expansion` (high-severity DoS) once the lockfile issue above is resolved.

### P1 — required during controlled pilot
- Wire `staff_accounts`/manager role cookie into the login flow so `lib/roles.js`'s manager-vs-owner model is actually enforced (today everyone with the admin password is `'owner'`).
- Verify Supabase Edge Functions (`morning-reminders`, `day-summary`, etc., outside this repo scan) independently respect SMS consent/STOP suppression.
- Add `test:migrations`, `test:security`, `test:integration` npm scripts (currently absent).
- Add automated tests for AI-provider-unavailable fallback, Quo-unavailable fallback, Supabase-write-mid-failure handling.
- Decide and document retention/cleanup policy for abandoned donation drafts and rejected/completed evidence photos.
- Add `.github/workflows` CI for both the Next.js app and the crew Flutter app (none exists today) — the Rehaul branch's `release-gate.yml` is a reusable pattern reference, not to be merged as-is.

### P2 — required before scaling
- Consolidate/delete the 27 fully-stale remote branches.
- Full test pyramid per Phase 5 of your brief (unit → route → DB integration → provider fixtures → concurrency → staged e2e).
- Real-device crew app acceptance pass (GPS/geofence behavior currently has zero Flutter-side implementation or tests — confirmed no `geofence` references anywhere in `apps/crew_app/lib`).
- Dependency advisory review once `npm audit` can actually be run.

### P3 — polish / later
- Everything in Rehaul (explicitly deprioritized per your instructions).
- Cleanup of the `theme_preview` screen and other dev-only crew-app scaffolding.
- Reconciling documentation (`Progress and status.md`, `APP_LOGIC.md`) to match actual verified status rather than aspirational status once P0/P1 land.

---

## 7. Stop point

This completes Phase 1. Per your instructions, **no P0 fixes have been started.** Waiting for explicit go-ahead before touching any of the items in section 6.
