-- Add travel_fee and truck_size columns to bookings.
-- travel_fee: customer-facing per-km charge (home → U-Haul → customer).
-- truck_size: 15 (default), 20, or 26 ft upsell.
-- travel_km: total km for the travel fee (for record-keeping).

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_fee integer DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_km double precision DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS truck_size integer NOT NULL DEFAULT 15
  CHECK (truck_size IN (15, 20, 26));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS truck_fee integer DEFAULT 0;
