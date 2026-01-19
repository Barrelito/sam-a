-- Complete fix: Remove ALL circular dependencies in RLS policies
-- for both employees AND employee_managers tables

-- ============================================
-- STEP 1: Fix employee_managers policies
-- ============================================
DROP POLICY IF EXISTS "Users can view employee managers" ON public.employee_managers;
DROP POLICY IF EXISTS "Managers can add employee managers" ON public.employee_managers;
DROP POLICY IF EXISTS "Managers can update employee manager roles" ON public.employee_managers;
DROP POLICY IF EXISTS "Managers can remove employee managers" ON public.employee_managers;

-- Simple SELECT policy - just check if user is a manager in this table
CREATE POLICY "Select employee managers"
  ON public.employee_managers FOR SELECT TO authenticated 
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- INSERT policy
CREATE POLICY "Insert employee managers"
  ON public.employee_managers FOR INSERT TO authenticated 
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- UPDATE policy
CREATE POLICY "Update employee managers"
  ON public.employee_managers FOR UPDATE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- DELETE policy
CREATE POLICY "Delete employee managers"
  ON public.employee_managers FOR DELETE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- ============================================
-- STEP 2: Fix employees policies
-- ============================================
DROP POLICY IF EXISTS "Managers can view their employees via junction" ON public.employees;
DROP POLICY IF EXISTS "Managers can create employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update their employees via junction" ON public.employees;
DROP POLICY IF EXISTS "Managers can delete their employees via junction" ON public.employees;

-- SELECT: Use station access instead of employee_managers to avoid recursion
CREATE POLICY "View employees by station"
  ON public.employees FOR SELECT TO authenticated 
  USING (
    -- User has access to this station
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
    OR
    -- User is admin or VO chief
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- INSERT
CREATE POLICY "Create employees"
  ON public.employees FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
  );

-- UPDATE
CREATE POLICY "Update employees"
  ON public.employees FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- DELETE
CREATE POLICY "Delete employees"
  ON public.employees FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Done! Policies now use user_stations instead of employee_managers
-- to determine access, avoiding infinite recursion.
