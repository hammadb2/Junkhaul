# Dependency Advisories

Last reviewed: 2026-07-17 under Node 22.

Command:

```bash
npm audit --json
```

Summary:

- Low: 4
- Moderate: 4
- High: 0
- Critical: 0

| Package | Dependency chain | Affected version/range | Patched version | Directly reachable | Application risk | Upgrade risk | Planned action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@eslint/plugin-kit` | `eslint -> @eslint/plugin-kit` | `<0.3.4` | via `eslint@9.39.5` | Development tooling only | Low. ReDoS in eslint config comment parsing; not reachable from customer/admin runtime. | Low; npm reports non-major eslint patch available. | Patch in a dedicated dependency-maintenance PR after this merge-readiness branch, then rerun lint/build. Temporary risk accepted. |
| `eslint` | direct dev dependency | `9.10.0 - 9.26.0` | `9.39.5` | Development tooling only | Low. Does not affect deployed runtime. | Low; non-major patch but can affect lint output. | Patch separately with lint verification. Temporary risk accepted. |
| `@supabase/auth-js` | `@supabase/supabase-js -> @supabase/auth-js` | `<=2.69.1` | via `@supabase/supabase-js@2.110.7` | Potentially reachable through Supabase client auth helpers | Low. App primarily uses server/service-role operations and custom employee sessions, but Supabase client is present. | Low-to-moderate; non-major Supabase upgrade but broad SDK surface. | Schedule focused Supabase SDK patch after merge-readiness verification; rerun integration tests against Supabase. |
| `@supabase/supabase-js` | direct dependency | `2.41.1 - 2.49.10 || 2.58.1-canary.0` | `2.110.7` | Runtime dependency | Low. Advisory is through auth-js malformed path routing. | Low-to-moderate because all route/storage/auth behavior must be retested. | Patch separately with Supabase Storage, donation upload, attribution and admin API smoke tests. |
| `uuid` | `googleapis -> googleapis-common -> gaxios -> uuid` | `<11.1.1` | via `googleapis@173.0.0` | Limited; only where Google APIs are used | Moderate. Advisory concerns buffer bounds when caller passes a buffer to v3/v5/v6 UUID APIs. Current application does not pass untrusted buffers to UUID through Google APIs. | High; npm requires major `googleapis` upgrade. | Do not blind-upgrade in this branch. Track as accepted temporary risk; upgrade with Google API smoke tests. |
| `gaxios` | `googleapis -> googleapis-common -> gaxios` | `6.4.0 - 6.7.1` | via transitive update | Limited to Google API code paths | Moderate via `uuid`; not broadly exposed to customer/admin flows. | High if resolved through `googleapis` major upgrade. | Include in Google API dependency-maintenance task. |
| `googleapis-common` | `googleapis -> googleapis-common` | `<=7.2.0` | via `googleapis@173.0.0` | Limited to Google API code paths | Moderate via `uuid`; no direct customer input path identified in operational admin work. | High; requires major `googleapis` update. | Include in Google API dependency-maintenance task. |
| `googleapis` | direct dependency | `33.0.0 - 149.0.0` | `173.0.0` | Limited to Drive/Google API integrations | Moderate through transitive UUID chain. | High; major upgrade may alter auth/client behavior. | Defer to dedicated PR with Google Drive/API smoke tests and rollback plan. Temporary risk accepted for merge if all runtime checks pass. |

Merge stance:

- No high or critical advisory remains.
- Runtime-adjacent Supabase low advisories should be patched soon but should not block this branch if integration tests pass.
- Google API moderate advisories require a major dependency upgrade and are accepted temporarily because the vulnerable path is not directly exposed by the customer/admin operational flows verified in this branch.
