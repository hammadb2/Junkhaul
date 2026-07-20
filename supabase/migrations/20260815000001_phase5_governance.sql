-- ============================================================
-- Junkhaul Calgary — Phase 5 governance: audit, security, retention, alerts, launch gates
-- Date: 2026-08-15
-- ============================================================

-- Audit events for every security/permission/price/route/payroll/inventory/refund action
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'employee',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON audit_events(correlation_id);

-- Security events for login, permission denial, upload, webhook, etc.
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);

-- Data retention policies per tenant/entity type
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'delete' CHECK (action IN ('delete','anonymize','archive')),
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retention_policies_tenant_entity ON retention_policies(tenant_id, entity_type);

-- Business and operational alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'under_margin','override','overweight','contamination','missing_actuals','negative_contribution',
    'inventory_discrepancy','stale_quarantine','failed_delivery','ai_drift','webhook_failure','permission_denial'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(tenant_id, severity, acknowledged_at, created_at DESC);

-- Launch gates checklist
CREATE TABLE IF NOT EXISTS launch_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gate TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  evidence TEXT,
  signed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, gate)
);

CREATE INDEX IF NOT EXISTS idx_launch_gates_tenant ON launch_gates(tenant_id, passed);

-- RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_gates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'service_role_all_audit_events') THEN
    CREATE POLICY service_role_all_audit_events ON audit_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_events' AND policyname = 'service_role_all_security_events') THEN
    CREATE POLICY service_role_all_security_events ON security_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'retention_policies' AND policyname = 'service_role_all_retention_policies') THEN
    CREATE POLICY service_role_all_retention_policies ON retention_policies FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'service_role_all_alerts') THEN
    CREATE POLICY service_role_all_alerts ON alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'launch_gates' AND policyname = 'service_role_all_launch_gates') THEN
    CREATE POLICY service_role_all_launch_gates ON launch_gates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
