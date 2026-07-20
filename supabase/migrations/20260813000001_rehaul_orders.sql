-- ============================================================
-- Junkhaul Calgary — Rehaul cart, checkout, orders and inventory reservations
-- Date: 2026-08-13
-- ============================================================

CREATE TABLE IF NOT EXISTS rehaul_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES rehaul_customers(id) ON DELETE SET NULL,
  session_token TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','abandoned')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_carts_session ON rehaul_carts(session_token);

CREATE TABLE IF NOT EXISTS rehaul_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES rehaul_carts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES rehaul_listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  UNIQUE (cart_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_rehaul_cart_items_cart ON rehaul_cart_items(cart_id);

CREATE TABLE IF NOT EXISTS rehaul_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES rehaul_customers(id) ON DELETE SET NULL,
  cart_id UUID REFERENCES rehaul_carts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment','paid','scheduled','picking','loaded','out_for_delivery','delivered',
    'exception','cancelled_by_business','statutory_remedy_review','refunded_by_authorized_exception'
  )),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  payment_intent_id TEXT,
  final_sale_accepted BOOLEAN NOT NULL DEFAULT false,
  final_sale_version TEXT,
  final_sale_accepted_at TIMESTAMPTZ,
  delivery_address JSONB,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_orders_status ON rehaul_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rehaul_orders_customer ON rehaul_orders(customer_id);

CREATE TABLE IF NOT EXISTS rehaul_inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  cart_id UUID REFERENCES rehaul_carts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES rehaul_orders(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rehaul_inventory_reservations_item ON rehaul_inventory_reservations(inventory_item_id, released_at);
CREATE INDEX IF NOT EXISTS idx_rehaul_inventory_reservations_expires ON rehaul_inventory_reservations(expires_at) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS rehaul_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES rehaul_orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES rehaul_listings(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE SET NULL,
  price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rehaul_order_items_order ON rehaul_order_items(order_id);

-- Tax evidence by line
CREATE TABLE IF NOT EXISTS rehaul_order_tax_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES rehaul_orders(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  taxable_amount_cents INTEGER NOT NULL,
  tax_amount_cents INTEGER NOT NULL,
  evidence TEXT
);

CREATE INDEX IF NOT EXISTS idx_rehaul_order_tax_lines_order ON rehaul_order_tax_lines(order_id);

ALTER TABLE rehaul_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_order_tax_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_carts' AND policyname = 'service_role_all_rehaul_carts') THEN
    CREATE POLICY service_role_all_rehaul_carts ON rehaul_carts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_cart_items' AND policyname = 'service_role_all_rehaul_cart_items') THEN
    CREATE POLICY service_role_all_rehaul_cart_items ON rehaul_cart_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_inventory_reservations' AND policyname = 'service_role_all_rehaul_inventory_reservations') THEN
    CREATE POLICY service_role_all_rehaul_inventory_reservations ON rehaul_inventory_reservations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_orders' AND policyname = 'service_role_all_rehaul_orders') THEN
    CREATE POLICY service_role_all_rehaul_orders ON rehaul_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_order_items' AND policyname = 'service_role_all_rehaul_order_items') THEN
    CREATE POLICY service_role_all_rehaul_order_items ON rehaul_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_order_tax_lines' AND policyname = 'service_role_all_rehaul_order_tax_lines') THEN
    CREATE POLICY service_role_all_rehaul_order_tax_lines ON rehaul_order_tax_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
