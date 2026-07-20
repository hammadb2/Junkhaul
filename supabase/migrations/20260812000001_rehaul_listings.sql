-- ============================================================
-- Junkhaul Calgary — Rehaul listings, media, defects and pricing
-- Date: 2026-08-12
-- ============================================================

CREATE TABLE IF NOT EXISTS rehaul_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo','spin','video')),
  url TEXT NOT NULL,
  alt_text TEXT,
  ordering INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_media_item ON rehaul_media(inventory_item_id, ordering);

CREATE TABLE IF NOT EXISTS rehaul_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  room TEXT,
  style TEXT,
  listed_price_cents INTEGER NOT NULL,
  cost_basis_cents INTEGER NOT NULL DEFAULT 0,
  min_price_cents INTEGER NOT NULL DEFAULT 0,
  margin_floor_percent NUMERIC NOT NULL DEFAULT 20,
  condition_grade TEXT,
  condition_summary TEXT,
  provenance TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','unpublished','sold')),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  publication_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_listings_status ON rehaul_listings(tenant_id, status, category);
CREATE INDEX IF NOT EXISTS idx_rehaul_listings_slug ON rehaul_listings(slug);

CREATE TABLE IF NOT EXISTS rehaul_listing_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES rehaul_listings(id) ON DELETE CASCADE,
  inventory_defect_id UUID REFERENCES inventory_defects(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_listing_defects_listing ON rehaul_listing_defects(listing_id);

CREATE TABLE IF NOT EXISTS rehaul_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES rehaul_listings(id) ON DELETE CASCADE,
  listed_price_cents INTEGER NOT NULL,
  min_price_cents INTEGER NOT NULL,
  cost_basis_cents INTEGER NOT NULL,
  margin_percent NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_price_snapshots_listing ON rehaul_price_snapshots(listing_id, created_at DESC);

ALTER TABLE rehaul_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_listing_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_price_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_media' AND policyname = 'service_role_all_rehaul_media') THEN
    CREATE POLICY service_role_all_rehaul_media ON rehaul_media FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_listings' AND policyname = 'service_role_all_rehaul_listings') THEN
    CREATE POLICY service_role_all_rehaul_listings ON rehaul_listings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_listing_defects' AND policyname = 'service_role_all_rehaul_listing_defects') THEN
    CREATE POLICY service_role_all_rehaul_listing_defects ON rehaul_listing_defects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_price_snapshots' AND policyname = 'service_role_all_rehaul_price_snapshots') THEN
    CREATE POLICY service_role_all_rehaul_price_snapshots ON rehaul_price_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
