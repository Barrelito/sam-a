-- Migration: Lägg till löneökning kolumner i salary_reviews
-- Kör detta i Supabase SQL Editor

ALTER TABLE public.salary_reviews
ADD COLUMN IF NOT EXISTS proposed_increase DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS final_increase DECIMAL(10,2);

COMMENT ON COLUMN public.salary_reviews.proposed_increase IS 'Automatiskt förslag på löneökning baserat på betyg';
COMMENT ON COLUMN public.salary_reviews.final_increase IS 'Slutgiltig löneökning efter manuell justering';
