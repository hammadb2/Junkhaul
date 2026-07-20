-- ============================================================
-- Junkhaul Calgary — Rehaul commerce hardening
-- Date: 2026-08-16
--
-- Forward-fix strategy:
-- - Additive only: no table resets, truncation, or destructive data rewrites.
-- - Existing open reservations are preserved; expired reservations are released
--   opportunistically by the reservation RPC before a new reservation is made.
-- - Existing orders retain their stored totals. New columns are nullable where
--   historic data may not have evidence yet.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_rehaul_active_inventory_reservation
  ON rehaul_inventory_reservations(inventory_item_id)
  WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS rehaul_delivery_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id UUID REFERENCES rehaul_carts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES rehaul_orders(id) ON DELETE SET NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('delivery_review_required','delivery_pricing_failed','delivery_fee_override')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected','resolved')),
  original_failure JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_fee_cents INTEGER,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_delivery_exceptions_cart
  ON rehaul_delivery_exceptions(cart_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS rehaul_tax_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  tax_name TEXT NOT NULL DEFAULT 'GST',
  registration_number TEXT,
  rate NUMERIC NOT NULL CHECK (rate >= 0),
  price_mode TEXT NOT NULL CHECK (price_mode IN ('tax_inclusive','tax_exclusive')),
  taxable_line_types TEXT[] NOT NULL DEFAULT ARRAY['merchandise','delivery'],
  evidence TEXT NOT NULL,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_rehaul_tax_config_effective
  ON rehaul_tax_config_versions(tenant_id, effective_from DESC)
  WHERE effective_to IS NULL;

ALTER TABLE rehaul_orders
  ADD COLUMN IF NOT EXISTS delivery_pricing_status TEXT NOT NULL DEFAULT 'priced'
    CHECK (delivery_pricing_status IN ('priced','delivery_review_required')),
  ADD COLUMN IF NOT EXISTS delivery_exception_id UUID REFERENCES rehaul_delivery_exceptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tax_config_version_id UUID REFERENCES rehaul_tax_config_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tax_evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE rehaul_order_items
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'merchandise'
    CHECK (line_type IN ('merchandise','delivery','discount','adjustment')),
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE rehaul_delivery_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_tax_config_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_delivery_exceptions' AND policyname = 'service_role_all_rehaul_delivery_exceptions') THEN
    CREATE POLICY service_role_all_rehaul_delivery_exceptions ON rehaul_delivery_exceptions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_tax_config_versions' AND policyname = 'service_role_all_rehaul_tax_config_versions') THEN
    CREATE POLICY service_role_all_rehaul_tax_config_versions ON rehaul_tax_config_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION rehaul_reserve_listing_in_cart(
  p_cart_id UUID,
  p_listing_id UUID,
  p_actor_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart rehaul_carts%ROWTYPE;
  v_listing rehaul_listings%ROWTYPE;
  v_inventory inventory_items%ROWTYPE;
  v_cart_item rehaul_cart_items%ROWTYPE;
  v_reservation rehaul_inventory_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_cart
  FROM rehaul_carts
  WHERE id = p_cart_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cart_not_active');
  END IF;

  SELECT * INTO v_listing
  FROM rehaul_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_listing.status <> 'published' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'listing_not_available');
  END IF;

  IF v_listing.tenant_id <> v_cart.tenant_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'tenant_mismatch');
  END IF;

  UPDATE rehaul_inventory_reservations
  SET released_at = now()
  WHERE inventory_item_id = v_listing.inventory_item_id
    AND released_at IS NULL
    AND expires_at <= now();

  SELECT * INTO v_inventory
  FROM inventory_items
  WHERE id = v_listing.inventory_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_inventory.status <> 'ready' THEN
    SELECT * INTO v_reservation
    FROM rehaul_inventory_reservations
    WHERE inventory_item_id = v_listing.inventory_item_id
      AND cart_id = p_cart_id
      AND released_at IS NULL
      AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
      SELECT * INTO v_cart_item
      FROM rehaul_cart_items
      WHERE cart_id = p_cart_id AND listing_id = p_listing_id
      LIMIT 1;

      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'cart_item_id', v_cart_item.id,
        'reservation_id', v_reservation.id,
        'inventory_item_id', v_listing.inventory_item_id,
        'price_cents', v_listing.listed_price_cents,
        'expires_at', v_reservation.expires_at
      );
    END IF;

    RETURN jsonb_build_object('ok', false, 'code', 'inventory_not_sellable');
  END IF;

  SELECT * INTO v_reservation
  FROM rehaul_inventory_reservations
  WHERE inventory_item_id = v_listing.inventory_item_id
    AND cart_id = p_cart_id
    AND released_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_cart_item
    FROM rehaul_cart_items
    WHERE cart_id = p_cart_id AND listing_id = p_listing_id
    LIMIT 1;

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'cart_item_id', v_cart_item.id,
      'reservation_id', v_reservation.id,
      'inventory_item_id', v_listing.inventory_item_id,
      'price_cents', v_listing.listed_price_cents,
      'expires_at', v_reservation.expires_at
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM rehaul_inventory_reservations
    WHERE inventory_item_id = v_listing.inventory_item_id
      AND released_at IS NULL
      AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_reserved');
  END IF;

  INSERT INTO rehaul_cart_items (cart_id, listing_id, quantity, price_cents)
  VALUES (p_cart_id, p_listing_id, 1, v_listing.listed_price_cents)
  ON CONFLICT (cart_id, listing_id) DO UPDATE
    SET price_cents = EXCLUDED.price_cents,
        quantity = 1
  RETURNING * INTO v_cart_item;

  INSERT INTO rehaul_inventory_reservations (inventory_item_id, cart_id, expires_at)
  VALUES (v_listing.inventory_item_id, p_cart_id, now() + interval '30 minutes')
  RETURNING * INTO v_reservation;

  UPDATE inventory_items
  SET status = 'reserved'
  WHERE id = v_listing.inventory_item_id;

  INSERT INTO audit_events (entity_type, entity_id, event_type, actor_type, actor_id, source, before_state, after_state, reason, metadata)
  VALUES (
    'inventory_item',
    v_listing.inventory_item_id,
    'rehaul.inventory.reserved',
    CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'employee' END,
    p_actor_id,
    'rehaul_reserve_listing_in_cart',
    jsonb_build_object('status', v_inventory.status),
    jsonb_build_object('status', 'reserved', 'cart_id', p_cart_id, 'listing_id', p_listing_id),
    'cart reservation',
    jsonb_build_object('reservation_id', v_reservation.id, 'price_cents', v_listing.listed_price_cents)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'cart_item_id', v_cart_item.id,
    'reservation_id', v_reservation.id,
    'inventory_item_id', v_listing.inventory_item_id,
    'price_cents', v_listing.listed_price_cents,
    'expires_at', v_reservation.expires_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_reserved');
END;
$$;

CREATE OR REPLACE FUNCTION rehaul_create_order_from_cart(
  p_cart_id UUID,
  p_delivery_address JSONB,
  p_delivery_fee_cents INTEGER,
  p_tax_cents INTEGER,
  p_tax_rate NUMERIC,
  p_tax_config_version_id UUID,
  p_tax_evidence_snapshot JSONB,
  p_final_sale_version TEXT,
  p_actor_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart rehaul_carts%ROWTYPE;
  v_order rehaul_orders%ROWTYPE;
  v_subtotal INTEGER;
  v_total INTEGER;
  v_item RECORD;
BEGIN
  IF p_delivery_fee_cents IS NULL OR p_delivery_fee_cents < 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'delivery_review_required');
  END IF;

  SELECT * INTO v_cart
  FROM rehaul_carts
  WHERE id = p_cart_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cart_not_active');
  END IF;

  SELECT COALESCE(SUM(price_cents * quantity), 0)::INTEGER INTO v_subtotal
  FROM rehaul_cart_items
  WHERE cart_id = p_cart_id;

  IF v_subtotal <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cart_empty');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM rehaul_cart_items ci
    JOIN rehaul_listings l ON l.id = ci.listing_id
    JOIN inventory_items ii ON ii.id = l.inventory_item_id
    WHERE ci.cart_id = p_cart_id
      AND (
        l.status <> 'published'
        OR ii.status <> 'reserved'
        OR NOT EXISTS (
          SELECT 1
          FROM rehaul_inventory_reservations r
          WHERE r.inventory_item_id = ii.id
            AND r.cart_id = p_cart_id
            AND r.released_at IS NULL
            AND r.expires_at > now()
        )
      )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cart_inventory_invalid');
  END IF;

  v_total := v_subtotal + COALESCE(p_delivery_fee_cents, 0) + COALESCE(p_tax_cents, 0);

  INSERT INTO rehaul_orders (
    tenant_id, customer_id, cart_id, status, subtotal_cents, delivery_fee_cents,
    tax_cents, tax_rate, total_cents, final_sale_accepted, final_sale_version,
    final_sale_accepted_at, delivery_address, delivery_pricing_status,
    tax_config_version_id, tax_evidence_snapshot
  )
  VALUES (
    v_cart.tenant_id, v_cart.customer_id, p_cart_id, 'pending_payment', v_subtotal,
    p_delivery_fee_cents, COALESCE(p_tax_cents, 0), COALESCE(p_tax_rate, 0), v_total,
    true, p_final_sale_version, now(), p_delivery_address, 'priced',
    p_tax_config_version_id, COALESCE(p_tax_evidence_snapshot, '{}'::jsonb)
  )
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT ci.*, l.inventory_item_id
    FROM rehaul_cart_items ci
    JOIN rehaul_listings l ON l.id = ci.listing_id
    WHERE ci.cart_id = p_cart_id
  LOOP
    INSERT INTO rehaul_order_items (
      order_id, listing_id, inventory_item_id, price_cents, quantity,
      line_type, taxable, tax_rate, tax_cents, tax_evidence_snapshot
    )
    VALUES (
      v_order.id, v_item.listing_id, v_item.inventory_item_id, v_item.price_cents, v_item.quantity,
      'merchandise', true, COALESCE(p_tax_rate, 0), 0, COALESCE(p_tax_evidence_snapshot, '{}'::jsonb)
    );

    UPDATE rehaul_inventory_reservations
    SET order_id = v_order.id,
        cart_id = NULL,
        expires_at = now() + interval '24 hours'
    WHERE inventory_item_id = v_item.inventory_item_id
      AND cart_id = p_cart_id
      AND released_at IS NULL;
  END LOOP;

  UPDATE rehaul_carts
  SET status = 'converted', updated_at = now()
  WHERE id = p_cart_id;

  INSERT INTO audit_events (entity_type, entity_id, event_type, actor_type, actor_id, source, before_state, after_state, reason, metadata)
  VALUES (
    'rehaul_order',
    v_order.id,
    'rehaul.order.created',
    CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'employee' END,
    p_actor_id,
    'rehaul_create_order_from_cart',
    jsonb_build_object('cart_id', p_cart_id, 'status', 'active'),
    jsonb_build_object('order_id', v_order.id, 'status', 'pending_payment', 'total_cents', v_total),
    'checkout',
    jsonb_build_object('subtotal_cents', v_subtotal, 'delivery_fee_cents', p_delivery_fee_cents, 'tax_cents', COALESCE(p_tax_cents, 0))
  );

  RETURN jsonb_build_object('ok', true, 'order_id', v_order.id, 'total_cents', v_total);
END;
$$;
