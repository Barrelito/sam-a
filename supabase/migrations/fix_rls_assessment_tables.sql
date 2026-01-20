-- =============================================
-- COMPREHENSIVE FIX: RLS for ALL Salary Review Child Tables
-- Fixes particularly_skilled_assessments AND salary_criteria_assessments
-- =============================================

-- =============================================
-- 1. FIX particularly_skilled_assessments
-- =============================================

DROP POLICY IF EXISTS "Users can view assessments for their reviews" ON public.particularly_skilled_assessments;
DROP POLICY IF EXISTS "Station managers can manage assessments" ON public.particularly_skilled_assessments;

-- Allow reading if user has access to parent review
CREATE POLICY "Users can view particularly skilled assessments"
  ON public.particularly_skilled_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = particularly_skilled_assessments.salary_review_id
      AND (
        -- Owner
        sr.manager_id = auth.uid()
        -- Admin/VO Chief
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        -- Station Manager for this employee's station
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  );

-- Allow writing if user has access to parent review  
CREATE POLICY "Users can manage particularly skilled assessments"
  ON public.particularly_skilled_assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = particularly_skilled_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = particularly_skilled_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  );

-- =============================================
-- 2. FIX salary_criteria_assessments
-- =============================================

DROP POLICY IF EXISTS "Users can view criteria assessments for their reviews" ON public.salary_criteria_assessments;
DROP POLICY IF EXISTS "Station managers can manage criteria assessments" ON public.salary_criteria_assessments;

-- Allow reading if user has access to parent review
CREATE POLICY "Users can view criteria assessments"
  ON public.salary_criteria_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_criteria_assessments.salary_review_id
      AND (
        -- Owner
        sr.manager_id = auth.uid()
        -- Admin/VO Chief
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        -- Station Manager for this employee's station
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  );

-- Allow writing if user has access to parent review
CREATE POLICY "Users can manage criteria assessments"
  ON public.salary_criteria_assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_criteria_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_criteria_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
      )
    )
  );

-- =============================================
-- DONE! All child tables now allow station managers
-- =============================================
