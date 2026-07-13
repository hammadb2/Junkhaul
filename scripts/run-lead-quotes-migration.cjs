// One-off: runs supabase/migrations/20260721_lead_quotes_funnel.sql
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260721_lead_quotes_funnel.sql'),
  'utf8'
);

const connectionString =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres.mvsopvphpuucrbuqsfky:gpyooSTnLW56DGmn@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

(async () => {
  console.log('Connecting to Supabase Postgres...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected. Running migration...\n');
    await client.query(sql);
    console.log('Migration SQL executed.');

    const { rows: tableRows } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lead_quotes' ORDER BY ordinal_position"
    );
    console.log('\nlead_quotes columns:');
    tableRows.forEach((r) => console.log(`  ${r.column_name}: ${r.data_type}`));

    const { rows: leadCols } = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name IN ('last_step_reached', 'last_step_at')"
    );
    console.log('\nNew leads columns:', leadCols.map((r) => r.column_name).join(', '));
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
