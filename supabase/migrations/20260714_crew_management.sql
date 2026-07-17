-- ============================================================
-- Crew Management System — Full Schema
-- ============================================================

-- 1. Employee invite tokens (admin invites crew member → email link)
CREATE TABLE IF NOT EXISTS employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  token TEXT NOT NULL UNIQUE,
  pay_rate NUMERIC DEFAULT 18.00,
  status TEXT DEFAULT 'pending', -- pending → accepted → expired
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS idx_employee_invites_token ON employee_invites(token);
CREATE INDEX IF NOT EXISTS idx_employee_invites_email ON employee_invites(email);

-- 2. Add invite-related columns to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS invite_id UUID REFERENCES employee_invites(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS td1_federal_data JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS td1_ab_data JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_data JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS acknowledgments JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 3. Crew day assignments (who works which day, who drives, where to get truck)
CREATE TABLE IF NOT EXISTS crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date DATE NOT NULL,
  driver_employee_id UUID REFERENCES employees(id),
  secondary_employee_id UUID REFERENCES employees(id),
  uhaul_location TEXT,
  uhaul_location_lat FLOAT,
  uhaul_location_lng FLOAT,
  status TEXT DEFAULT 'scheduled', -- scheduled → in_progress → completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_date, driver_employee_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_date ON crew_assignments(assignment_date);

-- 4. Truck check (dashboard photos, fuel, km, damage photos)
CREATE TABLE IF NOT EXISTS truck_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  check_type TEXT NOT NULL, -- pickup or return
  dashboard_photo_url TEXT,
  odometer_km INTEGER,
  fuel_level TEXT, -- estimated from photo: empty, 1/4, 1/2, 3/4, full
  fuel_percent NUMERIC,
  truck_photos JSONB DEFAULT '[]', -- array of photo URLs (bed, sides, damage)
  damage_notes TEXT,
  gas_receipt_url TEXT,
  gas_amount_cad NUMERIC,
  gas_station TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);

-- 5. Transaction receipts (U-Haul, gas, dump, other)
CREATE TABLE IF NOT EXISTS transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  employee_id UUID REFERENCES employees(id),
  receipt_type TEXT NOT NULL, -- uhaul, gas, dump, other
  vendor TEXT,
  amount_cad NUMERIC NOT NULL,
  receipt_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipts_assignment ON transaction_receipts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_employee ON transaction_receipts(employee_id);

-- 6. Customer signatures (proof of service + payment)
CREATE TABLE IF NOT EXISTS customer_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  customer_name_typed TEXT NOT NULL,
  customer_signature_url TEXT, -- drawn signature as image
  crew_member_typed TEXT NOT NULL,
  crew_member_id UUID REFERENCES employees(id),
  amount_confirmed NUMERIC NOT NULL,
  payment_method TEXT, -- cash or card
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Storage facility settings (admin-configurable)
CREATE TABLE IF NOT EXISTS storage_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  access_code TEXT,
  capacity_sqft NUMERIC,
  current_usage_pct NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Storage drop photos (crew drops donateable items at storage)
CREATE TABLE IF NOT EXISTS storage_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  facility_id UUID REFERENCES storage_facilities(id),
  booking_id UUID REFERENCES bookings(id),
  item_photos JSONB DEFAULT '[]',
  capacity_photo_url TEXT,
  capacity_estimate_pct NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);

-- 9. Donation center settings (where items go from storage)
CREATE TABLE IF NOT EXISTS donation_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Donation runs (storage → charity)
CREATE TABLE IF NOT EXISTS donation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id),
  facility_id UUID REFERENCES storage_facilities(id),
  center_id UUID REFERENCES donation_centers(id),
  item_photos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending → completed
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 11. Job clock sessions (per-job time tracking)
CREATE TABLE IF NOT EXISTS job_clock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  assignment_id UUID REFERENCES crew_assignments(id),
  employee_id UUID REFERENCES employees(id),
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_clock_booking ON job_clock_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_clock_employee ON job_clock_sessions(employee_id);

-- 12. Landfill info (Calgary landfills with hours)
CREATE TABLE IF NOT EXISTS landfills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  sunday_open BOOLEAN DEFAULT false,
  summer_only_sunday BOOLEAN DEFAULT false, -- East Calgary: Sundays April-Oct only
  monday_to_friday BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Calgary landfills
INSERT INTO landfills (name, address, lat, lng, sunday_open, summer_only_sunday, monday_to_friday)
VALUES
  ('East Calgary Landfill', '3801 68 St SE, Calgary, AB', 51.0379, -113.9829, true, true, true),
  ('Spyhill Landfill', '11808 69 St NW, Calgary, AB', 51.1465, -114.0878, false, false, true),
  ('Shepard Landfill', '12111 68 St SE, Calgary, AB', 51.0125, -113.9847, false, false, true)
ON CONFLICT DO NOTHING;

-- 13. Gas price cache (fetched from OilPriceAPI weekly)
CREATE TABLE IF NOT EXISTS gas_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT DEFAULT 'AB',
  price_per_litre NUMERIC NOT NULL,
  currency TEXT DEFAULT 'CAD',
  source TEXT DEFAULT 'OilPriceAPI',
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- 14. System config entries for crew management
INSERT INTO system_config (key, value, value_type, description, category)
VALUES
  ('uhaul_tank_capacity_litres', '80', 'number', 'U-Haul 15ft truck fuel tank capacity in litres', 'crew'),
  ('default_pay_rate', '18', 'number', 'Default hourly pay rate for new crew members', 'crew'),
  ('storage_facility_id', null, 'string', 'Active storage facility ID', 'crew'),
  ('donation_center_id', null, 'string', 'Active donation center ID', 'crew'),
  ('oilpriceapi_key', '', 'string', 'API key for OilPriceAPI gas price fetch', 'crew')
ON CONFLICT (key) DO NOTHING;

-- 15. Add document types for onboarding
-- employment_contract, td1_federal, td1_ab, id, banking_info already exist
-- Add: sin_document, drivers_license, acknowledgment
-- We'll handle these as doc_type values in employee_documents (no schema change needed)
