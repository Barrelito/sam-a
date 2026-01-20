-- =============================================
-- SUPER FIX V2: ONE SCRIPT TO FIX THEM ALL
-- =============================================
-- Problem: 
-- 1. `user_stations` table is empty for station managers (migration issue).
-- 2. Previous RLS scripts conflicted (some used user_stations, some used VO match).
-- 3. We need a consistent, permissive policy based on VO matching for ALL tables.
--
-- This script fixes RLS for:
-- 1. public.employees
-- 2. public.salary_reviews
-- 3. public.salary_meeting_preparations
-- 4. public.particularly_skilled_assessments
-- 5. public.salary_criteria_assessments
-- =============================================

-- =============================================
-- 1. EMPLOYEES
-- =============================================
DROP POLICY IF EXISTS "Station managers can view their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can update their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can delete their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can create employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees permissive" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees permissive" ON public.employees;
DROP POLICY IF EXISTS "Users can create employees permissive" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees permissive" ON public.employees;

CREATE POLICY "Users can view employees permissive"
  ON public.employees FOR SELECT TO authenticated
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

CREATE POLICY "Users can manage employees permissive"
  ON public.employees FOR ALL TO authenticated
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

-- =============================================
-- 2. SALARY_REVIEWS
-- =============================================
DROP POLICY IF EXISTS "Users can view reviews based on permissions" ON public.salary_reviews;
DROP POLICY IF EXISTS "Users can manage reviews based on permissions" ON public.salary_reviews;
DROP POLICY IF EXISTS "Users can manage reviews permissive" ON public.salary_reviews;

CREATE POLICY "Users can manage reviews permissive"
  ON public.salary_reviews FOR ALL TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.role IN ('admin', 'vo_chief')
    )
    OR EXISTS (
       -- Allow if user is station_manager in same VO as the employee's station
       -- NOTE: We must look up the employee -> station -> vo
       SELECT 1 FROM public.employees e
       JOIN public.stations s ON s.id = e.station_id
       JOIN public.profiles p_user ON p_user.id = auth.uid()
       WHERE e.id = salary_reviews.employee_id
       AND p_user.role IN ('station_manager', 'assistant_manager')
       AND p_user.vo_id = s.vo_id
    )
  );

-- =============================================
-- 3. MEETING PREPARATIONS
-- =============================================
DROP POLICY IF EXISTS "Users can view meeting preparations" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Users can manage meeting preparations" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Users can view meeting preparations for their reviews" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Station managers can manage meeting preparations" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Users can manage meeting preparations permissive" ON public.salary_meeting_preparations;

CREATE POLICY "Users can manage meeting preparations permissive"
  ON public.salary_meeting_preparations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      JOIN public.stations s ON s.id = e.station_id
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE sr.id = salary_meeting_preparations.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR p_user.role IN ('admin', 'vo_chief')
        OR (
          p_user.role IN ('station_manager', 'assistant_manager')
          AND p_user.vo_id = s.vo_id
        )
      )
    )
  );

-- =============================================
-- 4. PARTICULARLY SKILLED ASSESSMENTS
-- =============================================
DROP POLICY IF EXISTS "Users can view particularly skilled assessments" ON public.particularly_skilled_assessments;
DROP POLICY IF EXISTS "Users can manage particularly skilled assessments" ON public.particularly_skilled_assessments;
DROP POLICY IF EXISTS "Users can view assessments for their reviews" ON public.particularly_skilled_assessments;
DROP POLICY IF EXISTS "Station managers can manage assessments" ON public.particularly_skilled_assessments;
DROP POLICY IF EXISTS "Users can manage particularly skilled permissive" ON public.particularly_skilled_assessments;

CREATE POLICY "Users can manage particularly skilled permissive"
  ON public.particularly_skilled_assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      JOIN public.stations s ON s.id = e.station_id
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE sr.id = particularly_skilled_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR p_user.role IN ('admin', 'vo_chief')
        OR (
          p_user.role IN ('station_manager', 'assistant_manager')
          AND p_user.vo_id = s.vo_id
        )
      )
    )
  );

-- =============================================
-- 5. CRITERIA ASSESSMENTS
-- =============================================
DROP POLICY IF EXISTS "Users can view criteria assessments" ON public.salary_criteria_assessments;
DROP POLICY IF EXISTS "Users can manage criteria assessments" ON public.salary_criteria_assessments;
DROP POLICY IF EXISTS "Users can view criteria assessments for their reviews" ON public.salary_criteria_assessments;
DROP POLICY IF EXISTS "Station managers can manage criteria assessments" ON public.salary_criteria_assessments;
DROP POLICY IF EXISTS "Users can manage criteria assessments permissive" ON public.salary_criteria_assessments;

CREATE POLICY "Users can manage criteria assessments permissive"
  ON public.salary_criteria_assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      JOIN public.stations s ON s.id = e.station_id
      JOIN public.profiles p_user ON p_user.id = auth.uid()
      WHERE sr.id = salary_criteria_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR p_user.role IN ('admin', 'vo_chief')
        OR (
          p_user.role IN ('station_manager', 'assistant_manager')
          AND p_user.vo_id = s.vo_id
        )
      )
    )
  );

-- =============================================
-- DONE! ONE SCRIPT TO RULE THEM ALL.
-- =============================================
