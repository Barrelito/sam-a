-- Fix RLS for salary_meeting_preparations
-- Allow station managers to write based on station membership, not just manager_id

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Station managers can manage meeting preparations" ON public.salary_meeting_preparations;

-- Create new more permissive policy for station managers
-- Allows writing if:
-- 1. User is the manager_id on the salary_review, OR
-- 2. User is a station_manager or assistant_manager with access to the employee's station, OR
-- 3. User is admin or vo_chief
CREATE POLICY "Station managers can manage meeting preparations"
  ON public.salary_meeting_preparations FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      JOIN public.employees e ON e.id = sr.employee_id
      WHERE sr.id = salary_meeting_preparations.salary_review_id
      AND (
        -- Original owner
        sr.manager_id = auth.uid()
        -- OR station manager/assistant for this station
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
        -- OR admin/vo_chief
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
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
        -- Original owner
        sr.manager_id = auth.uid()
        -- OR station manager/assistant for this station
        OR EXISTS (
          SELECT 1 FROM public.user_stations us
          JOIN public.profiles p ON p.id = us.user_id
          WHERE us.user_id = auth.uid()
          AND us.station_id = e.station_id
          AND p.role IN ('station_manager', 'assistant_manager')
        )
        -- OR admin/vo_chief
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
        )
      )
    )
  );
