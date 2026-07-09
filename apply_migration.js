const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await supabase
    .from('system_config')
    .upsert([
      { key: 'kill_switch_day_summary', value: 'true', value_type: 'boolean', description: 'Enable day summary SMS', category: 'kill_switch' },
      { key: 'kill_switch_generate_slots', value: 'true', value_type: 'boolean', description: 'Enable weekly slot generation', category: 'kill_switch' },
      { key: 'kill_switch_review_requests_edge', value: 'true', value_type: 'boolean', description: 'Enable edge-function review requests', category: 'kill_switch' },
      { key: 'kill_switch_lead_followup', value: 'false', value_type: 'boolean', description: 'Legacy lead followup is disabled by default', category: 'kill_switch' },
      { key: 'kill_switch_risk_reminders', value: 'true', value_type: 'boolean', description: 'Enable high-risk extra reminders', category: 'kill_switch' },
    ], { onConflict: 'key' })
    .select();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Inserted/updated:', data);
}

main();
