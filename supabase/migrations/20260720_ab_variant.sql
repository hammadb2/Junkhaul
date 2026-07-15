-- Add A/B variant tracking to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ab_variant text DEFAULT 'phone_first';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ab_variant_assigned_at timestamptz;

-- Backfill existing leads with the default variant
UPDATE leads SET ab_variant = 'phone_first' WHERE ab_variant IS NULL;

-- Add index for A/B analysis
CREATE INDEX IF NOT EXISTS idx_leads_ab_variant ON leads(ab_variant);
