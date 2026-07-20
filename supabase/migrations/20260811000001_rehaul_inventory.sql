-- ============================================================
-- Junkhaul Calgary — Rehaul inventory, SKU, warehouse locations and cost basis
-- Date: 2026-08-11
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site TEXT NOT NULL,
  zone TEXT NOT NULL,
  aisle TEXT,
  rack TEXT,
  bin TEXT,
  capacity_kg NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant ON warehouse_locations(tenant_id, site, zone);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  donation_item_id UUID REFERENCES donation_items(id) ON DELETE SET NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  model TEXT,
  condition_grade TEXT CHECK (condition_grade IN ('new','like_new','good','fair','salvage')),
  condition_notes TEXT,
  dimensions JSONB,
  weight_kg NUMERIC,
  materials TEXT[],
  handling_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'quarantine' CHECK (status IN (
    'quarantine','preparation','ready','reserved','sold','picked','out_for_delivery',
    'delivered','returned_by_exception','recycled','disposed','lost_damaged'
  )),
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  acquisition_cost_cents INTEGER DEFAULT 0,
  cleaning_cost_cents INTEGER DEFAULT 0,
  repair_cost_cents INTEGER DEFAULT 0,
  parts_cost_cents INTEGER DEFAULT 0,
  photography_cost_cents INTEGER DEFAULT 0,
  storage_cost_cents INTEGER DEFAULT 0,
  delivery_cost_cents INTEGER DEFAULT 0,
  total_cost_basis_cents INTEGER DEFAULT 0,
  listed_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location_id);

CREATE TABLE IF NOT EXISTS inventory_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('cosmetic','functional','safety')),
  photo_url TEXT,
  disclosed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_defects_item ON inventory_defects(inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  reason TEXT,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  expected_count INTEGER NOT NULL DEFAULT 0,
  actual_count INTEGER NOT NULL DEFAULT 0,
  discrepancy INTEGER NOT NULL DEFAULT 0,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_cycle_counts_location ON inventory_cycle_counts(location_id, resolved);

-- Updated cost basis trigger
CREATE OR REPLACE FUNCTION update_inventory_cost_basis()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost_basis_cents :=
    COALESCE(NEW.acquisition_cost_cents, 0) +
    COALESCE(NEW.cleaning_cost_cents, 0) +
    COALESCE(NEW.repair_cost_cents, 0) +
    COALESCE(NEW.parts_cost_cents, 0) +
    COALESCE(NEW.photography_cost_cents, 0) +
    COALESCE(NEW.storage_cost_cents, 0) +
    COALESCE(NEW.delivery_cost_cents, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_items_cost_basis ON inventory_items;
CREATE TRIGGER inventory_items_cost_basis
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_cost_basis();

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_cycle_counts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'service_role_all_inventory_items') THEN
    CREATE POLICY service_role_all_inventory_items ON inventory_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_locations' AND policyname = 'service_role_all_warehouse_locations') THEN
    CREATE POLICY service_role_all_warehouse_locations ON warehouse_locations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_defects' AND policyname = 'service_role_all_inventory_defects') THEN
    CREATE POLICY service_role_all_inventory_defects ON inventory_defects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'service_role_all_inventory_movements') THEN
    CREATE POLICY service_role_all_inventory_movements ON inventory_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_cycle_counts' AND policyname = 'service_role_all_inventory_cycle_counts') THEN
    CREATE POLICY service_role_all_inventory_cycle_counts ON inventory_cycle_counts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
