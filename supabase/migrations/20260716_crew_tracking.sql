-- Crew GPS locations (live tracking)
CREATE TABLE IF NOT EXISTS crew_locations (
  employee_id UUID PRIMARY KEY REFERENCES employees(id),
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  heading FLOAT,
  speed FLOAT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add selfie_url to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Add tracking_token to bookings (for customer portal link)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_token TEXT;
