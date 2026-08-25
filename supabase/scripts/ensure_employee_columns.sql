-- =============================================
-- Kontroll: alla kolumner som appen förväntar sig på public.employees
-- =============================================
-- Kör den här om ett sparningsförsök säger "Databasen saknar kolumnerna ...".
-- Skriptet är idempotent - befintliga kolumner lämnas orörda, så det går bra
-- att köra när som helst och hur många gånger som helst.
--
-- Kolumnerna kommer ursprungligen från följande migrationer:
--   add_experience_level.sql
--   add_employee_birthdate.sql
--   20260227165500_add_forecast_fields_to_employees.sql
--   20260825120000_add_employee_phone.sql
--   20260825130000_add_employee_address.sql

-- Personalprognos
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employment_rate DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS night_share DECIMAL(5,2) DEFAULT 0.0;

-- Erfarenhet (härleds från employment_date när det finns)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS experience_level TEXT
CHECK (experience_level IN ('0-3', '3-5', '5-10', '10+'));

-- Födelsedatum (veckobrev, personakt)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS birthdate DATE DEFAULT NULL;

-- Kontaktuppgifter (personakt, personallista)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- Visa resultatet så du ser att allt finns på plats
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
  AND column_name IN (
      'employment_rate', 'night_share', 'experience_level',
      'birthdate', 'phone', 'address'
  )
ORDER BY column_name;
