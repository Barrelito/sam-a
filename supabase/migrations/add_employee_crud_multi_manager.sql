-- =============================================
-- Migration: Employee CRUD + Multi-Manager Support
-- Description: Adds employee_managers junction table to support multiple managers per employee
--              Updates RLS policies to work with the new junction table
-- =============================================

-- =============================================
-- 1. CREATE EMPLOYEE_MANAGERS JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.employee_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, manager_id)
);

-- Enable RLS
ALTER TABLE public.employee_managers ENABLE ROW LEVEL SECURITY;

-- Index för performance
CREATE INDEX IF NOT EXISTS idx_employee_managers_employee_id ON public.employee_managers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_managers_manager_id ON public.employee_managers(manager_id);

-- =============================================
-- 2. MIGRATE EXISTING DATA
-- =============================================
-- Copy existing manager_id relationships to the junction table
INSERT INTO public.employee_managers (employee_id, manager_id, role)
SELECT id, manager_id, 'primary'
FROM public.employees
WHERE manager_id IS NOT NULL
ON CONFLICT (employee_id, manager_id) DO NOTHING;

-- =============================================
-- 3. UPDATE RLS POLICIES FOR EMPLOYEES
-- =============================================

-- Drop old policies that rely on manager_id column
DROP POLICY IF EXISTS "Station managers can view their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can create employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can update their employees" ON public.employees;
DROP POLICY IF EXISTS "Station managers can delete their employees" ON public.employees;

-- Create new policies that check the junction table

-- SELECT: Managers can view employees they manage (via junction table)
CREATE POLICY "Managers can view their employees via junction"
  ON public.employees FOR SELECT TO authenticated 
  USING (
    -- Manager is in the employee_managers table for this employee
    EXISTS (
      SELECT 1 FROM public.employee_managers
      WHERE employee_id = employees.id
      AND manager_id = auth.uid()
    )
    OR
    -- VO chiefs can view all employees in their VO
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.stations s ON s.vo_id = p.vo_id
      WHERE p.id = auth.uid()
      AND p.role = 'vo_chief'
      AND s.id = employees.station_id
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Managers can create employees (will add themselves to junction table separately)
CREATE POLICY "Managers can create employees"
  ON public.employees FOR INSERT TO authenticated 
  WITH CHECK (
    -- User must have access to the station
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
  );

-- UPDATE: Managers can update employees they manage
CREATE POLICY "Managers can update their employees via junction"
  ON public.employees FOR UPDATE TO authenticated 
  USING (
    -- Manager is in the employee_managers table for this employee
    EXISTS (
      SELECT 1 FROM public.employee_managers
      WHERE employee_id = employees.id
      AND manager_id = auth.uid()
    )
    OR
    -- VO chiefs and admins can update
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- DELETE: Managers can delete employees they manage
CREATE POLICY "Managers can delete their employees via junction"
  ON public.employees FOR DELETE TO authenticated 
  USING (
    -- Manager is in the employee_managers table for this employee
    EXISTS (
      SELECT 1 FROM public.employee_managers
      WHERE employee_id = employees.id
      AND manager_id = auth.uid()
    )
    OR
    -- Admins can delete
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 4. RLS POLICIES FOR EMPLOYEE_MANAGERS
-- =============================================

-- SELECT: Users can view manager relationships for employees they can see
CREATE POLICY "Users can view employee managers"
  ON public.employee_managers FOR SELECT TO authenticated 
  USING (
    -- User is one of the managers
    manager_id = auth.uid()
    OR
    -- User can view the employee (via employees RLS)
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_managers.employee_id
      -- This will use the employees RLS policy
    )
  );

-- INSERT: Managers can add manager relationships for their employees
CREATE POLICY "Managers can add employee managers"
  ON public.employee_managers FOR INSERT TO authenticated 
  WITH CHECK (
    -- User is one of the managers OR user can manage the employee
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.employee_managers em
      WHERE em.employee_id = employee_managers.employee_id
      AND em.manager_id = auth.uid()
    )
    OR
    -- Admins can add
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Managers can update roles
CREATE POLICY "Managers can update employee manager roles"
  ON public.employee_managers FOR UPDATE TO authenticated 
  USING (
    -- User is one of the managers for this employee
    EXISTS (
      SELECT 1 FROM public.employee_managers em
      WHERE em.employee_id = employee_managers.employee_id
      AND em.manager_id = auth.uid()
    )
    OR
    -- Admins can update
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Managers can remove manager relationships
CREATE POLICY "Managers can remove employee managers"
  ON public.employee_managers FOR DELETE TO authenticated 
  USING (
    -- User is one of the managers for this employee
    EXISTS (
      SELECT 1 FROM public.employee_managers em
      WHERE em.employee_id = employee_managers.employee_id
      AND em.manager_id = auth.uid()
    )
    OR
    -- Admins can delete
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 5. UPDATE SALARY_REVIEWS RLS (if needed)
-- =============================================
-- The salary_reviews policies currently check manager_id directly
-- We'll keep those as-is since salary_reviews.manager_id represents
-- who is conducting the review (single person), not all managers of the employee

-- =============================================
-- DONE! Multi-Manager Support Ready
-- =============================================
