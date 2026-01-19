-- Add experience_level column to employees table
-- Options: '0-3', '3-5', '5-10', '10+'

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS experience_level TEXT 
CHECK (experience_level IN ('0-3', '3-5', '5-10', '10+'));

-- Add comment for clarity
COMMENT ON COLUMN public.employees.experience_level IS 'Years of experience: 0-3, 3-5, 5-10, or 10+';
