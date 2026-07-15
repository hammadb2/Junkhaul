// One-off: runs the bookings photo quote fields migration
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260724_bookings_photo_quote_fields.sql'),
  'utf8'
);

const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres.mvsopvphpuucrbuqsfky:gpyooSTnLW56DGmn@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase. Running bookings photo quote fields migration...');

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
