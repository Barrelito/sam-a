-- =============================================
-- Add Birthdate Field to Employees
-- =============================================
-- Enables AI to suggest birthday mentions in newsletters

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS birthdate DATE DEFAULT NULL;

-- Create index for efficient birthday queries
CREATE INDEX IF NOT EXISTS idx_employees_birthdate 
    ON public.employees(birthdate) 
    WHERE birthdate IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.birthdate IS 'Employee birth date for birthday tracking and newsletter mentions';
