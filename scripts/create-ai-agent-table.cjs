const { createClient } = require('@supabase/supabase-js');

// Load env from .env
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Try using the Supabase SQL endpoint
  const sql = `CREATE TABLE IF NOT EXISTS ai_agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name TEXT NOT NULL,
    arguments JSONB DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL DEFAULT true,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_created_at ON ai_agent_actions (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_tool ON ai_agent_actions (tool_name);`;

  // Try the /pg endpoint first
  let res = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/pg', {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  console.log('/pg status:', res.status);
  let text = await res.text();
  console.log('/pg response:', text.slice(0, 500));

  if (res.status === 404) {
    // Try /rest/v1/rpc route
    console.log('\nTrying /rest/v1/ approach...');
    // Check if table exists now
    const { data, error } = await supabase.from('ai_agent_actions').select('id').limit(1);
    if (error) {
      console.log('Table still does not exist:', error.message);
      console.log('\nYou need to run this SQL in the Supabase Dashboard SQL Editor:');
      console.log('---');
      console.log(sql);
      console.log('---');
    } else {
      console.log('Table exists now!');
    }
  } else if (res.ok) {
    console.log('\nTable created successfully!');
  }
})();
