# Production Migration Evidence

Status: blocked. No production Supabase project ref, database URL, service role, or read-only verification access was supplied in this environment.

## Local Evidence

- Migration manifest check passed for 64 files.
- New forward migration: `20260816000001_rehaul_commerce_hardening.sql`
- Checksum: `4189f9f159e896c1ebcda67411934f38e8fc21ffa72fc47562aa0b248d267834`
- No destructive migration was added.

## Required Production Evidence Template

| Migration | Checksum | Applied timestamp | Success | Schema query | RLS query | Index/constraint query | Seed/config status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `20260816000001_rehaul_commerce_hardening.sql` | `4189f9f159e896c1ebcda67411934f38e8fc21ffa72fc47562aa0b248d267834` | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked |

## Verification Queries

Run against the intended production project after confirming a backup:

```sql
select version, name, statements from supabase_migrations.schema_migrations order by version;
select indexname, indexdef from pg_indexes where indexname = 'uq_rehaul_active_inventory_reservation';
select routine_name from information_schema.routines where routine_name in ('rehaul_reserve_listing_in_cart','rehaul_create_order_from_cart');
select tablename, rowsecurity from pg_tables where tablename in ('rehaul_delivery_exceptions','rehaul_tax_config_versions');
select policyname, tablename from pg_policies where tablename in ('rehaul_delivery_exceptions','rehaul_tax_config_versions');
```

## Rollback/Forward-Fix Procedure

Preferred recovery is forward-fix. If the unique index fails because duplicate unreleased reservations already exist, pause checkout, identify duplicate active reservations, release only expired or invalid reservations with an audit note, then re-run the migration. Do not reset or truncate production data.
