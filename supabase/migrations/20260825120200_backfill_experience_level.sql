-- =============================================
-- experience_level härleds från employment_date
-- =============================================
-- Tidigare fanns två oberoende sanningar för samma sak: det manuellt valda
-- experience_level och employment_date. Appen räknar nu alltid ut erfarenheten
-- från anställningsdatum när det finns (se src/lib/employees/experience.ts) och
-- skriver om kolumnen vid varje sparning.
--
-- Den här migrationen synkar befintliga rader så att kolumnen stämmer med
-- anställningsdatumet från början. Rader utan anställningsdatum lämnas orörda -
-- där är det manuella värdet fortfarande enda källan.

UPDATE public.employees
SET experience_level = CASE
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 3 THEN '0-3'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 5 THEN '3-5'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 10 THEN '5-10'
        ELSE '10+'
    END
WHERE employment_date IS NOT NULL
  AND experience_level IS DISTINCT FROM CASE
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 3 THEN '0-3'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 5 THEN '3-5'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) < 10 THEN '5-10'
        ELSE '10+'
    END;

COMMENT ON COLUMN public.employees.experience_level IS
    'Erfarenhetsintervall (0-3, 3-5, 5-10, 10+). Härleds automatiskt från employment_date när det finns; manuellt värde används bara som fallback när anställningsdatum saknas.';

-- Index för listvyns sortering och sökning
CREATE INDEX IF NOT EXISTS idx_employees_station_last_name
    ON public.employees(station_id, last_name, first_name);
