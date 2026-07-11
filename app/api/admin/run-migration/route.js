import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const secret = body.secret || '';
  if (secret !== 'jh-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  // 1. Add crew_photos columns to bookings
  const { error: e1 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos jsonb DEFAULT '[]';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos_taken_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_arrived_at timestamp;
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'crew_photos columns', error: e1 });

  // 2. Create call_history table
  const { error: e2 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS call_history (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        caller_number text NOT NULL,
        caller_name text,
        vapi_call_id text,
        agent_name text,
        agent_type text,
        call_date timestamptz DEFAULT now(),
        duration_seconds integer DEFAULT 0,
        call_outcome text,
        call_summary text,
        transcript text,
        sentiment text DEFAULT 'neutral',
        ended_reason text,
        booking_ref text,
        follow_up_sent boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_call_history_phone ON call_history(caller_number);
      CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(call_date DESC);
      ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Service role call_history" ON call_history FOR ALL USING (true);
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'call_history table', error: e2 });

  // 3. Create escalations table
  const { error: e3 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS escalations (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        caller_phone text,
        booking_ref text,
        reason text,
        escalated_by text,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Service role escalations" ON escalations FOR ALL USING (true);
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'escalations table', error: e3 });

  // 4. Create compensation_log table
  const { error: e4 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS compensation_log (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_ref text,
        caller_phone text,
        compensation_type text,
        reason text,
        authorized_by text,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE compensation_log ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Service role comp" ON compensation_log FOR ALL USING (true);
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'compensation_log table', error: e4 });

  // 5. Add password reset columns to employees
  const { error: e5 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_token text;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_expires_at timestamptz;
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'employees reset columns', error: e5 });

  // 6. Create push_subscriptions table if not exists
  const { error: e6 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        employee_id uuid NOT NULL,
        endpoint text NOT NULL,
        p256dh text,
        auth text,
        created_at timestamptz DEFAULT now(),
        UNIQUE(employee_id, endpoint)
      );
      ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Service role push_subs" ON push_subscriptions FOR ALL USING (true);
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'push_subscriptions table', error: e6 });

  // 7. Expand employee_documents doc_type check constraint to include
  // onboarding-specific document types used by the portal.
  const { error: e7 } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      ALTER TABLE employee_documents
        DROP CONSTRAINT IF EXISTS employee_documents_doc_type_check;
      ALTER TABLE employee_documents
        ADD CONSTRAINT employee_documents_doc_type_check
        CHECK (doc_type IN (
          'employment_contract',
          'td1_federal',
          'td1_ab',
          'id',
          'banking_info',
          'sin_document',
          'drivers_license_front',
          'drivers_license_back',
          'other'
        ));
    `
  }).catch(() => ({ error: 'rpc not available' }));
  results.push({ step: 'employee_documents doc_type constraint', error: e7 });

  // If exec_sql doesn't exist, try direct table creation via the API
  const hasRpcError = results.some(r => r.error === 'rpc not available');
  if (hasRpcError) {
    // Try creating tables via direct insert (table might not exist, that's ok)
    // The tables will be created when we first insert into them if auto-create is on
    // Otherwise we need the user to run the SQL manually
    return NextResponse.json({
      results,
      message: 'exec_sql RPC not available. Tables need to be created manually via Supabase SQL Editor.',
      sql: `
-- Run this in Supabase SQL Editor:

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos jsonb DEFAULT '[]';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos_taken_at timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_arrived_at timestamp;

CREATE TABLE IF NOT EXISTS call_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_number text NOT NULL,
  caller_name text,
  vapi_call_id text,
  agent_name text,
  agent_type text,
  call_date timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0,
  call_outcome text,
  call_summary text,
  transcript text,
  sentiment text DEFAULT 'neutral',
  ended_reason text,
  booking_ref text,
  follow_up_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_history_phone ON call_history(caller_number);
CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(call_date DESC);
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role call_history" ON call_history FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS escalations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_phone text,
  booking_ref text,
  reason text,
  escalated_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role escalations" ON escalations FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS compensation_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref text,
  caller_phone text,
  compensation_type text,
  reason text,
  authorized_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE compensation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role comp" ON compensation_log FOR ALL USING (true);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_token text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_expires_at timestamptz;

ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_doc_type_check;
ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_doc_type_check
  CHECK (doc_type IN (
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
    'other'
  ));

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text,
  auth text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role push_subs" ON push_subscriptions FOR ALL USING (true);
`
    });
  }

  return NextResponse.json({ results, message: 'Migration complete' });
}
