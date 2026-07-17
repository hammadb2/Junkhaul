-- Fix route RLS policies for custom auth architecture.
--
-- The Flutter crew app uses custom jh_employee_session cookie auth,
-- NOT Supabase Auth. Therefore auth.uid() returns NULL for Flutter
-- app connections, and RLS policies using auth.uid() are non-functional.
--
-- Route updates are now delivered via a backend SSE endpoint
-- (/api/employee/route-stream) that authenticates with the custom
-- session cookie and uses the service role key server-side.
--
-- This migration:
-- 1. Drops the broken employee-facing RLS policies that used auth.uid()
-- 2. Keeps RLS enabled on all three tables
-- 3. Retains only service_role policies (server-side access)
-- 4. This prevents anonymous access while allowing server-side access
--
-- The SSE endpoint uses supabaseAdmin (service role) which bypasses RLS.
-- No client-side Supabase Realtime subscription is used for route_plans.

-- 1. Drop broken employee-facing policies on route_plans.
DROP POLICY IF EXISTS "employee_own_route_plans" ON route_plans;

-- 2. Drop broken employee-facing policies on route_acknowledgements.
DROP POLICY IF EXISTS "employee_own_route_acks" ON route_acknowledgements;
DROP POLICY IF EXISTS "employee_insert_own_route_acks" ON route_acknowledgements;

-- 3. Drop broken employee-facing policy on crew_assignments.
DROP POLICY IF EXISTS "employee_own_crew_assignments" ON crew_assignments;

-- RLS remains enabled on all three tables (from the previous migration).
-- Only service_role policies remain, which is correct:
-- - The backend uses supabaseAdmin (service role) which bypasses RLS
-- - Anonymous/authenticated users without Supabase Auth get no access
-- - Route data is only delivered through the authenticated SSE endpoint
