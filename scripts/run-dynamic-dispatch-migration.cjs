// One-off: runs supabase/migrations/20260722_dynamic_dispatch.sql
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260722_dynamic_dispatch.sql'),
  'utf8'
);

const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres.mvsopvphpuucrbuqsfky:gpyooSTnLW56DGmn@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase. Running dynamic dispatch migration...');

  try {
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    // Verify
    try {
      const { rows } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'crew_assignment_id'"
      );
      console.log('crew_assignment_id column exists:', rows.length > 0);

      const { rows: cfg } = await client.query(
        "SELECT key, value FROM system_config WHERE category = 'dispatch' ORDER BY key"
      );
      console.log('Dispatch config rows:', cfg);
    } catch (e) {
      console.error('Verification failed:', e.message);
    }
    await client.end();
    process.exit(0);
  }
})();
