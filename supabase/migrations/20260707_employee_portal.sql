-- ============================================================
-- Junk Haul Calgary — Employee Portal Schema
-- Date: 2026-07-07
-- Covers: onboarding, document storage (Google Drive sync),
-- clock in/out with GPS, in-house payroll engine (CRA T4127),
-- pay stubs, remittance tracking, direct deposit, T4 generation.
-- ============================================================

-- ============================================================
-- 1. EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,            -- scrypt/argon2 hash, never plaintext
  name text NOT NULL,
  phone text,
  sin text,                                -- encrypted at rest in app layer; stored encrypted
  sin_enc text,
  address text,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending'   -- pending -> onboarded -> active -> terminated
    CHECK (status IN ('pending','onboarded','active','terminated')),
  onboarded_at timestamptz,
  terminated_at timestamptz,
  -- Payroll config
  pay_rate numeric(8,2) NOT NULL DEFAULT 15.00,        -- hourly base rate
  td1_federal_claim numeric(10,2) NOT NULL DEFAULT 15705,  -- 2026 federal basic personal amount
  td1_ab_claim numeric(10,2) NOT NULL DEFAULT 22159,      -- 2026 AB basic personal amount
  vacation_pct numeric(5,2) NOT NULL DEFAULT 4.00,
  -- Direct deposit banking (encrypted at rest in app layer)
  bank_institution text,
  bank_transit text,
  bank_account text,
  bank_account_enc text,
  -- Google Drive
  drive_folder_id text,                    -- per-employee private folder in Drive
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON employees;
CREATE POLICY "Service role full access" ON employees
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. EMPLOYEE DOCUMENTS — tracks uploaded onboarding docs
--    (actual files live in Google Drive; this is the index)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'employment_contract','td1_federal','td1_ab','id','banking_info','other'
  )),
  status text NOT NULL DEFAULT 'pending'   -- pending -> uploaded -> verified -> rejected
    CHECK (status IN ('pending','uploaded','verified','rejected')),
  drive_file_id text,                      -- Google Drive file id
  drive_file_url text,
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  notes text,
  UNIQUE (employee_id, doc_type)
);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON employee_documents;
CREATE POLICY "Service role full access" ON employee_documents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. EMPLOYEE SESSIONS — httpOnly cookie session tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_sessions (
  token text PRIMARY KEY,                  -- random 32-byte hex
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz DEFAULT now()
);

ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON employee_sessions;
CREATE POLICY "Service role full access" ON employee_sessions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS employee_sessions_employee_idx ON employee_sessions (employee_id);
CREATE INDEX IF NOT EXISTS employee_sessions_expires_idx ON employee_sessions (expires_at);

-- ============================================================
-- 4. TIMESHEETS — clock in/out events with GPS
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  clock_in_lat float,
  clock_in_lng float,
  clock_out_lat float,
  clock_out_lng float,
  -- Computed on clock-out (stored for fast reporting + audit)
  regular_hours numeric(6,2),
  overtime_hours numeric(6,2),
  total_hours numeric(6,2),
  gross_pay numeric(10,2),
  pay_run_id uuid,                         -- set when included in a pay run
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON timesheets;
CREATE POLICY "Service role full access" ON timesheets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS timesheets_employee_idx ON timesheets (employee_id);
CREATE INDEX IF NOT EXISTS timesheets_clock_in_idx ON timesheets (clock_in_at);
CREATE INDEX IF NOT EXISTS timesheets_pay_run_idx ON timesheets (pay_run_id);

-- ============================================================
-- 5. PAYROLL RATES — CRA T4127 rate tables, edition-aware
--    CRA publishes a new T4127 twice a year (Jan 1 + Jul 1).
--    Rates are pulled fresh each edition; never hardcoded in app logic.
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL,                   -- e.g. '2026-H1' (Jan 1), '2026-H2' (Jul 1)
  effective_from date NOT NULL,
  effective_to date,
  -- CPP
  cpp_rate numeric(6,4) NOT NULL,                  -- e.g. 0.0595
  cpp_basic_exemption numeric(10,2) NOT NULL,      -- annual
  cpp_max_pensionable numeric(10,2) NOT NULL,      -- YMPE (first ceiling)
  cpp_max_contribution numeric(10,2) NOT NULL,     -- computed max employee contribution
  -- CPP2 (second additional, earnings above YMPE up to YAMPE)
  cpp2_rate numeric(6,4) NOT NULL,                 -- e.g. 0.0400
  cpp2_lower_ceiling numeric(10,2) NOT NULL,       -- = YMPE
  cpp2_upper_ceiling numeric(10,2) NOT NULL,       -- YAMPE
  cpp2_max_contribution numeric(10,2) NOT NULL,
  -- EI
  ei_rate numeric(6,4) NOT NULL,                   -- e.g. 0.0164
  ei_max_insurable numeric(10,2) NOT NULL,         -- annual
  ei_max_premium numeric(10,2) NOT NULL,
  -- Federal tax brackets (jsonb array of {from, to, rate})
  fed_brackets jsonb NOT NULL,
  fed_basic_personal_amount numeric(10,2) NOT NULL,
  -- Alberta tax brackets (jsonb array of {from, to, rate})
  ab_brackets jsonb NOT NULL,
  ab_basic_personal_amount numeric(10,2) NOT NULL,
  -- Federal constants
  fed_cpp_base numeric(10,2),              -- CPP base amount used in tax formula (T4127)
  fed_cpp2_base numeric(10,2),
  fed_ei_base numeric(10,2),
  fed_ab_tax_reduction numeric(10,2),      -- not used federally; placeholder
  -- Metadata
  source text,                             -- 'CRA T4127'
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (edition)
);

ALTER TABLE payroll_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON payroll_rates;
CREATE POLICY "Service role full access" ON payroll_rates
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS payroll_rates_effective_idx ON payroll_rates (effective_from);

-- ============================================================
-- 6. PAY RUNS — a payroll period run (calculated + approved)
-- ============================================================
CREATE TABLE IF NOT EXISTS pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'     -- draft -> calculated -> approved -> paid -> closed
    CHECK (status IN ('draft','calculated','approved','paid','closed')),
  run_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  paid_at timestamptz,
  -- Aggregated totals (set on calculation)
  total_gross numeric(12,2),
  total_cpp numeric(12,2),
  total_cpp2 numeric(12,2),
  total_ei numeric(12,2),
  total_fed_tax numeric(12,2),
  total_ab_tax numeric(12,2),
  total_vacation numeric(12,2),
  total_net numeric(12,2),
  -- Remittance (CPP+CPP2+EI+income tax owed to CRA)
  total_cra_remittance numeric(12,2),
  remittance_due_date date,                -- 15th of following month
  remittance_paid boolean DEFAULT false,
  remittance_paid_at timestamptz,
  edition text,                            -- which payroll_rates edition was used
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pay_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON pay_runs;
CREATE POLICY "Service role full access" ON pay_runs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS pay_runs_status_idx ON pay_runs (status);
CREATE INDEX IF NOT EXISTS pay_runs_period_idx ON pay_runs (period_start, period_end);

-- ============================================================
-- 7. PAY STUBS — per-employee breakdown for a pay run
-- ============================================================
CREATE TABLE IF NOT EXISTS pay_stubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  -- Hours
  regular_hours numeric(6,2),
  overtime_hours numeric(6,2),
  total_hours numeric(6,2),
  -- Pay
  regular_pay numeric(10,2),
  overtime_pay numeric(10,2),
  gross_pay numeric(10,2),
  vacation_pay numeric(10,2),
  -- Deductions
  cpp numeric(10,2),
  cpp2 numeric(10,2),
  ei numeric(10,2),
  fed_tax numeric(10,2),
  ab_tax numeric(10,2),
  total_deductions numeric(10,2),
  net_pay numeric(10,2),
  -- YTD totals (year-to-date at time of run)
  ytd_gross numeric(10,2),
  ytd_cpp numeric(10,2),
  ytd_cpp2 numeric(10,2),
  ytd_ei numeric(10,2),
  ytd_fed_tax numeric(10,2),
  ytd_ab_tax numeric(10,2),
  ytd_vacation numeric(10,2),
  ytd_insurable_earnings numeric(10,2),
  ytd_pensionable_earnings numeric(10,2),
  -- Direct deposit
  direct_deposit_status text DEFAULT 'pending'  -- pending -> sent -> settled -> failed
    CHECK (direct_deposit_status IN ('pending','sent','settled','failed','n/a')),
  direct_deposit_id text,                  -- provider transaction id
  direct_deposit_sent_at timestamptz,
  -- Audit
  created_at timestamptz DEFAULT now(),
  UNIQUE (pay_run_id, employee_id)
);

ALTER TABLE pay_stubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON pay_stubs;
CREATE POLICY "Service role full access" ON pay_stubs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS pay_stubs_run_idx ON pay_stubs (pay_run_id);
CREATE INDEX IF NOT EXISTS pay_stubs_employee_idx ON pay_stubs (employee_id);

-- ============================================================
-- 8. REMITTANCES — CRA source-deduction remittance tracking
--    (the actual payment to CRA is a manual/scheduled step outside
--     the employee-facing app; this is the flag/tracker)
-- ============================================================
CREATE TABLE IF NOT EXISTS remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  due_date date NOT NULL,                   -- 15th of following month
  amount numeric(12,2) NOT NULL,            -- CPP+CPP2+EI+income tax
  status text NOT NULL DEFAULT 'owed'       -- owed -> paid -> late
    CHECK (status IN ('owed','paid','late')),
  paid_at timestamptz,
  paid_method text,                         -- 'online_banking','pre-authorized_debit','manual'
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE remittances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON remittances;
CREATE POLICY "Service role full access" ON remittances
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS remittances_due_idx ON remittances (due_date);
CREATE INDEX IF NOT EXISTS remittances_status_idx ON remittances (status);

-- ============================================================
-- 9. DIRECT DEPOSIT LOG — provider transaction audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS direct_deposit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_stub_id uuid REFERENCES pay_stubs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  provider text NOT NULL,                   -- 'vopay','peoples','plooto'
  provider_txn_id text,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'    -- pending -> sent -> settled -> failed
    CHECK (status IN ('pending','sent','settled','failed')),
  raw_response jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

ALTER TABLE direct_deposit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON direct_deposit_log;
CREATE POLICY "Service role full access" ON direct_deposit_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS dd_log_employee_idx ON direct_deposit_log (employee_id);
CREATE INDEX IF NOT EXISTS dd_log_status_idx ON direct_deposit_log (status);

-- ============================================================
-- 10. T4 GENERATION — year-end T4 per employee
-- ============================================================
CREATE TABLE IF NOT EXISTS t4_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  tax_year int NOT NULL,
  -- Box 14: employment income
  employment_income numeric(12,2),
  -- Box 16: CPP pensionable earnings | Box 17: CPP contribution
  cpp_pensionable_earnings numeric(12,2),
  cpp_contribution numeric(12,2),
  -- Box 18: EI insurable earnings | Box 19: EI premium
  ei_insurable_earnings numeric(12,2),
  ei_premium numeric(12,2),
  -- Box 22: income tax deducted
  income_tax_deducted numeric(12,2),
  -- Box 24: EI insurable earnings (often = box 18)
  -- Box 26: CPP/QPP pensionable earnings (often = box 16)
  -- Box 28: CPP2 contribution (if applicable)
  cpp2_pensionable_earnings numeric(12,2),
  cpp2_contribution numeric(12,2),
  -- Box 44: union dues (n/a) | Box 14 already covered
  -- Vacation pay included in box 14 (informational)
  vacation_pay_included numeric(12,2),
  -- Provincial: AB tax (box 18-19 already; AB-specific in box 12 code)
  generated_at timestamptz DEFAULT now(),
  status text DEFAULT 'generated'           -- generated -> filed
    CHECK (status IN ('generated','filed')),
  UNIQUE (employee_id, tax_year)
);

ALTER TABLE t4_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON t4_slips;
CREATE POLICY "Service role full access" ON t4_slips
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS t4_slips_year_idx ON t4_slips (tax_year);

-- ============================================================
-- 11. PG_CRON — automated jobs (all call back into the app's
--     /api/cron/* endpoints with the CRON_SECRET header).
--
--     These run INSIDE Postgres but delegate the actual work to
--     the Next.js API routes. No manual scripts to run.
--
--     Schedule summary:
--       employee-session-cleanup  — 3am daily
--       refresh-rates-jan         — Jan 1, 6am (CRA T4127 H1 edition)
--       refresh-rates-jul         — Jul 1, 6am (CRA T4127 H2 edition)
--       run-payroll               — every other Friday, 9am
--       remittance-reminder       — 10th of every month, 9am
--       generate-t4s              — Jan 31, 9am (for previous tax year)
-- ============================================================

-- The app base URL + cron secret (set via env or hardcode for prod)
-- NOTE: Replace NEXT_PUBLIC_SITE_URL and CRON_SECRET with your actual
-- production values when deploying. In Supabase, you can set these as
-- Postgres GUCs or hardcode them here.
DO $$
DECLARE
  base_url text := COALESCE(current_setting('app.site_url', true), 'https://junkhaul.ca');
  cron_secret text := COALESCE(current_setting('app.cron_secret', true), '');
  headers text := json_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', cron_secret
  )::text;
BEGIN
  -- Helper: schedule an HTTP GET to an app cron endpoint
  -- (Supabase pg_cron supports http requests via net.http_get
  --  if pg_net is enabled; otherwise use a SELECT from the
  --  extensions.http function.)

  -- 1. Session cleanup (direct SQL, no HTTP needed)
  PERFORM cron.unschedule('employee-session-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'employee-session-cleanup',
  '0 3 * * *',
  $$
  DELETE FROM employee_sessions WHERE expires_at < now();
  $$
);

-- 2. T4127 rate refresh — January 1 (H1 edition)
DO $$ BEGIN PERFORM cron.unschedule('refresh-rates-jan'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-rates-jan',
  '0 6 1 1 *',  -- Jan 1, 6am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-rates',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

-- 3. T4127 rate refresh — July 1 (H2 edition)
DO $$ BEGIN PERFORM cron.unschedule('refresh-rates-jul'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-rates-jul',
  '0 6 1 7 *',  -- Jul 1, 6am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-rates',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

-- 4. Payroll run — every other Friday at 9am
--    (Cron can't do "every other week" natively, so we run every
--     Friday and the endpoint skips if a run already exists for
--     this period. The endpoint checks for un-paid shifts and
--     only creates a run when there are shifts to pay.)
DO $$ BEGIN PERFORM cron.unschedule('run-payroll'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'run-payroll',
  '0 9 * * 5',  -- every Friday, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/run-payroll',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

-- 5. CRA remittance reminder — 10th of every month at 9am
DO $$ BEGIN PERFORM cron.unschedule('remittance-reminder'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'remittance-reminder',
  '0 9 10 * *',  -- 10th of every month, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/remittance-reminder',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

-- 6. T4 generation — January 31 at 9am (for previous tax year)
DO $$ BEGIN PERFORM cron.unschedule('generate-t4s'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'generate-t4s',
  '0 9 31 1 *',  -- Jan 31, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/generate-t4s',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

-- ============================================================
-- 12. SEED the 2026-H1 rate edition into the DB
--     (so the engine has rates even before the first auto-refresh)
-- ============================================================
INSERT INTO payroll_rates (
  edition, effective_from, effective_to,
  cpp_rate, cpp_basic_exemption, cpp_max_pensionable, cpp_max_contribution,
  cpp2_rate, cpp2_lower_ceiling, cpp2_upper_ceiling, cpp2_max_contribution,
  ei_rate, ei_max_insurable, ei_max_premium,
  fed_brackets, fed_basic_personal_amount,
  ab_brackets, ab_basic_personal_amount,
  source
) VALUES (
  '2026-H1', '2026-01-01', '2026-06-30',
  0.0595, 3500.00, 74600.00, 4230.45,
  0.0400, 74600.00, 85000.00, 416.00,
  0.0163, 68900.00, 1123.07,
  '[{"from":0,"to":58523,"rate":0.1400,"K":0},{"from":58523,"to":117045,"rate":0.2050,"K":3804},{"from":117045,"to":181440,"rate":0.2600,"K":10241},{"from":181440,"to":258482,"rate":0.2900,"K":15685},{"from":258482,"to":null,"rate":0.3300,"K":26024}]'::jsonb,
  16452.00,
  '[{"from":0,"to":61200,"rate":0.0800,"K":0},{"from":61200,"to":154259,"rate":0.1000,"K":1224},{"from":154259,"to":185111,"rate":0.1200,"K":4309},{"from":185111,"to":246813,"rate":0.1300,"K":6160},{"from":246813,"to":370220,"rate":0.1400,"K":8628},{"from":370220,"to":null,"rate":0.1500,"K":12331}]'::jsonb,
  22769.00,
  'CRA T4127 122nd edition (Jan 1, 2026) — seeded'
) ON CONFLICT (edition) DO NOTHING;
