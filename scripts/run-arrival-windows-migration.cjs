// One-off: runs supabase/migrations/20260723_arrival_windows_landfill_hours.sql
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260723_arrival_windows_landfill_hours.sql'),
  'utf8'
);

const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres.mvsopvphpuucrbuqsfky:gpyooSTnLW56DGmn@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase. Running arrival windows + landfill hours migration...');

  try {
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
