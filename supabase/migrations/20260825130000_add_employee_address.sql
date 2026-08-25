-- =============================================
-- Add Address Field to Employees
-- =============================================
-- Används i personakten och som valbar kolumn vid PDF-export av personallistan.

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

COMMENT ON COLUMN public.employees.address IS 'Bostadsadress till medarbetaren (valfri, visas i personakten och kan tas med i personallistan)';
