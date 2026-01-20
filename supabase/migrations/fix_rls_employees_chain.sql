-- =============================================
-- CRITICAL FIX: Employees Table RLS
-- Problem: The 'salary_reviews' policy tries to JOIN with 'employees'.
-- But 'employees' RLS policies prevent Station Managers from seeing employees
-- if they are not the direct 'manager_id'.
-- This causes the salary review check to fail silently.
-- =============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Station managers can view their employees" ON public.employees;
-- Also drop update/delete/insert to be safe and consistent
DROP POLICY IF EXISTS "Station managers can update their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can delete their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can create employees" ON public.employees;

-- 1. SELECT POLICY (Permissive - VO based)
CREATE POLICY "Users can view employees permissive"
  ON public.employees FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
    OR EXISTS (
      -- Allow if user is station_manager/assistant in same VO as the employee's station
      SELECT 1 FROM public.stations s
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE s.id = employees.station_id
      AND p_user.role IN ('station_manager', 'assistant_manager')
      AND p_user.vo_id = s.vo_id
    )
  );

-- 2. UPDATE POLICY
CREATE POLICY "Users can update employees permissive"
  ON public.employees FOR UPDATE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
    OR EXISTS (
      SELECT 1 FROM public.stations s
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE s.id = employees.station_id
      AND p_user.role IN ('station_manager', 'assistant_manager')
      AND p_user.vo_id = s.vo_id
    )
  );

-- 3. INSERT POLICY (Requires knowing station_id from input row)
CREATE POLICY "Users can create employees permissive"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (
       -- Check if user has access to the target station's VO
       SELECT 1 FROM public.stations s
       JOIN public.profiles p_user ON p_user.id = auth.uid()
       WHERE s.id = employees.station_id
       AND p_user.role IN ('station_manager', 'assistant_manager')
       AND p_user.vo_id = s.vo_id
    )
  );

-- 4. DELETE POLICY
CREATE POLICY "Users can delete employees permissive"
  ON public.employees FOR DELETE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND role = 'admin' -- Only admin usually deletes? Or managers too?
    )
    OR EXISTS (
      SELECT 1 FROM public.stations s
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE s.id = employees.station_id
      AND p_user.role IN ('station_manager', 'assistant_manager')
      AND p_user.vo_id = s.vo_id
    )
  );

-- CHECK policies on stations just in case
-- Usually stations are readable by everyone, but let's make sure
DROP POLICY IF EXISTS "Authenticated users can view stations" ON public.stations;
CREATE POLICY "Authenticated users can view stations"
  ON public.stations FOR SELECT TO authenticated USING (true);
