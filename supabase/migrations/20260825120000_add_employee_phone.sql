-- =============================================
-- Add Phone Field to Employees
-- =============================================
-- Personakten (/employees/[id]) visade tidigare ett telefonfält som saknade
-- motsvarande kolumn i databasen och därför alltid var tomt.

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

COMMENT ON COLUMN public.employees.phone IS 'Kontakttelefon till medarbetaren (visas i personakten)';
