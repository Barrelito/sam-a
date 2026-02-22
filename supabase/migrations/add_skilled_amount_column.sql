-- Migration: Lägg till separat kolumn för särskilt yrkesskicklig i salary_reviews
-- Kör detta i Supabase SQL Editor

ALTER TABLE public.salary_reviews
ADD COLUMN IF NOT EXISTS skilled_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.salary_reviews.skilled_amount IS 'Individuellt angivet belopp för medarbetare som bedömts som särskilt yrkesskickliga';
