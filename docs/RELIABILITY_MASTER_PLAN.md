# Junk Haul Reliability Master Plan — Corrected Baseline

**Prepared:** 2026-07-20 (correction pass) · **Branch:** `reliability/phase-1-corrections` (off true `origin/main` @ `b35e6b7`)

## ERRATUM — read this before anything below

The version of this document merged via PR #30 (commit `30b00a7`) was built against a **stale local `main` checkout that was 141 commits behind the real `origin/main`**. I branched off local `main` instead of `origin/main` at the very start of that session and didn't catch it until a live database check turned up ~190 production tables with no corresponding code in what I'd been auditing. That gap represents 16+ already-merged PRs: a full Rehaul commerce platform, dispatch control centre, cost ledger, quote-decision gating, disposal intelligence, physical measurements, daily reconciliation/payroll, a phase-5 admin security/launch-gates/alerts system, and a crew-app "production-safe sync, idempotency, and field capture" overhaul. The real `main` has **197 API routes**, not the ~110 the original document was built against.

**Specific claims in the merged version that were wrong and are retracted here:**
- "No CI exists" — wrong. `.github/workflows/release-gate.yml` and `crew-mobile-build.yml` both exist and are **actually passing** on recent `main` commits (verified via the GitHub Actions API, not just file existence).
- "`docs/STAGING_VERIFICATION.md`, `docs/MANUAL_ADMIN_ACCEPTANCE.md`, `docs/ADMIN_PERMISSION_MATRIX.md`, `.nvmrc` don't exist" — wrong, all exist, and are detailed, evidence-cited documents, not aspirational fluff. See section 2.
- "`lib/launchGates.js`, `lib/alerts.js` don't exist, nothing to investigate for the rehaul-tenant-hardcoding concern" — wrong, and worse: **the concern was correct**. See section 3.1 — this is now a confirmed, still-open bug.
- "Crew app job steps are non-functional UI shells, nothing reaches the backend" — wrong on true `main`. See section 3.4 — this is now confirmed **substantially fixed**.
- "`escalations`/`compensation_log` only defined in the ad-hoc `run-migration` route" — wrong. A real migration exists (`20260726000001_customer_admin_foundation.sql`), and `app/api/admin/run-migration/route.js` is confirmed deleted.
- "`next` is pinned at `15.1.9` with a critical middleware-auth-bypass advisory" — wrong, true `main` is already on `next@15.5.20`.

I'm not deleting the old content because the corrective story matters, but treat everything below section 2 as the current, authoritative picture, and treat anything from the originally-merged version not repeated here as **unverified against the real codebase** — don't act on it without rechecking.

**What this correction pass covers vs. doesn't:** given the codebase is now ~2x the size I originally scoped this against, I prioritized (a) re-verifying every claim from the original document that turned out to be checkable and wrong, (b) spot-checking the specific concerns your brief named, (c) reading the existing engineering docs (which are substantially more rigorous than `Progress and status.md`) rather than re-deriving everything from raw code. I did **not** re-derive a line-by-line status for all 197 routes or all ~90 `lib/*.js` files — that's flagged explicitly in section 4 as remaining work, not silently skipped.

---

## 1. Environment note

Node 22/npm 10 confirmed via `.nvmrc` (`22.13.0`) matching the repo requirement. This sandbox has no system Node install and no admin rights to run an installer; a portable Node 22.14.0 distribution was used for the commands that did run (see section 5). `npm ci` on the corrected branch was not completed in this pass (interrupted) — needs a follow-up run before trusting a "tests pass on true main" claim the way section 5 could show for the stale branch.

---

## 2. Existing engineering docs — use these, don't duplicate them

The real `main` already has documentation that's materially more rigorous than `Progress and status.md` (which is aspirational/self-reported with no cited evidence). Treat these as living, authoritative sources for their scope, not something this master plan needs to re-derive:

- **`docs/ADMIN_PERMISSION_MATRIX.md`** — route-by-route permission classification for every `/api/admin/**` route (auth mechanism, allowed roles, manager-scope requirements, audit requirements, test coverage, final classification: `SECURED_AND_TESTED` / `SECURED_NOT_TESTED` / `LEGACY_LOW_RISK` / `LEGACY_HIGH_RISK` / `DISABLED` / `REMOVE`). No route is currently `LEGACY_HIGH_RISK`. Most routes are `SECURED_NOT_TESTED` (auth/permission checks exist, integration coverage doesn't yet) rather than `SECURED_AND_TESTED` — that's real, itemized remaining work, not a gap in the doc.
- **`docs/STAGING_VERIFICATION.md`** — records a real verification pass against the actual Supabase project (`mvsopvphpuucrbuqsfky` — the same project you gave me pooler credentials for) on 2026-07-17: `npm ci`/`test`/`test:integration`/`lint`/`build` all passed, migration tooling and a duplicate-preflight/hash check passed, `npm audit` was 4 low / 4 moderate / 0 high / 0 critical at that time. It also explicitly flags two unresolved gaps: abandoned-donation-draft cleanup is `NOT_BUILT`, and rejected/completed evidence retention policy is `PARTIAL` — both still worth carrying as open items.
- **`docs/MANUAL_ADMIN_ACCEPTANCE.md`** — a real manual acceptance pass (2026-07-17) with integration-test citations for each check (owner/staff auth, employee correctly blocked with 403, owner-only payroll denial, runtime migration endpoint returns 410, manager-scope deny behavior, audit viewer redaction, etc.). Flags real remaining UX polish: "Booking Detail actions are available through a JSON action payload control, not polished per-action forms" and "Staff Access and Manager Dashboard have functional controls but should receive design polish."
- **`docs/DEPENDENCY_ADVISORIES.md`** — itemized advisory-by-advisory plan (last reviewed 2026-07-17): 0 high/critical at that time, moderate Google API chain advisories deliberately deferred with a stated reason (major-version upgrade risk, not directly reachable from customer/admin flows). **Note: `npm audit` needs rerunning now** — my Phase 2 evidence on the (wrong, stale) branch showed a critical Next.js advisory that doesn't apply to true `main` (already patched there), so this doc's "0 critical" from 2026-07-17 is very plausibly still accurate on true `main`, but should be reconfirmed, not assumed.

**Implication for your original Phase 4 questions:** most of what your brief asked me to investigate (permission system coverage, migration/manifest drift, dependency advisories) already has a real, evidence-based answer living in these docs. The two things that don't — because they're bugs nobody had written up yet — are sections 3.1 and 3.2 below.

---

## 3. Confirmed findings (this pass, direct code + live DB evidence)

### 3.1 `rehaul` tenant hardcoding — CONFIRMED REAL BUG, exactly as your brief suspected

`app/api/admin/launch-gates/route.js` and `app/api/admin/alerts/route.js` both call `getTenantBySlug('rehaul')` unconditionally (lines 5, 20, 33 and 5, 20 respectively) instead of resolving the tenant the request is actually for. `lib/launchGates.js` and `lib/alerts.js` themselves are correctly tenant-parameterized (`ensureLaunchGates({ tenantId, ... })` etc.) — the bug is only in the two route files.

Confirmed via live DB read (read-only, against the Supabase project you gave me the pooler URL for): the `tenants` table has two rows —
```
junkhaul  (id 7af06a04-6924-4b05-a0d6-5b099024365a)
rehaul    (id e1a32d51-83cd-4bfa-97e2-d2d31d94f6aa)
```
`launch_gates` and `alerts` are both currently **empty** (0 rows each) — so this hasn't visibly broken anything yet in the UI, but the moment anyone calls these routes, every launch gate and every operational alert will be created and readable only under the `rehaul` tenant ID. **Junk Haul's own launch-readiness gates and operational alerts can never be created or read through these routes as written.** Given rule "Junk Haul launch reliability takes priority over Rehaul," this needs to resolve the tenant from the request (session/staff context, or an explicit `tenant` param) instead of hardcoding it.

### 3.2 Inbound SMS/Quo webhook: THREE parallel handlers, not two

Original finding said two duplicate inbound SMS routes existed. Correction: there are now **three**:

| Route | Signature verification | Status |
|---|---|---|
| `app/api/sms-webhook/route.js` | **None** — no secret/signature check found anywhere in the file | Legacy, still live |
| `app/api/sms/inbound/route.js` | `verifyRequest()` checks `QUO_WEBHOOK_SECRET`, but **fails open**: `if (!secret) return true; // No secret configured (dev) — allow` (line 60) | Legacy, still live, self-describes as "the canonical Quo inbound router" in its own header comment despite this |
| `app/api/quo/inbound/route.js` | Uses `lib/quoWebhookAuth.js` — real HMAC-SHA256 signature verification with timestamp tolerance and `crypto.timingSafeEqual` constant-time comparison. This is a properly built, secure implementation. | New, appears to be the intended real canonical route |

The secure implementation (`lib/quoWebhookAuth.js` + `app/api/quo/inbound/route.js`) already exists and is well-built — this isn't a "build security from scratch" task, it's a **consolidation** task: retire the two legacy routes (or at minimum verify which one Quo's dashboard actually points at, then delete the other two) so there's exactly one inbound webhook and it's the secure one. Don't guess which URL is live in Quo's config — ask before deleting either legacy route, since a wrong guess breaks live SMS.

### 3.3 Vercel cron config still references a nonexistent route

`vercel.json` still schedules `/api/cron/seed-reviewer-jobs` (daily, `30 12 * * *`) — this route does not exist anywhere in `app/api/cron/**` (confirmed via directory listing on true `main`; the closest real route is `review-request`, singular). This cron 404s every day. Unlike the other corrections in this document, this one is unchanged from the original finding — it's still broken on true `main`.

### 3.4 Crew app job-completion flow — CONFIRMED SUBSTANTIALLY FIXED (original finding was wrong)

Checked `job_screen.dart` directly: the signature step's `onComplete` callback now calls `_submitSignature()`, which calls `api.submitSignature(bookingId, customerNameTyped, amountConfirmed, paymentMethod, routeId, routeVersion)` via `employeeApiProvider`, with a documented fallback to enqueue for offline retry on failure. Cash payment collection (`api.collectCashPayment`), payment-link resend (`api.resendPaymentLink`), and item-condition submission (`api.submitItemConditions`) are all real, wired API calls with route/version context attached — not the commented-out/local-only stubs the original finding described. `signature_step.dart` itself still has one `TODO(dev)` about exporting the actual signature PNG client-side, so treat that specific piece as `PARTIAL`, not fully closed.

**Not yet re-verified in this pass** (see section 4): the remaining job steps (truck-loading, drop-flow/storage, route-decision/landfill), the offline queue's idempotency-key behavior, and whether photo/signature files actually upload via multipart now (vs. the JSON-only-no-file-attached issue in the original finding). Given how wrong the original blanket "nothing works" claim turned out to be, don't assume the remaining steps are still broken either — they need a direct look, not an inference either direction.

### 3.5 `escalations`/`compensation_log` — CONFIRMED RESOLVED

Both tables are now defined in `supabase/migrations/20260726000001_customer_admin_foundation.sql`, a real forward migration. `app/api/admin/run-migration/route.js` is confirmed absent from the true `main` tree (`docs/MANUAL_ADMIN_ACCEPTANCE.md` independently confirms this — "Runtime migration endpoint disabled... owner receives `410`" is a *different*, deliberately-disabled placeholder, not the old vulnerable route).

### 3.6 Dependency/CI state — CONFIRMED RESOLVED (original findings were wrong)

`package.json` on true `main` pins `"next": "15.5.20"` — the critical middleware-authorization-bypass advisory that applied to `15.1.9` does not apply here. GitHub Actions "Release Quality Gate" has genuinely run and passed on recent `main` commits, including the merge of PR #30 itself (`b35e6b7`, success) — confirmed via the Actions API, not just reading the workflow YAML. `npm run test:unit` on true `main` runs **19** test files (`auth`, `foundation`, `donation-intelligence`, `route-versioning`, `unitConversions`, `costConfig`, `costLedger`, `quoteDecision`, `routeEngine`, `disposal`, `itemEvidence`, `aiQuality`, `physicalMeasurements`, `dispatch`, `crewSync`, `reconciliation`, `rehaul`, `donations`, `rehaulCommerce`, `phase5`), a much larger and more current suite than the 3-file suite I evaluated on the stale branch. There's also now `test:migrations`, `test:integration`, `test:security`, `migrations:check`, `secret-scan`, and `audit` npm scripts that didn't exist on the stale branch.

---

## 4. Not yet re-verified — explicit gaps, not silent ones

These were part of the original document's findings and I have **not** rechecked them against true `main` yet. Do not treat either the old finding or an assumption that it's "probably fixed like everything else" as reliable — both directions have been wrong at least once already this session:

- `crew_location` (singular) vs `crew_locations` (plural) duplication — does `supabase/migrations/20260807000001_crew_production_safe.sql` consolidate these, or do both still exist as separate live schemas?
- `phone_calls` vs `call_history` write/read split.
- Full 9-step crew job flow (only signature/payment/item-conditions spot-checked; truck-loading, drop-flow, route-decision not yet rechecked).
- Offline queue idempotency-key and multipart file-upload behavior specifically.
- `supabase/migrations/MANIFEST.json` structure and whether it matches the directory 1:1; what `supabase/migrations/20260727000001_reconcile_legacy_schema.sql` actually reconciles (referenced by `docs/STAGING_VERIFICATION.md` as handling "upgrade-path reconciliation" — I haven't read it).
- Whether `npm run migrations:check` (`scripts/check-migration-history.js`) would actually catch the "production `schema_migrations` table only lists 0001/0002 while ~190 tables exist" situation I found via direct DB read, or whether it's a repo-internal-only check that wouldn't catch live drift.
- 24-hour dispatch guarantee enforcement/escalation path.
- Full concurrency/idempotency guarantees for Stripe webhooks and payroll runs.
- A fresh `npm ci`/`test`/`lint`/`build`/`audit` run against this corrected branch (started, interrupted, not completed).

---

## 5. Phase 2 evidence — needs to be rerun against the corrected branch

The real command output in the previously-merged version (216/216 tests passing, lint/build clean, 11 audit findings including a critical `next` advisory) was **all gathered against the stale, wrong branch** and does not describe true `main`. It's retracted, not carried forward. A fresh run against `reliability/phase-1-corrections` is needed before any test-evidence claim in this document can cite real numbers again.

---

## 6. Updated priority list

**P0 — launch blockers, confirmed still open:**
1. Fix `rehaul` tenant hardcoding in `app/api/admin/launch-gates/route.js` and `app/api/admin/alerts/route.js` (section 3.1).
2. Consolidate the three inbound SMS/Quo webhook routes to the one secure one (section 3.2) — needs a decision on which URL Quo is actually configured to call before deleting anything.
3. Fix the `vercel.json` → `/api/cron/seed-reviewer-jobs` broken cron path (section 3.3).
4. Complete section 4's re-verification list, prioritizing `crew_location`/`crew_locations` and `phone_calls`/`call_history` (both were confirmed real splits in the old audit; unknown if still true).
5. Re-run Phase 2 commands against the corrected branch for real evidence.

**Retracted from the old P0 list (confirmed resolved, no longer P0):** Next.js critical vuln, crew app "nothing reaches the backend," `escalations`/`compensation_log` migration, `run-migration` route decommission, "no CI exists."

**Everything else from the original P1–P3 lists:** unverified either way against true `main` — needs the section 4 work before it can be re-prioritized honestly.

---

## 7. Stop point

This correction pass is not a complete re-audit of the expanded codebase — see section 4 for what's still open. Given how much of the original document turned out to be wrong in both directions (things I said existed that didn't, and things I said were broken that are now fixed), I'd rather hand back a smaller set of confirmed, evidence-backed findings than a complete-looking document with unverified filler. Recommend treating section 4 as the next work item before resuming P0 fixes on the items not yet confirmed.
