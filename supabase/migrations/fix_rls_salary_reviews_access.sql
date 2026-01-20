-- Fix RLS for salary_reviews (Parent Table)
-- Issue: Station managers cannot save child records (prep/criteria) because they cannot "see" the parent review record if they are not the manager_id.

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.salary_reviews;
DROP POLICY IF EXISTS "Station managers can create reviews" ON public.salary_reviews;
DROP POLICY IF EXISTS "Station managers can update their reviews" ON public.salary_reviews;
DROP POLICY IF EXISTS "Station managers can delete their reviews" ON public.salary_reviews;

-- Create comprehensive policy for reading (SELECT)
CREATE POLICY "Users can view reviews based on permissions"
  ON public.salary_reviews FOR SELECT TO authenticated
  USING (
    -- 1. Direct owner (manager_id)
    manager_id = auth.uid()
    OR 
    -- 2. Admin or VO Chief (Direct Role Check)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
    OR
    -- 3. Station Manager / Assistant for the employee's station
    EXISTS (
       SELECT 1 FROM public.employees e
       JOIN public.user_stations us ON us.station_id = e.station_id
       JOIN public.profiles p ON p.id = us.user_id
       WHERE e.id = salary_reviews.employee_id
       AND us.user_id = auth.uid()
       AND p.role IN ('station_manager', 'assistant_manager')
    )
    OR
    -- 4. VO Chief via VO hierarchy (Redundant with #2 technically, but good for completeness if role check fails)
    EXISTS (
       SELECT 1 FROM public.employees e
       JOIN public.stations s ON s.id = e.station_id
       JOIN public.profiles p ON p.vo_id = s.vo_id
       WHERE e.id = salary_reviews.employee_id
       AND p.id = auth.uid()
       AND p.role = 'vo_chief'
    )
  );

-- Create comprehensive policy for modifications (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage reviews based on permissions"
  ON public.salary_reviews FOR ALL TO authenticated
  USING (
    -- 1. Direct owner (manager_id)
    manager_id = auth.uid()
    OR 
    -- 2. Admin (VO Chief is typically Read-Only but allowed here for flexibility)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
    OR
    -- 3. Station Manager / Assistant for the employee's station
    EXISTS (
       SELECT 1 FROM public.employees e
       JOIN public.user_stations us ON us.station_id = e.station_id
       JOIN public.profiles p ON p.id = us.user_id
       WHERE e.id = salary_reviews.employee_id
       AND us.user_id = auth.uid()
       AND p.role IN ('station_manager', 'assistant_manager')
    )
  )
  WITH CHECK (
    -- Same logic for INSERT/UPDATE
    manager_id = auth.uid()
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
    OR
    EXISTS (
       SELECT 1 FROM public.employees e
       JOIN public.user_stations us ON us.station_id = e.station_id
       JOIN public.profiles p ON p.id = us.user_id
       WHERE e.id = salary_reviews.employee_id
       AND us.user_id = auth.uid()
       AND p.role IN ('station_manager', 'assistant_manager')
    )
  );
