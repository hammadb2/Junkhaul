-- Crew notifications + incident reports + document expiry + issue flags
-- Adds tables for the new portal features.

-- ── Crew notifications (in-app notification center) ──
CREATE TABLE IF NOT EXISTS crew_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info', -- info | warning | success | assignment | broadcast
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- optional portal route to navigate to
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crew_notif_emp ON crew_notifications(employee_id, created_at DESC);

-- ── Job issue flags ──
CREATE TABLE IF NOT EXISTS job_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL DEFAULT 'other', -- access | damage | safety | customer | vehicle | other
  severity TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
  description TEXT,
  photo_url TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_issues_booking ON job_issues(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_issues_unresolved ON job_issues(resolved_at) WHERE resolved_at IS NULL;

-- ── Incident reports ──
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL DEFAULT 'other', -- injury | vehicle_accident | property_damage | near_miss | safety | other
  severity TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  description TEXT NOT NULL,
  location TEXT,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  reported_to TEXT, -- who was notified (e.g. supervisor, 911)
  status TEXT NOT NULL DEFAULT 'reported', -- reported | investigating | resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_emp ON incident_reports(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_status ON incident_reports(status);

-- ── Document expiry tracking ──
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ;

-- ── Offline job queue (client-side only, but track sync state) ──
CREATE TABLE IF NOT EXISTS offline_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  booking_id UUID,
  action TEXT NOT NULL, -- arrived | start_job | complete_job | collect_payment | photo_upload
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offline_queue_emp ON offline_job_queue(employee_id, synced_at);
