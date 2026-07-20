-- ============================================================
-- Junkhaul Calgary — Rehaul clean-route delivery and fulfillment
-- Date: 2026-08-14
-- ============================================================

CREATE TABLE IF NOT EXISTS clean_route_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id UUID NOT NULL UNIQUE REFERENCES route_plans(id) ON DELETE CASCADE,
  vehicle_sanitized BOOLEAN NOT NULL DEFAULT false,
  protective_equipment_check JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_order UUID[],
  pickup_order UUID[],
  departure_photo_url TEXT,
  end_of_day_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clean_route_manifests_route ON clean_route_manifests(route_plan_id);

CREATE TABLE IF NOT EXISTS rehaul_fulfillment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES rehaul_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pick_list','scan_verification','load','unload','delivery_proof','exception','refund_review')),
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  photo_url TEXT,
  signature_url TEXT,
  recipient_name TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_fulfillment_events_order ON rehaul_fulfillment_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rehaul_ar_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
  model_url TEXT,
  scale_accuracy_note TEXT,
  tolerance_percent NUMERIC,
  fallback_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clean_route_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_fulfillment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_ar_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clean_route_manifests' AND policyname = 'service_role_all_clean_route_manifests') THEN
    CREATE POLICY service_role_all_clean_route_manifests ON clean_route_manifests FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_fulfillment_events' AND policyname = 'service_role_all_rehaul_fulfillment_events') THEN
    CREATE POLICY service_role_all_rehaul_fulfillment_events ON rehaul_fulfillment_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_ar_models' AND policyname = 'service_role_all_rehaul_ar_models') THEN
    CREATE POLICY service_role_all_rehaul_ar_models ON rehaul_ar_models FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
