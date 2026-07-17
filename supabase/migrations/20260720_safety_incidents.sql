-- Safety & Incidents tracking for crew management
-- Tracks incidents reported by crew members during job execution

CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'injury', 'vehicle_damage', 'property_damage', 'near_miss',
    'equipment_failure', 'safety_violation', 'customer_dispute', 'other'
  )),
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_employee ON safety_incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_created_at ON safety_incidents(created_at DESC);

-- RLS policies
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to safety_incidents"
  ON safety_incidents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Employees can insert incidents (crew app reports)
CREATE POLICY "Employees can create safety incidents"
  ON safety_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Employees can read their own incidents
CREATE POLICY "Employees can read their own safety incidents"
  ON safety_incidents FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_safety_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER safety_incidents_updated_at
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_incidents_updated_at();

-- Enable realtime for admin live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE safety_incidents;
