// One-off: runs supabase/migrations/20260720_travel_fee_truck_size.sql
// against the project's Supabase Postgres instance.
// Use DB_CONNECTION_STRING env var to override (e.g. with the pooler string).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260720_travel_fee_truck_size.sql'),
  'utf8'
);

const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres:gpyooSTnLW56DGmn@db.mvsopvphpuucrbuqsfky.supabase.co:5432/postgres';

(async () => {
  console.log('Connecting to Supabase Postgres...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected. Running migration...\n');
    await client.query(sql);
    console.log('Migration SQL executed.');

    // Verify the columns exist.
    const { rows } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings' AND column_name IN ('travel_fee', 'travel_km', 'truck_size', 'truck_fee') ORDER BY column_name"
    );
    console.log('Verification — new columns on bookings:');
    rows.forEach((r) => console.log(`  ${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
