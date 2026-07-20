-- ============================================================
-- Junkhaul Calgary — Physical weighing, dimensioning and calibration
-- Date: 2026-08-05
--
-- Tracks measurement devices, calibration history, physical
-- measurements, and corrections while keeping the original value.
-- ============================================================

CREATE TABLE IF NOT EXISTS measurement_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL CHECK (device_type IN ('portable_scale','platform_scale','tape_measure','laser_measure','phone_app')),
  measurement_type TEXT[] NOT NULL DEFAULT '{}', -- weight, length, width, height, volume
  tolerance_percent NUMERIC NOT NULL DEFAULT 2,
  calibration_due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measurement_devices_active ON measurement_devices(is_active, device_type);

CREATE TABLE IF NOT EXISTS calibration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES measurement_devices(id) ON DELETE CASCADE,
  calibrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calibration_due_date DATE,
  performed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibration_records_device ON calibration_records(device_id, calibrated_at DESC);

-- Corrections keep original measurement rows visible.
ALTER TABLE physical_measurements
  ADD COLUMN IF NOT EXISTS original_measurement_id UUID REFERENCES physical_measurements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_correction BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_physical_measurements_original ON physical_measurements(original_measurement_id);
CREATE INDEX IF NOT EXISTS idx_physical_measurements_correction ON physical_measurements(is_correction);

-- Quality events when physical measurement disagrees with AI range.
CREATE TABLE IF NOT EXISTS measurement_quality_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES physical_measurements(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES item_observations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('ai_underestimate','ai_overestimate','out_of_tolerance','out_of_calibration')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  ai_min_kg NUMERIC,
  ai_max_kg NUMERIC,
  physical_kg NUMERIC,
  description TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measurement_quality_measurement ON measurement_quality_events(measurement_id);
CREATE INDEX IF NOT EXISTS idx_measurement_quality_unack ON measurement_quality_events(acknowledged, severity);

ALTER TABLE measurement_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_quality_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'measurement_devices' AND policyname = 'service_role_all_measurement_devices') THEN
    CREATE POLICY service_role_all_measurement_devices ON measurement_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calibration_records' AND policyname = 'service_role_all_calibration_records') THEN
    CREATE POLICY service_role_all_calibration_records ON calibration_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'measurement_quality_events' AND policyname = 'service_role_all_measurement_quality_events') THEN
    CREATE POLICY service_role_all_measurement_quality_events ON measurement_quality_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION physical_measurement_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_measurement_devices_updated_at') THEN
    CREATE TRIGGER trg_measurement_devices_updated_at BEFORE UPDATE ON measurement_devices
    FOR EACH ROW EXECUTE FUNCTION physical_measurement_set_updated_at();
  END IF;
END $$;
