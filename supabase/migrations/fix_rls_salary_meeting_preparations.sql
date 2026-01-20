-- FIX: Drop and recreate BOTH policies for salary_meeting_preparations
-- The previous fix only dropped the write policy, but the SELECT policy was still restrictive!

-- Drop ALL old policies (both original AND any from previous fix attempts)
DROP POLICY IF EXISTS "Users can view meeting preparations for their reviews" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Station managers can manage meeting preparations" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Users can view meeting preparations" ON public.salary_meeting_preparations;
DROP POLICY IF EXISTS "Users can manage meeting preparations" ON public.salary_meeting_preparations;

-- Create new SELECT policy that allows station managers
CREATE POLICY "Users can view meeting preparations"
  ON public.salary_meeting_preparations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_meeting_preparations.salary_review_id
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

-- Create new WRITE policy (INSERT/UPDATE/DELETE)
CREATE POLICY "Users can manage meeting preparations"
  ON public.salary_meeting_preparations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_meeting_preparations.salary_review_id
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
      WHERE sr.id = salary_meeting_preparations.salary_review_id
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

-- VERIFICATION: After running this, test by selecting:
-- SELECT * FROM salary_meeting_preparations WHERE salary_review_id = '0c1ba2b5-740c-40ac-9ff7-5865888056c6';
