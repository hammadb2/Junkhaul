# Migration history policy

Applied migration files are immutable.

Rules:

- Do not edit, reorder, rename, squash or delete a migration after it has been applied to any shared environment.
- Schema fixes after application must be added in a new forward-only migration.
- Compatibility fixes should use idempotent `ALTER ... IF EXISTS` / `ADD COLUMN IF NOT EXISTS` / `DROP POLICY IF EXISTS` patterns where safe.
- Fresh and upgrade-path migration verification are both required before merging schema work.
- If an old migration is discovered to be non-replayable, document it and add a forward reconciliation migration. Do not silently change the old file.

The branch reconciliation migration is:

- `supabase/migrations/20260727000001_reconcile_legacy_schema.sql`

The foundation migration:

- `supabase/migrations/20260726000001_customer_admin_foundation.sql`

was introduced on `agent/customer-admin-foundation`. It has been applied to the approved verification Supabase environment during branch validation. Treat it as frozen after this correction; future changes should use a newer migration.

## Checking for accidental edits

Run:

```bash
npm run migrations:check
```

The check compares migration file SHA-256 hashes against `supabase/migrations/MANIFEST.json`.
