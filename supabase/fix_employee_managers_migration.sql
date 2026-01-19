-- Fix: Migrate existing employees to employee_managers table
-- This will make your existing employees visible again in the app

-- Migrera befintliga manager-relationer till employee_managers
INSERT INTO public.employee_managers (employee_id, manager_id, role)
SELECT id, manager_id, 'primary'
FROM public.employees
WHERE manager_id IS NOT NULL
ON CONFLICT (employee_id, manager_id) DO NOTHING;

-- Verifiera resultatet
SELECT 
    COUNT(*) as total_employee_manager_relations,
    COUNT(DISTINCT employee_id) as employees_with_managers
FROM public.employee_managers;
