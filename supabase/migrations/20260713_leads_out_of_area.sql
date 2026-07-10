-- Add out_of_area columns to leads table for capturing leads outside Calgary

ALTER TABLE leads ADD COLUMN IF NOT EXISTS out_of_area BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS out_of_area_notes TEXT;
