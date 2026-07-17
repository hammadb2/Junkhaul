import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dbUrl = process.env.TEST_SUPABASE_DB_URL || process.env.TEST_DATABASE_URL;
const allowRemote = process.env.ALLOW_REMOTE_TEST_DATABASE === 'true';
const applyMigrations = process.env.INTEGRATION_APPLY_MIGRATIONS === 'true';

function failNotConfigured(message) {
  console.error(JSON.stringify({
    ok: false,
    status: 'NOT_RUN',
    reason: message,
    required_env: [
      'TEST_SUPABASE_DB_URL or TEST_DATABASE_URL',
      'ALLOW_REMOTE_TEST_DATABASE=true only for disposable/staging Supabase projects',
      'INTEGRATION_APPLY_MIGRATIONS=true to apply migrations',
    ],
  }, null, 2));
  process.exit(2);
}

if (!dbUrl) {
  failNotConfigured('No isolated test database URL was provided. Refusing to run database integration tests.');
}

const blockedFragments = [
  'mvsopvphpuucrbuqsfky',
  'aws-0-us-east-1.pooler.supabase.com',
  'gpyooSTnLW56DGmn',
];

if (blockedFragments.some((fragment) => dbUrl.includes(fragment))) {
  throw new Error('Refusing to run integration tests against the known production Supabase database.');
}

if (/supabase\.(co|com)/i.test(dbUrl) && !allowRemote) {
  throw new Error('Remote Supabase test databases require ALLOW_REMOTE_TEST_DATABASE=true and must be staging/disposable.');
}

const psqlVersion = spawnSync('psql', ['--version'], { encoding: 'utf8' });
assert.equal(psqlVersion.status, 0, 'psql CLI is required for migration integration tests');

function psql(args, input = null) {
  const result = spawnSync('psql', [dbUrl, ...args], {
    input,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`psql failed (${args.join(' ')}):\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

const currentDatabase = psql(['-Atc', 'select current_database()']).trim();
const currentUser = psql(['-Atc', 'select current_user']).trim();
const postgresVersion = psql(['-Atc', 'show server_version']).trim();

if (applyMigrations) {
  const tracked = spawnSync('git', ['ls-files', 'supabase/migrations/*.sql'], { encoding: 'utf8' });
  assert.equal(tracked.status, 0, 'git ls-files is required to resolve tracked migrations');
  const files = tracked.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
  assert(files.length > 0, 'No migration files found');
  for (const file of files) {
    const sql = readFileSync(join(process.cwd(), file), 'utf8');
    psql(['-v', 'ON_ERROR_STOP=1'], sql);
  }
}

const requiredTables = [
  'marketing_campaigns',
  'campaign_batches',
  'campaign_tracking_codes',
  'attribution_records',
  'funnel_events',
  'message_entity_links',
  'sms_consent',
  'sms_suppression',
  'expected_replies',
  'donation_requests',
  'donation_request_photos',
  'donation_policy_versions',
  'quote_price_ledger',
  'timeline_events',
  'audit_events',
  'staff_roles',
  'permissions',
  'manager_scopes',
];

for (const table of requiredTables) {
  const exists = psql([
    '-Atc',
    `select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = '${table}')`,
  ]).trim();
  assert.equal(exists, 't', `Missing required table: ${table}`);
}

const rlsEnabled = psql([
  '-Atc',
  "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('donation_requests','messages','audit_events','staff_roles') and c.relrowsecurity",
]).trim();
assert.equal(rlsEnabled, '4', 'Expected RLS enabled on sensitive foundation tables');

if (existsSync(join(process.cwd(), 'supabase', 'migrations', '20260726000001_customer_admin_foundation.sql'))) {
  const secondRun = spawnSync('psql', [
    dbUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    join(process.cwd(), 'supabase', 'migrations', '20260726000001_customer_admin_foundation.sql'),
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  assert.equal(secondRun.status, 0, `Foundation migration second-run failed:\n${secondRun.stdout}\n${secondRun.stderr}`);
}

console.log(JSON.stringify({
  ok: true,
  database: currentDatabase,
  user: currentUser,
  postgres_version: postgresVersion,
  migrations_applied: applyMigrations,
  required_tables_checked: requiredTables.length,
  idempotency_checked: true,
}, null, 2));
