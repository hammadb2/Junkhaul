-- ============================================================
-- Junkhaul Calgary — Crew app production-safe sync and field data
-- Date: 2026-08-07
--
-- Supports idempotency, durable offline replay, session revocation,
-- loaded-item tracking, truck inspections, fuel/odometer/rental returns,
-- and barcode scans.
-- ============================================================

-- Idempotency keys: server returns stored response for duplicate crew writes.
CREATE TABLE IF NOT EXISTS crew_idempotency_keys (
  key TEXT PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_idempotency_employee ON crew_idempotency_keys(employee_id, created_at DESC);

-- Offline actions queued on device and replayed to server.
CREATE TABLE IF NOT EXISTS crew_offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','conflict','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_offline_actions_emp ON crew_offline_actions(employee_id, status, created_at DESC);

-- Least-privilege session tokens for crew devices.
CREATE TABLE IF NOT EXISTS crew_session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_id TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT[] NOT NULL DEFAULT '{}',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crew_session_tokens_employee ON crew_session_tokens(employee_id, revoked_at, expires_at);

-- Loaded items captured by crew (weight/photo/SKU).
CREATE TABLE IF NOT EXISTS crew_loaded_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  description TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight_kg NUMERIC,
  volume_cuft NUMERIC,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_loaded_items_booking ON crew_loaded_items(booking_id, loaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_loaded_items_route ON crew_loaded_items(route_plan_id, loaded_at DESC);

-- Before/after truck inspection and damage escalation.
CREATE TABLE IF NOT EXISTS truck_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('pre_trip','post_trip','damage')),
  notes TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  damage_escalation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truck_inspections_route ON truck_inspections(route_plan_id, inspection_type);

-- Fuel receipts and odometer readings.
CREATE TABLE IF NOT EXISTS fuel_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  litres NUMERIC NOT NULL,
  price_per_litre NUMERIC,
  total_cents INTEGER,
  photo_url TEXT,
  station_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  km INTEGER NOT NULL,
  photo_url TEXT,
  reading_type TEXT NOT NULL CHECK (reading_type IN ('start','end','fuel_stop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Barcode / SKU scans for Rehaul and inventory.
CREATE TABLE IF NOT EXISTS barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('rehaul_sku','donation','inventory','waste_stream')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barcode_scans_code ON barcode_scans(code, scan_type);

-- Rental return record.
CREATE TABLE IF NOT EXISTS rental_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  return_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  final_odometer_km INTEGER,
  fuel_level_photo_url TEXT,
  clean_truck_photo_url TEXT,
  notes TEXT,
  returned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync conflicts for offline replay.
CREATE TABLE IF NOT EXISTS crew_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  offline_action_id UUID REFERENCES crew_offline_actions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  client_version INTEGER,
  server_version INTEGER,
  payload JSONB,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crew_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_loaded_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_sync_conflicts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crew_idempotency_keys' AND policyname = 'service_role_all_crew_idempotency_keys') THEN
    CREATE POLICY service_role_all_crew_idempotency_keys ON crew_idempotency_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crew_offline_actions' AND policyname = 'service_role_all_crew_offline_actions') THEN
    CREATE POLICY service_role_all_crew_offline_actions ON crew_offline_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crew_session_tokens' AND policyname = 'service_role_all_crew_session_tokens') THEN
    CREATE POLICY service_role_all_crew_session_tokens ON crew_session_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crew_loaded_items' AND policyname = 'service_role_all_crew_loaded_items') THEN
    CREATE POLICY service_role_all_crew_loaded_items ON crew_loaded_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'truck_inspections' AND policyname = 'service_role_all_truck_inspections') THEN
    CREATE POLICY service_role_all_truck_inspections ON truck_inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fuel_receipts' AND policyname = 'service_role_all_fuel_receipts') THEN
    CREATE POLICY service_role_all_fuel_receipts ON fuel_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'odometer_readings' AND policyname = 'service_role_all_odometer_readings') THEN
    CREATE POLICY service_role_all_odometer_readings ON odometer_readings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'barcode_scans' AND policyname = 'service_role_all_barcode_scans') THEN
    CREATE POLICY service_role_all_barcode_scans ON barcode_scans FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rental_returns' AND policyname = 'service_role_all_rental_returns') THEN
    CREATE POLICY service_role_all_rental_returns ON rental_returns FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crew_sync_conflicts' AND policyname = 'service_role_all_crew_sync_conflicts') THEN
    CREATE POLICY service_role_all_crew_sync_conflicts ON crew_sync_conflicts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
