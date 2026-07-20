# Dependency Advisory Report

Status: blocked by npm registry DNS during this pass. Do not treat advisories as resolved until `npm ci`, `npm audit --audit-level=high`, and the full regression gate pass under Node 22.

## Toolchain Evidence

- Installed Node used for retry: `/opt/homebrew/opt/node@22/bin/node`
- `node --version`: `v22.23.1`
- `npm --version`: `10.9.8`
- `npm ci`: failed twice with `getaddrinfo ENOTFOUND registry.npmjs.org` while fetching `ws-8.21.1.tgz`
- `npm audit --json`: failed with `getaddrinfo ENOTFOUND registry.npmjs.org`

## Advisories From Successful Earlier Audit

| Package | Current version | Dependency path | Severity | Runtime/dev | Advisory | Exploitability in this app | Safe upgrade or mitigation |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `@eslint/plugin-kit` | `0.2.8` | `eslint@9.18.0 -> @eslint/plugin-kit@0.2.8` | High audit threshold reported earlier; advisory text says ReDoS | Development-only | `GHSA-xffm-g5w8-qvg7`, ConfigCommentParser ReDoS | Limited to CI/local lint parsing of repository-controlled config/comments; not reachable from customer traffic | Upgrade ESLint within the 9.x line to a version pulling `@eslint/plugin-kit >=0.3.4`, then run lint/build |
| `@supabase/auth-js` | `2.67.3` | `@supabase/supabase-js@2.48.1 -> @supabase/auth-js@2.67.3` | High audit threshold reported earlier | Runtime | `GHSA-8r88-6cj9-9fh5`, malformed input path routing | Runtime-relevant because browser and server Supabase clients handle auth/session paths | Upgrade `@supabase/supabase-js` deliberately to a patched 2.x version, then run auth, RLS, integration and build tests |
| `uuid` | `9.0.1` | `googleapis@144.0.0 -> googleapis-common@7.2.0 -> gaxios@6.7.1 -> uuid@9.0.1` | Moderate | Runtime dependency, but only used through Google API client | `GHSA-w5hq-g745-h8pq`, missing buffer bounds check when caller provides `buf` for v3/v5/v6 | Low practical exposure unless the app passes attacker-controlled buffers into UUID generation through Google client internals; still fails dependency hygiene | Prefer a non-major Google client path that removes vulnerable `uuid` if available; otherwise document risk and isolate Google Drive usage until a tested major upgrade is planned |

## Deliberate Resolution Plan

1. Restore registry access.
2. Run `npm ci` under Node 22/npm 10.
3. Try targeted non-major upgrades first:
   - `eslint` latest 9.x compatible with `eslint-config-next`.
   - `@supabase/supabase-js` latest patched 2.x.
   - `googleapis` latest version within the existing compatible major if it removes vulnerable `uuid`.
4. If `googleapis` requires a major upgrade, test Google Drive employee document flows explicitly before accepting it.
5. Run: `npm run lint`, `npm run test:unit`, `npm run test:migrations`, `npm run test:integration`, `npm run secret-scan`, `npm run audit`, `npm run build`.

## Regression Status

Not complete. Registry DNS prevented installing patched packages or regenerating `package-lock.json`.

