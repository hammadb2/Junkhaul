// One-off: runs supabase/migrations/20260719_safety_alerts.sql
// against the project's Supabase Postgres instance via a direct
// pg connection (the /pg endpoint and exec_sql RPC are not enabled
// on this project, so we use the direct connection string).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260719_safety_alerts.sql'),
  'utf8'
);

// Use the direct connection string if provided, otherwise build it
// from the project URL. Override via DB_CONNECTION_STRING env var.
const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres:gpyooSTnLW56DGmn@db.mvsopvphpuucrbuqsfky.supabase.co:5432/postgres';

(async () => {
  console.log('Connecting to Supabase Postgres directly via pg...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected. Running migration...\n');
    await client.query(sql);
    console.log('Migration SQL executed.');

    // Verify the table is queryable.
    const { rows } = await client.query('SELECT count(*) FROM safety_alerts');
    console.log('Verification OK — safety_alerts table is queryable. Row count:', rows[0].count);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
