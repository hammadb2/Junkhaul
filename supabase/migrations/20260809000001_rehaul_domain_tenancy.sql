-- ============================================================
-- Junkhaul Calgary — Rehaul domain, tenancy, permissions, and design system
-- Date: 2026-08-09
--
-- Establishes rehaul.junkhaul.ca as a distinct tenant with role-based
-- permissions, shared identity, and isolated storefront metadata.
-- ============================================================

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,                 -- 'rehaul', 'junkhaul'
  name TEXT NOT NULL,
  host_pattern TEXT NOT NULL,                -- 'rehaul.junkhaul.ca'
  canonical_domain TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  support_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the Rehaul tenant.
INSERT INTO tenants (slug, name, host_pattern, canonical_domain, brand_name, support_email, metadata)
VALUES (
  'rehaul',
  'Rehaul by Junk Haul Calgary',
  'rehaul.junkhaul.ca',
  'https://rehaul.junkhaul.ca',
  'Rehaul',
  'rehaul@junkhaul.ca',
  '{"theme":"circular-commerce","accent":"#5A6B5C","neutral":"#F5F4F0","type":"editorial"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (slug, name, host_pattern, canonical_domain, brand_name, support_email, metadata)
VALUES (
  'junkhaul',
  'Junk Haul Calgary',
  'www.junkhaul.ca',
  'https://www.junkhaul.ca',
  'Junk Haul Calgary',
  'info@junkhaul.ca',
  '{"theme":"service","accent":"#EF4444","neutral":"#F9FAFB","type":"service"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Rehaul roles and permissions
CREATE TABLE IF NOT EXISTS rehaul_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS rehaul_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS rehaul_role_permissions (
  role_id UUID NOT NULL REFERENCES rehaul_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rehaul_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS rehaul_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rehaul_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role_id)
);

-- 3. Rehaul customers (distinct from JunkHaul bookings; can link to auth.users)
CREATE TABLE IF NOT EXISTS rehaul_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address JSONB,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehaul_customers_tenant ON rehaul_customers(tenant_id, email);

-- Seed roles/permissions for Rehaul.
INSERT INTO rehaul_permissions (permission, description) VALUES
  ('rehaul:admin', 'Full Rehaul tenant administration'),
  ('rehaul:intake', 'Manage donor intake and inspections'),
  ('rehaul:photographer', 'Capture and manage product media'),
  ('rehaul:warehouse', 'Manage inventory, locations and movements'),
  ('rehaul:pricing', 'Set prices and margins'),
  ('rehaul:customer_service', 'View orders and handle customer requests'),
  ('rehaul:dispatcher', 'Schedule clean routes and deliveries'),
  ('rehaul:finance', 'View costs, payroll and profitability'),
  ('rehaul:owner', 'Tenant owner access')
ON CONFLICT (permission) DO NOTHING;

DO $$
DECLARE
  rehaul_id UUID;
BEGIN
  SELECT id INTO rehaul_id FROM tenants WHERE slug = 'rehaul' LIMIT 1;
  IF rehaul_id IS NOT NULL THEN
    INSERT INTO rehaul_roles (tenant_id, name, description) VALUES
      (rehaul_id, 'owner', 'Tenant owner'),
      (rehaul_id, 'intake', 'Donation intake'),
      (rehaul_id, 'inspector', 'Quality inspection'),
      (rehaul_id, 'photographer', 'Product photography'),
      (rehaul_id, 'warehouse', 'Warehouse operator'),
      (rehaul_id, 'pricing', 'Pricing manager'),
      (rehaul_id, 'customer_service', 'Customer service'),
      (rehaul_id, 'dispatcher', 'Dispatcher')
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END IF;
END $$;

-- 4. RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehaul_customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'service_role_all_tenants') THEN
    CREATE POLICY service_role_all_tenants ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_roles' AND policyname = 'service_role_all_rehaul_roles') THEN
    CREATE POLICY service_role_all_rehaul_roles ON rehaul_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_permissions' AND policyname = 'service_role_all_rehaul_permissions') THEN
    CREATE POLICY service_role_all_rehaul_permissions ON rehaul_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_role_permissions' AND policyname = 'service_role_all_rehaul_role_permissions') THEN
    CREATE POLICY service_role_all_rehaul_role_permissions ON rehaul_role_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_user_roles' AND policyname = 'service_role_all_rehaul_user_roles') THEN
    CREATE POLICY service_role_all_rehaul_user_roles ON rehaul_user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rehaul_customers' AND policyname = 'service_role_all_rehaul_customers') THEN
    CREATE POLICY service_role_all_rehaul_customers ON rehaul_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
